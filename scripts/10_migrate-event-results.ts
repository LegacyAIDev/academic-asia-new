/**
 * Data Migration Script: Import event_results from AA_Event_Result.csv
 * 
 * This table stores student outcomes (offers, scores) from events
 * 
 * Usage:
 *   npx tsx scripts/migrate-event-results.ts --dry-run
 *   npx tsx scripts/migrate-event-results.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

if (DRY_RUN) console.log('🧪 DRY RUN MODE\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const BATCH_SIZE = 100;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Event_Result.csv');

// Lookup maps
let eventNameMap: Map<string, string> = new Map(); // event name -> uuid
let studentMap: Map<string, string> = new Map(); // student_code -> uuid
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map();

const unmappedValues = { 
  events: new Set<string>(), 
  students: new Set<string>(), 
  schools: new Set<string>(), 
  profiles: new Set<string>() 
};

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading lookup tables...\n');

  // Load events by NAME (results use event name, not ID)
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .limit(10000);
  events?.forEach(row => {
    if (row.name) {
      // Normalize event name for matching
      eventNameMap.set(row.name.trim().toUpperCase(), row.id);
    }
  });
  console.log(`   ✅ events: ${eventNameMap.size}`);

  // Load ALL students
  const { data: students } = await supabase
    .from('students')
    .select('id, student_code')
    .not('student_code', 'is', null)
    .limit(50000);
  students?.forEach(row => {
    if (row.student_code) studentMap.set(row.student_code, row.id);
  });
  console.log(`   ✅ students: ${studentMap.size}`);

  // Load schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null)
    .limit(10000);
  schools?.forEach(row => {
    if (row.legacy_id) schoolMap.set(row.legacy_id, row.id);
  });
  console.log(`   ✅ schools: ${schoolMap.size}`);

  // Load profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null)
    .limit(1000);
  profiles?.forEach(row => {
    if (row.legacy_id) profileMap.set(row.legacy_id, row.id);
  });
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
    if (year === '0000') return null;
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }
  return null;
}

function parseInt2(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function lookupEventByName(eventName: string): string | null {
  if (!eventName || eventName.trim() === '') return null;
  const normalized = eventName.trim().toUpperCase();
  const uuid = eventNameMap.get(normalized);
  if (!uuid) unmappedValues.events.add(eventName.trim());
  return uuid || null;
}

function lookupStudent(studentCode: string): string | null {
  if (!studentCode || studentCode.trim() === '') return null;
  const code = studentCode.trim();
  const uuid = studentMap.get(code);
  if (!uuid) unmappedValues.students.add(code);
  return uuid || null;
}

function lookupSchool(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const id = parseInt(legacyId, 10);
  if (isNaN(id)) return null;
  const uuid = schoolMap.get(id);
  if (!uuid) unmappedValues.schools.add(legacyId);
  return uuid || null;
}

function lookupProfile(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const uuid = profileMap.get(legacyId.trim());
  if (!uuid) unmappedValues.profiles.add(legacyId);
  return uuid || null;
}

interface CsvRow {
  aa_id: string;
  event: string;
  school_id: string;
  eventsubject: string;
  qualification: string;
  piece: string;
  composer: string;
  eventscore: string;
  offer: string;
  piority: string; // Note: typo in original CSV
  lastupdate: string;
  staffid: string;
  remarks: string;
}

interface TransformedRecord {
  event_id: string | null;
  student_id: string;
  school_id: string | null;
  legacy_event_name: string | null;
  legacy_student_code: string;
  legacy_school_id: number | null;
  subject: string | null;
  qualification: string | null;
  piece: string | null;
  composer: string | null;
  score: string | null;
  offer: string | null;
  priority: number | null;
  remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
  const studentId = lookupStudent(row.aa_id);
  
  // Student is required
  if (!studentId) return null;
  
  return {
    event_id: lookupEventByName(row.event),
    student_id: studentId,
    school_id: lookupSchool(row.school_id),
    legacy_event_name: cleanString(row.event),
    legacy_student_code: row.aa_id?.trim() || '',
    legacy_school_id: parseInt2(row.school_id),
    subject: cleanString(row.eventsubject),
    qualification: cleanString(row.qualification),
    piece: cleanString(row.piece),
    composer: cleanString(row.composer),
    score: cleanString(row.eventscore),
    offer: cleanString(row.offer),
    priority: parseInt2(row.piority), // Note: typo in original
    remarks: cleanString(row.remarks),
    assigned_to: lookupProfile(row.staffid),
    legacy_last_update: parseTimestamp(row.lastupdate),
  };
}

async function migrate() {
  console.log('🏆 Starting event_results migration...\n');

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
  const { data, errors } = Papa.parse<CsvRow>(csvContent, {
    header: true, delimiter: '|', skipEmptyLines: true,
  });
  if (errors.length > 0) console.error('❌ Parse errors:', errors.slice(0, 5));

  console.log(`📊 Found ${data.length} records\n`);

  const records = data.map(transformRow).filter((r): r is TransformedRecord => r !== null);
  console.log(`✅ Transformed ${records.length} valid records\n`);

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORDS');
    console.log('═'.repeat(60));
    records.slice(0, 2).forEach((r, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(r, null, 2));
    });
    
    console.log('\n📊 STATS:');
    console.log(`   Total valid: ${records.length}`);
    console.log(`   With event match: ${records.filter(r => r.event_id).length}`);
    console.log(`   With school match: ${records.filter(r => r.school_id).length}`);
    console.log(`   With offer: ${records.filter(r => r.offer).length}`);
    
    console.log('\n⚠️  Unmapped:');
    console.log(`   events: ${unmappedValues.events.size}`);
    console.log(`   students: ${unmappedValues.students.size}`);
    console.log(`   schools: ${unmappedValues.schools.size}`);
    console.log(`   profiles: ${unmappedValues.profiles.size}`);
    
    // Show sample unmapped events
    if (unmappedValues.events.size > 0) {
      console.log('\n   Sample unmapped events:');
      Array.from(unmappedValues.events).slice(0, 5).forEach(e => console.log(`     - "${e}"`));
    }
    
    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('event_results').insert(batch).select('id');
    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message);
      failed += batch.length;
    } else {
      inserted += result?.length || 0;
      process.stdout.write(`\r⏳ ${inserted}/${records.length}`);
    }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}\n`);
}

migrate().catch(console.error);
