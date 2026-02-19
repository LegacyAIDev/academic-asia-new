/**
 * Data Migration Script: Import schools from AA_School.csv
 *
 * Usage:
 *   npx tsx scripts/migrate-schools.ts --dry-run
 *   npx tsx scripts/migrate-schools.ts --dry-run --limit 10
 *   npx tsx scripts/migrate-schools.ts
 *
 * Note: Run migrate-profiles.ts FIRST - schools reference profiles via assigned_to
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_INDEX = args.indexOf('--limit');
const LIMIT = LIMIT_INDEX !== -1 ? parseInt(args[LIMIT_INDEX + 1], 10) : null;

if (DRY_RUN) console.log('🧪 DRY RUN MODE\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const BATCH_SIZE = 100;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School.csv');

const unmappedValues: Record<string, Set<string>> = {
  country: new Set(), gender_type: new Set(), institution_type: new Set(),
  phase: new Set(), religious_affiliation: new Set(), profile: new Set(),
};

type LookupMap = Map<string, number>;
type ProfileMap = Map<string, string>;

const lookupMaps: Record<string, LookupMap> = {
  country: new Map(), gender_type: new Map(), institution_type: new Map(),
  phase: new Map(), religious_affiliation: new Map(),
};

let profileMap: ProfileMap = new Map();

const COUNTRY_CODE_MAP: Record<string, string> = {
  'UK': 'uk', 'United Kingdom': 'united_kingdom', 'England': 'england',
  'Scotland': 'scotland', 'Northern Ireland': 'northern_ireland', 'China': 'china',
  'Hong Kong': 'hong_kong', 'Macau': 'macau', 'Malaysia': 'malaysia',
  'Austria': 'austria', 'Canada': 'canada', 'Portugal': 'portugal',
  'N/A': '', '.': '', 'London': '',
};

const GENDER_TYPE_CODE_MAP: Record<string, string> = {
  'Co-Ed': 'co_ed', 'Boys': 'boys', 'Girls': 'girls',
  'Boys (6G)': 'boys_6g', 'Boys (6G Day only)': 'boys_6g_day', '.': '',
};

const INSTITUTION_TYPE_CODE_MAP: Record<string, string> = {
  'Independent School': 'independent_school', 'Independent School 1': 'independent_school_1',
  'Independent College': 'independent_college', 'Further Education College': 'further_education_college',
  'Sixth Form College - Government': 'sixth_form_college_gov', 'Summer School': 'summer_school',
  'Stabis School': 'stabis_school', 'Stabis School_Comm': 'stabis_school_comm',
  'Stabis': 'stabis', 'Summer': 'summer',
};

const PHASE_CODE_MAP: Record<string, string> = {
  'All': 'all', 'all': 'all', 'Prep': 'prep', 'Prep_S': 'prep_s',
  'Prep School': 'prep', 'Senior': 'senior', 'S': 'senior',
  'Sixth Form': 'sixth_form', 'P': 'prep', 'S/P': 'all',
};

const RELIGIOUS_AFFILIATION_CODE_MAP: Record<string, string> = {
  'Non denominational': 'non_denominational', 'Non-denominational': 'non_denominational',
  'Nondenominational': 'non_denominational', 'Church of England': 'church_of_england',
  'Roman Catholic': 'roman_catholic', 'Roman Catholic/Christian': 'roman_catholic',
  'Christian': 'christian', 'Inter denominational': 'inter_denominational',
  'Inter denominational/Church of England': 'inter_denominational', 'Methodist': 'methodist',
  'All Faiths': 'all_faiths', 'Anglican': 'anglican', 'Quaker': 'quaker',
  'Church in Wales': 'church_in_wales', 'Catholic': 'catholic',
};

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading reference tables...\n');

  const tables = [
    { name: 'countries', key: 'country' },
    { name: 'school_gender_types', key: 'gender_type' },
    { name: 'school_institution_types', key: 'institution_type' },
    { name: 'school_phases', key: 'phase' },
    { name: 'school_religious_affiliations', key: 'religious_affiliation' },
  ];

  for (const table of tables) {
    const { data } = await supabase.from(table.name).select('id, code');
    data?.forEach(row => lookupMaps[table.key].set(row.code, row.id));
    console.log(`   ✅ ${table.name}: ${data?.length || 0}`);
  }

  // Load profile mapping
  console.log('\n📚 Loading profile mapping...');
  const { data: profiles } = await supabase.from('profiles').select('id, legacy_id').not('legacy_id', 'is', null);
  profiles?.forEach(row => { if (row.legacy_id) profileMap.set(row.legacy_id, row.id); });
  console.log(`   ✅ profiles: ${profileMap.size}\n`);
}

function cleanString(val: string): string | null {
  if (!val || val.trim() === '' || val.trim() === '.') return null;
  return val.trim();
}

function parseInt2(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function parseFloat2(val: string): number | null {
  if (!val || val.trim() === '' || val === '0') return null;
  const num = parseFloat(val);
  return isNaN(num) || num === 0 ? null : num;
}

function parseBoolean(val: string): boolean {
  return val === 'Y' || val === 'y' || val === '1';
}

function parseTimestamp(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const trimmed = dateStr.trim();
  if (trimmed.length === 14 && /^\d{14}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
    const hour = trimmed.substring(8, 10), min = trimmed.substring(10, 12), sec = trimmed.substring(12, 14);
    if (year === '0000' || month === '00' || day === '00') return null;
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }
  return null;
}

function lookupId(csvValue: string, codeMap: Record<string, string>, lookupMap: LookupMap, fieldName: string): number | null {
  if (!csvValue || csvValue.trim() === '' || csvValue.trim() === '.') return null;
  const trimmed = csvValue.trim();
  const code = codeMap[trimmed];
  if (code === '') return null;
  if (!code) { unmappedValues[fieldName]?.add(trimmed); return null; }
  const id = lookupMap.get(code);
  if (!id) { unmappedValues[fieldName]?.add(trimmed); return null; }
  return id;
}

function lookupProfileId(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const trimmed = legacyId.trim();
  const uuid = profileMap.get(trimmed);
  if (!uuid) { unmappedValues.profile.add(trimmed); return null; }
  return uuid;
}

function transformRow(row: Record<string, string>) {
  return {
    legacy_id: parseInt2(row['school_id']),
    name: cleanString(row['name']) || 'Unknown School',
    address: cleanString(row['address']),
    city: cleanString(row['city']),
    county: cleanString(row['county']),
    postcode: cleanString(row['postcode']),
    country_id: lookupId(row['country'], COUNTRY_CODE_MAP, lookupMaps.country, 'country'),
    latitude: parseFloat2(row['lat']),
    longitude: parseFloat2(row['lng']),
    telephone: cleanString(row['tel']),
    fax: cleanString(row['fax']),
    email: cleanString(row['email']),
    website: cleanString(row['website']),
    gender_type_id: lookupId(row['schooltype'], GENDER_TYPE_CODE_MAP, lookupMaps.gender_type, 'gender_type'),
    institution_type_id: lookupId(row['si'], INSTITUTION_TYPE_CODE_MAP, lookupMaps.institution_type, 'institution_type'),
    phase_id: lookupId(row['sp'], PHASE_CODE_MAP, lookupMaps.phase, 'phase'),
    religious_affiliation_id: lookupId(row['ra'], RELIGIOUS_AFFILIATION_CODE_MAP, lookupMaps.religious_affiliation, 'religious_affiliation'),
    pupil_count: parseInt2(row['pupilno']) || 0,
    boarder_count: parseInt2(row['boarderno']) || 0,
    boarder_age_range: cleanString(row['boarderage']),
    child_visa_age: parseInt2(row['childvisaage']),
    accepts_applications: parseBoolean(row['case_1'] || row['case'] || ''),
    accepts_child_visa: parseBoolean(row['case_2'] || ''),
    accepts_general_visa: parseBoolean(row['case_3'] || ''),
    keywords: cleanString(row['keyword']),
    remarks: cleanString(row['remarks']),
    login_name: cleanString(row['loginname']),
    assigned_to: lookupProfileId(row['staffid']),
    legacy_last_update: parseTimestamp(row['lastupdate']),
  };
}

async function migrate() {
  console.log('🏫 Starting school migration...\n');

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔌 Connected to: ${SUPABASE_URL}\n`);
  await loadLookupTables(supabase);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`📂 Reading: ${CSV_PATH}`);
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const { data, errors } = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: '|',
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.error('❌ Parse errors:', errors.slice(0, 5));
  }

  console.log(`📊 Found ${data.length} records\n`);

  let schools = data.filter(row => row['name']).map(transformRow);
  console.log(`✅ Transformed ${schools.length} valid records\n`);

  if (LIMIT && LIMIT > 0) {
    schools = schools.slice(0, LIMIT);
    console.log(`🔢 Limited to ${schools.length} records\n`);
  }

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORDS');
    console.log('═'.repeat(60));
    schools.slice(0, 3).forEach((s, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(s, null, 2));
    });

    const stats = {
      total: schools.length,
      with_assigned_to: schools.filter(s => s.assigned_to).length,
    };
    console.log(`\n📊 Stats: ${stats.with_assigned_to}/${stats.total} with assigned_to`);

    console.log('\n⚠️  Unmapped values:');
    for (const [field, values] of Object.entries(unmappedValues)) {
      if (values.size > 0) console.log(`   ${field}: ${values.size} unique`);
    }

    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('schools').insert(batch).select('id');
    if (error) { console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message); failed += batch.length; }
    else { inserted += result?.length || 0; process.stdout.write(`\r⏳ ${inserted}/${schools.length}`); }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}\n`);
}

migrate().catch(console.error);