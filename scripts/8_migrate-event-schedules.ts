/**
 * Data Migration Script: Import event_schedules from multiple legacy CSV files
 * 
 * Consolidates: AA_Expo_Schedule, AA_II_Schedule, AA_MA_Schedule, AA_TS_Schedule
 * 
 * Usage:
 *   npx tsx scripts/migrate-event-schedules.ts --dry-run
 *   npx tsx scripts/migrate-event-schedules.ts
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
const DATA_DIR = path.join(process.cwd(), 'data');

// Source configurations
const SOURCES = [
  { file: 'AA_Expo_Schedule.csv', legacyTable: 'expo', idField: 'expo_id', dateField: 'exposdate' },
  { file: 'AA_II_Schedule.csv', legacyTable: 'indinterview', idField: 'indinterview_id', dateField: 'indinterviewsdate' },
  { file: 'AA_MA_Schedule.csv', legacyTable: 'musicaudition', idField: 'musicaudition_id', dateField: 'musicauditiondate' },
  { file: 'AA_TS_Schedule.csv', legacyTable: 'topschool', idField: 'topschool_id', dateField: 'topschoolsdate' },
];

// Lookup maps
let eventMap: Map<string, string> = new Map();
let studentMap: Map<string, string> = new Map(); // student_code -> uuid
let profileMap: Map<string, string> = new Map();

const unmappedValues = { events: new Set<string>(), students: new Set<string>(), profiles: new Set<string>() };

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading lookup tables...\n');

  const { data: events } = await supabase
    .from('events')
    .select('id, legacy_id, legacy_table')
    .not('legacy_id', 'is', null)
    .limit(10000);
  events?.forEach(row => {
    if (row.legacy_table && row.legacy_id) {
      eventMap.set(`${row.legacy_table}_${row.legacy_id}`, row.id);
    }
  });
  console.log(`   ✅ events: ${eventMap.size}`);

  // Load ALL students (need higher limit)
  const { data: students } = await supabase
    .from('students')
    .select('id, student_code')
    .not('student_code', 'is', null)
    .limit(50000);
  students?.forEach(row => {
    if (row.student_code) studentMap.set(row.student_code, row.id);
  });
  console.log(`   ✅ students: ${studentMap.size}`);

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

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const trimmed = dateStr.trim();
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
    if (year === '0000' || month === '00' || day === '00') return null;
    return `${year}-${month}-${day}`;
  }
  return null;
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

function lookupEvent(legacyTable: string, legacyId: string): string | null {
  const id = parseInt(legacyId, 10);
  if (isNaN(id)) return null;
  const key = `${legacyTable}_${id}`;
  const uuid = eventMap.get(key);
  if (!uuid) unmappedValues.events.add(key);
  return uuid || null;
}

function lookupStudent(studentCode: string): string | null {
  if (!studentCode || studentCode.trim() === '') return null;
  const code = studentCode.trim();
  const uuid = studentMap.get(code);
  if (!uuid) unmappedValues.students.add(code);
  return uuid || null;
}

function lookupProfile(legacyId: string): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const uuid = profileMap.get(legacyId.trim());
  if (!uuid) unmappedValues.profiles.add(legacyId);
  return uuid || null;
}

interface TransformedRecord {
  event_id: string;
  student_id: string;
  legacy_event_id: number;
  legacy_student_code: string;
  legacy_table: string;
  schedule_date: string | null;
  timeslot: number | null;
  interviewer_name: string | null;
  remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(row: Record<string, string>, source: typeof SOURCES[0]): TransformedRecord | null {
  const eventId = lookupEvent(source.legacyTable, row[source.idField]);
  const studentId = lookupStudent(row['aa_id']);
  
  if (!eventId || !studentId) return null;
  
  return {
    event_id: eventId,
    student_id: studentId,
    legacy_event_id: parseInt(row[source.idField], 10),
    legacy_student_code: row['aa_id']?.trim() || '',
    legacy_table: source.legacyTable,
    schedule_date: parseDate(row[source.dateField]),
    timeslot: parseInt2(row['timeslot']),
    interviewer_name: cleanString(row['name']),
    remarks: cleanString(row['remarks']),
    assigned_to: lookupProfile(row['staffid']),
    legacy_last_update: parseTimestamp(row['lastupdate']),
  };
}

async function processFile(source: typeof SOURCES[0]): Promise<TransformedRecord[]> {
  const filePath = path.join(DATA_DIR, source.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  File not found: ${source.file}`);
    return [];
  }
  
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const { data } = Papa.parse<Record<string, string>>(csvContent, {
    header: true, delimiter: '|', skipEmptyLines: true,
  });
  
  const records = data.map(row => transformRow(row, source)).filter((r): r is TransformedRecord => r !== null);
  console.log(`   📄 ${source.file}: ${records.length}/${data.length} valid`);
  return records;
}

async function migrate() {
  console.log('📅 Starting event_schedules migration...\n');

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔌 Connected to: ${SUPABASE_URL}\n`);
  await loadLookupTables(supabase);

  console.log('📂 Processing source files...\n');
  const allRecords: TransformedRecord[] = [];
  for (const source of SOURCES) {
    const records = await processFile(source);
    allRecords.push(...records);
  }

  console.log(`\n✅ Total records: ${allRecords.length}\n`);

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORD');
    console.log('═'.repeat(60));
    if (allRecords[0]) console.log(JSON.stringify(allRecords[0], null, 2));
    
    console.log('\n📊 BY SOURCE:');
    for (const source of SOURCES) {
      const count = allRecords.filter(r => r.legacy_table === source.legacyTable).length;
      console.log(`   ${source.legacyTable.padEnd(15)} ${count}`);
    }
    
    console.log('\n⚠️  Unmapped:');
    console.log(`   events: ${unmappedValues.events.size}`);
    console.log(`   students: ${unmappedValues.students.size}`);
    console.log(`   profiles: ${unmappedValues.profiles.size}`);
    
    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('event_schedules').insert(batch).select('id');
    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message);
      failed += batch.length;
    } else {
      inserted += result?.length || 0;
      process.stdout.write(`\r⏳ ${inserted}/${allRecords.length}`);
    }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}\n`);
}

migrate().catch(console.error);
