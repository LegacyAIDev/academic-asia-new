/**
 * Data Migration Script: Import event_representatives from multiple legacy CSV files
 *
 * Consolidates: AA_Expo_Interviewer, AA_II_Interviewer, AA_MA_Interviewer, AA_TS_Interviewer
 * Target table: event_representatives (renamed from event_interviewers in migration 035)
 *
 * Usage:
 *   npx tsx scripts/migrate-event-interviewers.ts --dry-run
 *   npx tsx scripts/migrate-event-interviewers.ts
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

// Source configurations (no Event - it doesn't have interviewers)
const SOURCES = [
  { file: 'AA_Expo_Interviewer.csv', legacyTable: 'expo', idField: 'expo_id' },
  { file: 'AA_II_Interviewer.csv', legacyTable: 'indinterview', idField: 'indinterview_id' },
  { file: 'AA_MA_Interviewer.csv', legacyTable: 'musicaudition', idField: 'musicaudition_id' },
  { file: 'AA_TS_Interviewer.csv', legacyTable: 'topschool', idField: 'topschool_id' },
];

// Lookup maps
let eventMap: Map<string, string> = new Map();
let schoolMap: Map<number, string> = new Map();
let profileMap: Map<string, string> = new Map();

const unmappedValues = { events: new Set<string>(), schools: new Set<string>(), profiles: new Set<string>() };

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

  const { data: schools } = await supabase
      .from('schools')
      .select('id, legacy_id')
      .not('legacy_id', 'is', null)
      .limit(10000);
  schools?.forEach(row => {
    if (row.legacy_id) schoolMap.set(row.legacy_id, row.id);
  });
  console.log(`   ✅ schools: ${schoolMap.size}`);

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

function lookupEvent(legacyTable: string, legacyId: string): string | null {
  const id = parseInt(legacyId, 10);
  if (isNaN(id)) return null;
  const key = `${legacyTable}_${id}`;
  const uuid = eventMap.get(key);
  if (!uuid) unmappedValues.events.add(key);
  return uuid || null;
}

function lookupSchool(legacyId: string): string | null {
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

interface TransformedRecord {
  event_id: string;
  school_id: string;
  legacy_event_id: number;
  legacy_school_id: number;
  legacy_table: string;
  name: string;
  remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(row: Record<string, string>, source: typeof SOURCES[0]): TransformedRecord | null {
  const eventId = lookupEvent(source.legacyTable, row[source.idField]);
  const schoolId = lookupSchool(row['school_id']);
  const name = cleanString(row['name']);

  if (!eventId || !schoolId || !name) return null;

  return {
    event_id: eventId,
    school_id: schoolId,
    legacy_event_id: parseInt(row[source.idField], 10),
    legacy_school_id: parseInt(row['school_id'], 10),
    legacy_table: source.legacyTable,
    name: name,
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
  console.log('👔 Starting event_representatives migration...\n');

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
    console.log(`   schools: ${unmappedValues.schools.size}`);
    console.log(`   profiles: ${unmappedValues.profiles.size}`);

    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('event_representatives').insert(batch).select('id');
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