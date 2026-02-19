/**
 * Data Migration Script: Import event_schools from multiple legacy CSV files
 *
 * Consolidates: AA_Event_School, AA_Expo_School, AA_II_School, AA_MA_School, AA_TS_School
 *
 * Usage:
 *   npx tsx scripts/migrate-event-schools.ts --dry-run
 *   npx tsx scripts/migrate-event-schools.ts
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
  { file: 'AA_Event_School.csv', legacyTable: 'event', idField: 'event_id' },
  { file: 'AA_Expo_School.csv', legacyTable: 'expo', idField: 'expo_id' },
  { file: 'AA_II_School.csv', legacyTable: 'indinterview', idField: 'indinterview_id' },
  { file: 'AA_MA_School.csv', legacyTable: 'musicaudition', idField: 'musicaudition_id' },
  { file: 'AA_TS_School.csv', legacyTable: 'topschool', idField: 'topschool_id' },
];

// Lookup maps
let eventMap: Map<string, string> = new Map(); // "event_123" -> uuid
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map(); // "AA00070" -> uuid

const unmappedValues = { events: new Set<string>(), schools: new Set<string>(), profiles: new Set<string>() };

// Track skipped records
interface SkippedRecord {
  source: string;
  event_id: string;
  school_id: string;
  reason: string;
}
const skippedRecords: SkippedRecord[] = [];

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading lookup tables...\n');

  // Load events (need legacy_table + legacy_id combo)
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

function parseBoolean(val: string): boolean {
  return val === 'Y' || val === 'y' || val === '1';
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

interface TransformedEventSchool {
  event_id: string;
  school_id: string;
  legacy_event_id: number;
  legacy_school_id: number;
  legacy_table: string;
  remarks: string | null;
  event_remarks: string | null;
  registration_fee: string | null;
  payable_to: string | null;
  is_confirmed: boolean;
  is_school_confirmed: boolean;
  application_deadline: string | null;
  application_deadline_remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(row: Record<string, string>, source: typeof SOURCES[0]): TransformedEventSchool | null {
  const legacyEventId = row[source.idField];
  const legacySchoolId = row['school_id'];

  const eventId = lookupEvent(source.legacyTable, legacyEventId);
  const schoolId = lookupSchool(legacySchoolId);

  // Track why record was skipped
  if (!eventId || !schoolId) {
    const reasons: string[] = [];
    if (!eventId) reasons.push(`event ${source.legacyTable}_${legacyEventId} not found`);
    if (!schoolId) reasons.push(`school ${legacySchoolId} not found`);

    skippedRecords.push({
      source: source.file,
      event_id: legacyEventId || 'null',
      school_id: legacySchoolId || 'null',
      reason: reasons.join(', '),
    });
    return null;
  }

  return {
    event_id: eventId,
    school_id: schoolId,
    legacy_event_id: parseInt(row[source.idField], 10),
    legacy_school_id: parseInt(row['school_id'], 10),
    legacy_table: source.legacyTable,
    remarks: cleanString(row['remarks']),
    event_remarks: cleanString(row['eventremarks']),
    registration_fee: cleanString(row['regfee']),
    payable_to: cleanString(row['payableto']),
    is_confirmed: parseBoolean(row['confirmed'] || ''),
    is_school_confirmed: parseBoolean(row['schoolconfirmed'] || ''),
    application_deadline: parseDate(row['applicationdeadline'] || ''),
    application_deadline_remarks: cleanString(row['applicationdeadlineremarks']),
    assigned_to: lookupProfile(row['staffid']),
    legacy_last_update: parseTimestamp(row['lastupdate']),
  };
}

async function processFile(source: typeof SOURCES[0]): Promise<TransformedEventSchool[]> {
  const filePath = path.join(DATA_DIR, source.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  File not found: ${source.file}`);
    return [];
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const { data } = Papa.parse<Record<string, string>>(csvContent, {
    header: true, delimiter: '|', skipEmptyLines: true,
  });

  const records = data.map(row => transformRow(row, source)).filter((r): r is TransformedEventSchool => r !== null);
  console.log(`   📄 ${source.file}: ${records.length}/${data.length} valid`);
  return records;
}

async function migrate() {
  console.log('🏫 Starting event_schools migration...\n');

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
  const allRecords: TransformedEventSchool[] = [];
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

    console.log('\n⚠️  Unmapped totals:');
    console.log(`   events: ${unmappedValues.events.size}`);
    console.log(`   schools: ${unmappedValues.schools.size}`);
    console.log(`   profiles: ${unmappedValues.profiles.size}`);

    // Skipped records summary
    console.log('\n' + '═'.repeat(60));
    console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
    console.log('═'.repeat(60));

    // Group by reason type
    const missingEvent = skippedRecords.filter(r => r.reason.includes('event') && !r.reason.includes('school'));
    const missingSchool = skippedRecords.filter(r => r.reason.includes('school') && !r.reason.includes('event'));
    const missingBoth = skippedRecords.filter(r => r.reason.includes('event') && r.reason.includes('school'));

    console.log(`\n   Missing event only:  ${missingEvent.length}`);
    console.log(`   Missing school only: ${missingSchool.length}`);
    console.log(`   Missing both:        ${missingBoth.length}`);

    // Show sample skipped records
    console.log('\n📝 Sample skipped records:');
    skippedRecords.slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. [${r.source}] event=${r.event_id}, school=${r.school_id}`);
      console.log(`      → ${r.reason}`);
    });
    if (skippedRecords.length > 10) {
      console.log(`   ... and ${skippedRecords.length - 10} more`);
    }

    // Write full skipped records to file
    const skippedPath = path.join(DATA_DIR, 'event-schools-skipped.json');
    fs.writeFileSync(skippedPath, JSON.stringify({
      summary: {
        total_skipped: skippedRecords.length,
        missing_event_only: missingEvent.length,
        missing_school_only: missingSchool.length,
        missing_both: missingBoth.length,
      },
      skipped_records: skippedRecords,
    }, null, 2));
    console.log(`\n📁 Full skipped list saved to: ${skippedPath}`);

    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase.from('event_schools').insert(batch).select('id');
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