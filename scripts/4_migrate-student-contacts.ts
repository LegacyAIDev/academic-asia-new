/**
 * Data Migration Script: Import student contacts from AA_Student_Contact.csv
 * 
 * Usage:
 *   npx tsx scripts/migrate-student-contacts.ts --dry-run
 *   npx tsx scripts/migrate-student-contacts.ts --dry-run --limit 10
 *   npx tsx scripts/migrate-student-contacts.ts
 * 
 * Note: Run migrate-profiles.ts and migrate-students.ts FIRST
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Contact.csv');

const unmappedValues: Record<string, Set<string>> = {
  relationship: new Set(), title: new Set(), student: new Set(), profile: new Set(),
};

type LookupMap = Map<string, number>;
type UuidMap = Map<string, string>;

const lookupMaps: Record<string, LookupMap> = {
  relationship: new Map(), title: new Map(),
};

let studentMap: UuidMap = new Map();
let profileMap: UuidMap = new Map();

const RELATIONSHIP_CODE_MAP: Record<string, string> = {
  'Mother': 'mother', 'Father': 'father', 'Guardian': 'guardian',
  'Brother': 'brother', 'Sister': 'sister', 'Uncle': 'uncle',
  'Auntie': 'auntie', 'Aunt': 'auntie', 'Grandfather': 'grandfather',
  'Grandmother': 'grandmother', 'Cousin': 'cousin', 'Friend': 'friend',
  'Others': 'other', 'Other': 'other', 'Not sure': 'other',
  'Secretary': 'other', 'Secretary of Mother': 'other',
  'Personal Assistant': 'other', 'Assistant': 'other',
};

const TITLE_CODE_MAP: Record<string, string> = {
  'Mr.': 'mr', 'Mr': 'mr', 'Mrs.': 'mrs', 'Mrs': 'mrs',
  'Ms.': 'ms', 'Ms': 'ms', 'Miss': 'miss',
  'Dr.': 'dr', 'Dr': 'dr', 'Prof.': 'prof', 'Prof': 'prof',
  'Professor': 'prof', 'Rev.': 'rev', 'Rev': 'rev',
};

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading reference tables...\n');

  const { data: relationships } = await supabase.from('contact_relationships').select('id, code');
  relationships?.forEach(row => lookupMaps.relationship.set(row.code, row.id));
  console.log(`   ✅ contact_relationships: ${relationships?.length || 0}`);

  const { data: titles } = await supabase.from('contact_titles').select('id, code');
  titles?.forEach(row => lookupMaps.title.set(row.code, row.id));
  console.log(`   ✅ contact_titles: ${titles?.length || 0}`);

  // Load student mapping
  console.log('\n📚 Loading student mapping...');
  const { data: students } = await supabase.from('students').select('id, student_code').not('student_code', 'is', null).limit(1000000);
  students?.forEach(row => { if (row.student_code) studentMap.set(row.student_code, row.id); });
  console.log(`   ✅ students: ${studentMap.size}`);

  // Load profile mapping
  const { data: profiles } = await supabase.from('profiles').select('id, legacy_id').not('legacy_id', 'is', null).limit(100000);
  profiles?.forEach(row => { if (row.legacy_id) profileMap.set(row.legacy_id, row.id); });
  console.log(`   ✅ profiles: ${profileMap.size}\n`);
}

function cleanString(val: string): string | null {
  if (!val || val.trim() === '' || val.trim() === '.') return null;
  return val.trim();
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

function parsePriority(val: string): number | null {
  if (!val || val.trim() === '' || val === 'N') return null;
  const num = parseInt(val, 10);
  if (isNaN(num) || num < 1 || num > 10) return null;
  return num;
}

function parseGender(val: string): string | null {
  const v = val?.trim()?.toUpperCase();
  if (v === 'M' || v === 'F') return v;
  return null;
}

function lookupId(csvValue: string, codeMap: Record<string, string>, lookupMap: LookupMap, fieldName: string): number | null {
  if (!csvValue || csvValue.trim() === '') return null;
  const trimmed = csvValue.trim();
  const code = codeMap[trimmed];
  if (!code) { unmappedValues[fieldName]?.add(trimmed); return null; }
  const id = lookupMap.get(code);
  if (!id) { unmappedValues[fieldName]?.add(trimmed); return null; }
  return id;
}

function lookupStudentId(studentCode: string): string | null {
  if (!studentCode || studentCode.trim() === '') return null;
  const trimmed = studentCode.trim();
  const uuid = studentMap.get(trimmed);
  if (!uuid) { unmappedValues.student.add(trimmed); return null; }
  return uuid;
}

function lookupProfileId(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const trimmed = legacyId.trim();
  const uuid = profileMap.get(trimmed);
  if (!uuid) { unmappedValues.profile.add(trimmed); return null; }
  return uuid;
}

interface CsvRow {
  aa_id: string; relationship: string; surname: string; firstname: string;
  title: string; gender: string; tel: string; mobile: string; fax: string;
  email1: string; email2: string; email3: string; address1: string; address2: string;
  priority: string; lastupdate: string; staffid: string; remarks: string;
  occupation: string; officetel: string; officefax: string;
}

function transformRow(row: CsvRow) {
  const studentId = lookupStudentId(row.aa_id);
  if (!studentId) return null;
  
  return {
    student_id: studentId,
    relationship_id: lookupId(row.relationship, RELATIONSHIP_CODE_MAP, lookupMaps.relationship, 'relationship'),
    title_id: lookupId(row.title, TITLE_CODE_MAP, lookupMaps.title, 'title'),
    surname: cleanString(row.surname),
    first_name: cleanString(row.firstname),
    gender: parseGender(row.gender),
    telephone: cleanString(row.tel),
    mobile: cleanString(row.mobile),
    fax: cleanString(row.fax),
    email_1: cleanString(row.email1),
    email_2: cleanString(row.email2),
    email_3: cleanString(row.email3),
    address_1: cleanString(row.address1),
    address_2: cleanString(row.address2),
    occupation: cleanString(row.occupation),
    office_telephone: cleanString(row.officetel),
    office_fax: cleanString(row.officefax),
    priority: parsePriority(row.priority),
    remarks: cleanString(row.remarks),
    assigned_to: lookupProfileId(row.staffid),
    legacy_last_update: parseTimestamp(row.lastupdate),
  };
}

async function migrate() {
  console.log('👥 Starting student contacts migration...\n');

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔌 Connected to: ${SUPABASE_URL}\n`);
  await loadLookupTables(supabase);

  if (studentMap.size === 0) {
    console.error('❌ No students found! Run migrate-students.ts first.');
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`📂 Reading: ${CSV_PATH}`);
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const { data, errors } = Papa.parse<CsvRow>(csvContent, { header: true, delimiter: '|', skipEmptyLines: true });
  if (errors.length > 0) console.error('❌ Parse errors:', errors.slice(0, 5));

  console.log(`📊 Found ${data.length} records\n`);

  let contacts = data.map(transformRow).filter((c): c is NonNullable<typeof c> => c !== null);
  console.log(`✅ Transformed ${contacts.length} valid records (with matching students)\n`);

  if (LIMIT && LIMIT > 0) {
    contacts = contacts.slice(0, LIMIT);
    console.log(`🔢 Limited to ${contacts.length} records\n`);
  }

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORDS');
    console.log('═'.repeat(60));
    contacts.slice(0, 3).forEach((c, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(c, null, 2));
    });

    const stats = {
      total: contacts.length,
      orphaned: data.length - contacts.length,
      with_assigned_to: contacts.filter(c => c.assigned_to).length,
    };
    console.log(`\n📊 Stats:`);
    console.log(`   Total valid: ${stats.total}`);
    console.log(`   Orphaned: ${stats.orphaned}`);
    console.log(`   With assigned_to: ${stats.with_assigned_to}`);

    console.log('\n⚠️  Unmapped values:');
    for (const [field, values] of Object.entries(unmappedValues)) {
      if (values.size > 0 && field !== 'student') console.log(`   ${field}: ${values.size} unique`);
    }
    console.log(`   orphaned students: ${unmappedValues.student.size}`);

    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('student_contacts').insert(batch).select('id');
    if (error) { console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message); failed += batch.length; }
    else { inserted += result?.length || 0; process.stdout.write(`\r⏳ ${inserted}/${contacts.length}`); }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}, Orphaned: ${data.length - contacts.length}\n`);
}

migrate().catch(console.error);
