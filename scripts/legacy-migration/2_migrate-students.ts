/**
 * Data Migration Script: Import students from AA_Student.csv
 * 
 * Usage:
 *   npx tsx scripts/migrate-students.ts --dry-run
 *   npx tsx scripts/migrate-students.ts --dry-run --limit 10
 *   npx tsx scripts/migrate-students.ts
 * 
 * Note: Run migrate-profiles.ts FIRST - students reference profiles via assigned_to
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student.csv');

const unmappedValues: Record<string, Set<string>> = {
  status: new Set(), placement: new Set(), nationality: new Set(),
  course: new Set(), lead_source: new Set(), school_type: new Set(), profile: new Set(),
};

type LookupMap = Map<string, number>;
type ProfileMap = Map<string, string>; // legacy_id -> uuid

const lookupMaps: Record<string, LookupMap> = {
  status: new Map(), placement: new Map(), nationality: new Map(),
  course: new Map(), lead_source: new Map(), school_type: new Map(),
};

let profileMap: ProfileMap = new Map();
let defaultLeadSourceId: number | null = null;
let defaultStatusId: number | null = null;

// Value mappings (CSV value -> code)
const STATUS_CODE_MAP: Record<string, string> = {
  'new': 'new', 'New': 'new', 'NEW': 'new',
  'pending': 'pending', 'Pending': 'pending', 'PENDING': 'pending',
  'active': 'active', 'Active': 'active', 'ACTIVE': 'active',
  'closed': 'closed', 'Closed': 'closed', 'CLOSED': 'closed',
  'dead': 'dead', 'Dead': 'dead', 'DEAD': 'dead',
};

const PLACEMENT_CODE_MAP: Record<string, string> = {
  'Very Hot': 'very_hot', 'very hot': 'very_hot',
  'Hot': 'hot', 'hot': 'hot', 'HOT': 'hot',
  'Warm': 'warm', 'warm': 'warm',
  'Cold': 'cold', 'cold': 'cold', 'COLD': 'cold',
};

const NATIONALITY_CODE_MAP: Record<string, string> = {
  'HKSAR': 'hksar', 'BNO': 'bno', 'BNO+HKSAR': 'bno_hksar', 'MSAR': 'msar',
  'Macau': 'macau', 'Chinese': 'chinese', 'China': 'china',
  'British Citizen': 'british_citizen', 'German': 'german', 'Portuguese': 'portuguese',
  'Italiana': 'italian', 'Belgium': 'belgium', 'Austria': 'austria',
  'Holland/Netherlands': 'dutch', 'EU': 'eu', 'EU-Austria': 'eu_austria',
  'Australian': 'australian', 'New Zealand': 'new_zealand', 'Singapore': 'singaporean',
  'Malaysia': 'malaysian', 'Taiwan': 'taiwanese', 'Thai': 'thai', 'Thailand': 'thai',
  'Japan': 'japanese', 'Korea': 'korean', 'Indian': 'indian', 'Philippines': 'filipino',
  'USA': 'usa', 'Canadian': 'canadian', 'Other': 'other',
};

const COURSE_CODE_MAP: Record<string, string> = {
  'Year 1': 'year_1', 'Year 2': 'year_2', 'Year 3': 'year_3', 'Year 4': 'year_4',
  'Year 5': 'year_5', 'Year 6': 'year_6', 'Year 7': 'year_7', 'Year 8': 'year_8',
  'Year 9': 'year_9', 'Year 10': 'year_10', 'Year 11': 'year_11', 'Year 12': 'year_12',
  'Year 13': 'year_13', 'Nursery': 'nursery', 'Reception': 'reception',
  '1 Year AL': '1_year_al', '1-Year AL': '1_year_al', '1 Year A-level': '1_year_a_level',
  '18 months AL': '18_months_al', '3 Years AL': '3_year_al', '3-Year AL': '3_year_al',
  'Pre-AL': 'pre_al', '1 Year GCSE': '1_year_gcse', '1-Year GCSE': '1_year_gcse',
  '1-Year IGCSE': '1_year_igcse', 'Foundation': 'foundation',
  '1-Year Foundation': '1_year_foundation', 'International Foundation': 'international_foundation',
  'Sixth Form Foundation': 'sixth_form_foundation', 'Foundation Degree': 'foundation_degree',
  'IB': 'ib', 'Pre-IB': 'pre_ib', 'Summer': 'summer', 'University': 'university',
  'BTEC': 'btec', 'English': 'english', 'English Course': 'english_course',
  'Development Year': 'development_year', 'Helix': 'helix',
};

const LEAD_SOURCE_CODE_MAP: Record<string, string> = {
  'Walk-In': 'walk_in', 'Walk In': 'walk_in', 'Walk-In (Friends)': 'walk_in_friends',
  'Referral (School)': 'referral_school', 'Own Referral': 'own_referral',
  'Top Schools 09': 'top_schools_09', 'Top Schools 10': 'top_schools_10',
  'Top School 10': 'top_schools_10', 'Top Schools 10 (V)': 'top_schools_10_v',
  'Top Schools 10 (v)': 'top_schools_10_v', 'Top Schools 11': 'top_schools_11',
  'Top Schools 11 (V)': 'top_schools_11_v', 'Top Schools 11 (v)': 'top_schools_11_v',
  'Top Schools 12': 'top_schools_12', 'Top Schools 13': 'top_schools_13',
  'Top Schools 14': 'top_schools_14', 'Top Schools 15': 'top_schools_15',
  'Top Schools 16': 'top_schools_16', 'May Expo 09': 'may_expo_09',
  'May Expo 11': 'may_expo_11', 'June Expo 12': 'june_expo_12',
  'Oct Expo 09': 'oct_expo_09', 'OCT EXPO 10': 'oct_expo_10', 'Oct Expo 10': 'oct_expo_10',
  'Oct Expo 11': 'oct_expo_11', 'Oct Expo 12': 'oct_expo_12', 'Oct Expo 13': 'oct_expo_13',
  'Feb Expo 13': 'feb_expo_13', 'Concord Event': 'concord_event',
  'Concord Event 19 March': 'concord_event_19_march', 'Direct Mail': 'direct_mail',
  'Email & Courier': 'email_courier', 'Newspaper': 'newspaper', 'Website': 'website',
  'CH- HK Bursary': 'ch_hk_bursary', 'EduWise': 'eduwise', 'Focus': 'focus',
  'HSBC': 'hsbc', 'MTR': 'mtr', 'Other': 'other',
};

const SCHOOL_TYPE_CODE_MAP: Record<string, string> = {
  'HK': 'hk', 'Hong Kong - Local': 'hong_kong_local',
  'Hong Kong - International': 'hong_kong_international',
  'Local (Chinese Medium)': 'local_chinese_medium', 'Local (English Medium)': 'local_english_medium',
  'English+Chinese': 'english_chinese', 'MACAU': 'macau', 'Macau - Local': 'macau_local',
  'Macau - International': 'macau_international', 'Chinese Medium-Macau': 'chinese_medium_macau',
  'English Medium-Macau': 'english_medium_macau', 'CHINA': 'china', 'China - Local': 'china_local',
  'China - International': 'china_international', 'Japan': 'japan', 'Singapore': 'singapore',
  'Malaysia': 'malaysia', 'Thailand': 'thailand', 'Thailand - International': 'thailand_international',
  'Taiwan': 'taiwan', 'India': 'india', 'Philippines': 'philippines', 'UK': 'uk',
  'Paris, France': 'paris_france', 'Portuguese': 'portuguese', 'United States': 'united_states',
  'Canada': 'canada', 'South America': 'south_america', 'Australia': 'australia', 'Others': 'others',
};

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading reference tables...\n');

  const tables = [
    { name: 'student_statuses', key: 'status' },
    { name: 'placement_statuses', key: 'placement' },
    { name: 'lead_sources', key: 'lead_source' },
    { name: 'school_types', key: 'school_type' },
    { name: 'nationalities', key: 'nationality' },
    { name: 'courses', key: 'course' },
  ];

  for (const table of tables) {
    const { data } = await supabase.from(table.name).select('id, code');
    data?.forEach(row => lookupMaps[table.key].set(row.code, row.id));
    console.log(`   ✅ ${table.name}: ${data?.length || 0}`);
  }

  defaultStatusId = lookupMaps.status.get('new') || null;
  defaultLeadSourceId = lookupMaps.lead_source.get('other') || null;

  // Load profile mapping (legacy_id -> uuid)
  console.log('\n📚 Loading profile mapping...');
  const { data: profiles } = await supabase.from('profiles').select('id, legacy_id').not('legacy_id', 'is', null);
  profiles?.forEach(row => { if (row.legacy_id) profileMap.set(row.legacy_id, row.id); });
  console.log(`   ✅ profiles: ${profileMap.size}`);
  console.log('');
}

function cleanString(val: string): string | null {
  if (!val || val.trim() === '') return null;
  return val.trim();
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const trimmed = dateStr.trim();
  if (trimmed === '0000-00-00' || trimmed === '00000000') return null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    if (year === '0000' || month === '00' || day === '00') return null;
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return trimmed;
  }
  
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
    if (year === '0000' || month === '00' || day === '00') return null;
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${year}-${month}-${day}`;
  }
  
  if (trimmed.length === 14 && /^\d{14}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
    const hour = trimmed.substring(8, 10), min = trimmed.substring(10, 12), sec = trimmed.substring(12, 14);
    if (year === '0000' || month === '00' || day === '00') return null;
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }
  
  return null;
}

function parseBoolean(val: string): boolean {
  return val === '1' || val.toLowerCase() === 'true';
}

function lookupId(csvValue: string, codeMap: Record<string, string>, lookupMap: LookupMap, fieldName: string, defaultId: number | null = null): number | null {
  if (!csvValue || csvValue.trim() === '') return null;
  const trimmed = csvValue.trim();
  const code = codeMap[trimmed];
  if (!code) { unmappedValues[fieldName]?.add(trimmed); return defaultId; }
  const id = lookupMap.get(code);
  if (!id) { unmappedValues[fieldName]?.add(trimmed); return defaultId; }
  return id;
}

function lookupProfileId(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const trimmed = legacyId.trim();
  const uuid = profileMap.get(trimmed);
  if (!uuid) { unmappedValues.profile.add(trimmed); return null; }
  return uuid;
}

interface CsvRow {
  aa_id: string; tmp_id: string; surname: string; firstname: string; chinesename: string;
  photo: string; nation: string; passporttype: string; passportcopy: string; passportno: string;
  birthday: string; gender: string; address1: string; address2: string; chi_address: string;
  caddress1: string; caddress2: string; tel: string; mobile: string; fax: string; email: string;
  enrollemntdate: string; course: string; entryyear: string; sixthform: string; source: string;
  status: string; lastupdate: string; staffid: string; remarks: string; loginname: string;
  loginpassword: string; presentschooltype: string; presentschool: string; aanews: string;
  airportpickup: string; exampaper: string; source2: string; source3: string; source4: string;
  source5: string; placementremarks: string; educationremarks: string; placement: string;
}

function transformRow(row: CsvRow) {
  return {
    student_code: cleanString(row.aa_id),
    temp_id: cleanString(row.tmp_id),
    surname: cleanString(row.surname) || 'Unknown',
    first_name: cleanString(row.firstname) || 'Unknown',
    chinese_name: cleanString(row.chinesename),
    gender: row.gender === 'M' || row.gender === 'F' ? row.gender : null,
    date_of_birth: parseDate(row.birthday),
    nationality_id: lookupId(row.nation, NATIONALITY_CODE_MAP, lookupMaps.nationality, 'nationality'),
    passport_type: cleanString(row.passporttype),
    passport_number: cleanString(row.passportno),
    passport_copy_url: cleanString(row.passportcopy),
    photo_url: cleanString(row.photo),
    address_line_1: cleanString(row.address1),
    address_line_2: cleanString(row.address2),
    chinese_address: cleanString(row.chi_address),
    chinese_address_1: cleanString(row.caddress1),
    chinese_address_2: cleanString(row.caddress2),
    telephone: cleanString(row.tel),
    mobile: cleanString(row.mobile),
    fax: cleanString(row.fax),
    email: cleanString(row.email),
    enrollment_date: parseDate(row.enrollemntdate),
    course_id: lookupId(row.course, COURSE_CODE_MAP, lookupMaps.course, 'course'),
    entry_year: cleanString(row.entryyear),
    sixth_form: cleanString(row.sixthform),
    present_school: cleanString(row.presentschool),
    present_school_type_id: lookupId(row.presentschooltype, SCHOOL_TYPE_CODE_MAP, lookupMaps.school_type, 'school_type'),
    lead_source_id: lookupId(row.source, LEAD_SOURCE_CODE_MAP, lookupMaps.lead_source, 'lead_source', defaultLeadSourceId),
    lead_source_2: cleanString(row.source2),
    lead_source_3: cleanString(row.source3),
    lead_source_4: cleanString(row.source4),
    lead_source_5: cleanString(row.source5),
    status_id: lookupId(row.status, STATUS_CODE_MAP, lookupMaps.status, 'status', defaultStatusId),
    placement_id: lookupId(row.placement, PLACEMENT_CODE_MAP, lookupMaps.placement, 'placement'),
    exam_paper: cleanString(row.exampaper),
    remarks: cleanString(row.remarks),
    placement_remarks: cleanString(row.placementremarks),
    education_remarks: cleanString(row.educationremarks),
    aa_news: parseBoolean(row.aanews),
    airport_pickup: parseBoolean(row.airportpickup),
    assigned_to: lookupProfileId(row.staffid),
    login_name: cleanString(row.loginname),
    legacy_last_update: parseDate(row.lastupdate),
  };
}

async function migrate() {
  console.log('🚀 Starting student migration...\n');

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
  const { data, errors } = Papa.parse<CsvRow>(csvContent, { header: true, delimiter: '|', skipEmptyLines: true });
  if (errors.length > 0) console.error('❌ Parse errors:', errors.slice(0, 5));

  console.log(`📊 Found ${data.length} records\n`);

  let students = data.filter(row => row.surname || row.firstname).map(transformRow);
  console.log(`✅ Transformed ${students.length} valid records\n`);

  if (LIMIT && LIMIT > 0) {
    students = students.slice(0, LIMIT);
    console.log(`🔢 Limited to ${students.length} records\n`);
  }

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORDS');
    console.log('═'.repeat(60));
    students.slice(0, 3).forEach((s, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(s, null, 2));
    });

    const stats = {
      total: students.length,
      with_assigned_to: students.filter(s => s.assigned_to).length,
      with_status: students.filter(s => s.status_id).length,
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
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('students').insert(batch).select('id');
    if (error) { console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message); failed += batch.length; }
    else { inserted += result?.length || 0; process.stdout.write(`\r⏳ ${inserted}/${students.length}`); }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}\n`);
}

migrate().catch(console.error);
