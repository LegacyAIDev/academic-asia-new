/**
 * Data Migration Script: Import events from multiple legacy CSV files
 *
 * Consolidates 5 legacy tables into one unified events table:
 * - AA_Event.csv → event_type: 'event'
 * - AA_Expo.csv → event_type: 'expo'
 * - AA_TS.csv → event_type: 'top_schools'
 * - AA_II.csv → event_type: 'interview'
 * - AA_MA.csv → event_type: 'music_audition'
 *
 * Usage:
 *   npx tsx scripts/migrate-events.ts --dry-run         # Test without inserting
 *   npx tsx scripts/migrate-events.ts --dry-run --limit 10  # Preview 10 records per type
 *   npx tsx scripts/migrate-events.ts                   # Actually insert data
 *
 * Requirements:
 *   npm install papaparse @supabase/supabase-js dotenv
 *   npm install -D @types/papaparse tsx
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_INDEX = args.indexOf('--limit');
const LIMIT = LIMIT_INDEX !== -1 ? parseInt(args[LIMIT_INDEX + 1], 10) : null;

if (DRY_RUN) {
  console.log('🧪 DRY RUN MODE - No data will be inserted\n');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY!;

const BATCH_SIZE = 100;
const DATA_DIR = path.join(process.cwd(), 'data');

// Source files configuration
const EVENT_SOURCES = [
  {
    file: 'AA_Event.csv',
    eventTypeCode: 'event',
    legacyTable: 'event',
    idField: 'event_id',
    nameField: 'eventname',
    startDateField: 'eventstartdate',
    endDateField: 'eventenddate',
    locationField: 'eventlocation',
  },
  {
    file: 'AA_Expo.csv',
    eventTypeCode: 'expo',
    legacyTable: 'expo',
    idField: 'expo_id',
    nameField: 'exponame',
    startDateField: 'expostartdate',
    endDateField: 'expoenddate',
    locationField: 'expolocation',
  },
  {
    file: 'AA_TS.csv',
    eventTypeCode: 'top_schools',
    legacyTable: 'topschool',
    idField: 'topschool_id',
    nameField: 'topschoolname',
    startDateField: 'topschoolstartdate',
    endDateField: 'topschoolenddate',
    locationField: 'topschoollocation',
  },
  {
    file: 'AA_II.csv',
    eventTypeCode: 'interview',
    legacyTable: 'indinterview',
    idField: 'indinterview_id',
    nameField: 'indinterviewname',
    startDateField: 'indinterviewstartdate',
    endDateField: 'indinterviewenddate',
    locationField: 'indinterviewlocation',
  },
  {
    file: 'AA_MA.csv',
    eventTypeCode: 'music_audition',
    legacyTable: 'musicaudition',
    idField: 'musicaudition_id',
    nameField: 'musicauditionname',
    startDateField: 'musicauditionstartdate',
    endDateField: 'musicauditionenddate',
    locationField: 'musicauditionlocation',
  },
];

// ============================================================================
// LOOKUP MAPS
// ============================================================================

type LookupMap = Map<string, number>;
type ProfileMap = Map<string, string>;

const eventTypeMap: LookupMap = new Map();
const categoryMap: LookupMap = new Map();        // 'engagement_guidance' -> id
const deliveryModeMap: LookupMap = new Map();
const visibilityMap: LookupMap = new Map();
const schedulingModeMap: LookupMap = new Map();
let profileMap: ProfileMap = new Map();

// Map legacy table -> category code
const LEGACY_TO_CATEGORY: Record<string, string> = {
  event: 'engagement_guidance',
  expo: 'engagement_guidance',
  topschool: 'engagement_guidance',
  indinterview: 'admission_assessment',
  musicaudition: 'admission_assessment',
};

// Map legacy table -> scheduling mode code
const LEGACY_TO_SCHEDULING: Record<string, string> = {
  event: 'no_scheduling',
  expo: 'no_scheduling',
  topschool: 'no_scheduling',
  indinterview: 'one_to_one',
  musicaudition: 'one_to_one',
};

// Map legacy table -> visibility code
const LEGACY_TO_VISIBILITY: Record<string, string> = {
  event: 'public',
  expo: 'public',
  topschool: 'public',
  indinterview: 'private',
  musicaudition: 'private',
};

const unmappedValues: Record<string, Set<string>> = {
  profile: new Set(),
};

// ============================================================================
// LOAD LOOKUP TABLES
// ============================================================================

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading reference tables from database...\n');

  const { data: eventTypes } = await supabase.from('event_types').select('id, code');
  eventTypes?.forEach(row => eventTypeMap.set(row.code, row.id));
  console.log(`   ✅ event_types: ${eventTypes?.length || 0} records`);

  const { data: categories } = await supabase.from('event_categories').select('id, code');
  categories?.forEach(row => categoryMap.set(row.code, row.id));
  console.log(`   ✅ event_categories: ${categories?.length || 0} records`);

  const { data: deliveryModes } = await supabase.from('delivery_modes').select('id, code');
  deliveryModes?.forEach(row => deliveryModeMap.set(row.code, row.id));
  console.log(`   ✅ delivery_modes: ${deliveryModes?.length || 0} records`);

  const { data: visibilities } = await supabase.from('event_visibilities').select('id, code');
  visibilities?.forEach(row => visibilityMap.set(row.code, row.id));
  console.log(`   ✅ event_visibilities: ${visibilities?.length || 0} records`);

  const { data: schedulingModes } = await supabase.from('scheduling_modes').select('id, code');
  schedulingModes?.forEach(row => schedulingModeMap.set(row.code, row.id));
  console.log(`   ✅ scheduling_modes: ${schedulingModes?.length || 0} records`);

  // Load profile mapping (legacy_id -> uuid)
  const { data: profiles } = await supabase.from('profiles').select('id, legacy_id').not('legacy_id', 'is', null);
  profiles?.forEach(row => { if (row.legacy_id) profileMap.set(row.legacy_id, row.id); });
  console.log(`   ✅ profiles: ${profileMap.size} records`);

  console.log('');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cleanString(val: string | undefined): string | null {
  if (!val || val.trim() === '' || val.trim() === '.') return null;
  // Clean up multiline strings (location often has line breaks)
  return val.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseInt2(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const trimmed = dateStr.trim();

  // Format: YYYYMMDD
  if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    const month = trimmed.substring(4, 6);
    const day = trimmed.substring(6, 8);

    if (year === '0000' || month === '00' || day === '00') return null;

    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseTime(timeStr: string | undefined): string | null {
  if (!timeStr || timeStr.trim() === '') return null;

  const trimmed = timeStr.trim();

  // Format: HHMMSS (6 digits)
  if (trimmed.length === 6 && /^\d{6}$/.test(trimmed)) {
    const hour = trimmed.substring(0, 2);
    const min = trimmed.substring(2, 4);
    const sec = trimmed.substring(4, 6);

    return `${hour}:${min}:${sec}`;
  }

  return null;
}

function parseTimestamp(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const trimmed = dateStr.trim();

  // Format: YYYYMMDDHHMMSS
  if (trimmed.length === 14 && /^\d{14}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    const month = trimmed.substring(4, 6);
    const day = trimmed.substring(6, 8);
    const hour = trimmed.substring(8, 10);
    const min = trimmed.substring(10, 12);
    const sec = trimmed.substring(12, 14);

    if (year === '0000' || month === '00' || day === '00') return null;

    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }

  return null;
}

function lookupProfileId(legacyId: string | undefined): string | null {
  if (!legacyId || legacyId.trim() === '') return null;
  const trimmed = legacyId.trim();
  const uuid = profileMap.get(trimmed);
  if (!uuid) { unmappedValues.profile.add(trimmed); return null; }
  return uuid;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

interface TransformedEvent {
  legacy_id: number | null;
  legacy_table: string;
  category_id: number | null;
  event_type_id: number;
  name: string;
  delivery_mode_id: number | null;
  visibility_id: number | null;
  scheduling_mode_id: number | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(
    row: Record<string, string>,
    source: typeof EVENT_SOURCES[0]
): TransformedEvent | null {
  const eventTypeId = eventTypeMap.get(source.eventTypeCode);

  if (!eventTypeId) {
    console.error(`   ❌ Unknown event type: ${source.eventTypeCode}`);
    return null;
  }

  const name = cleanString(row[source.nameField]);
  if (!name) return null;

  return {
    legacy_id: parseInt2(row[source.idField]),
    legacy_table: source.legacyTable,
    category_id: categoryMap.get(LEGACY_TO_CATEGORY[source.legacyTable]) || null,
    event_type_id: eventTypeId,
    name: name,
    delivery_mode_id: deliveryModeMap.get('in_person') || null,
    visibility_id: visibilityMap.get(LEGACY_TO_VISIBILITY[source.legacyTable]) || null,
    scheduling_mode_id: schedulingModeMap.get(LEGACY_TO_SCHEDULING[source.legacyTable]) || null,
    start_date: parseDate(row[source.startDateField]),
    end_date: parseDate(row[source.endDateField]),
    start_time: parseTime(row['starttime']),
    end_time: parseTime(row['endtime']),
    duration_minutes: parseInt2(row['duration']),
    location: cleanString(row[source.locationField]),
    remarks: cleanString(row['remarks']),
    assigned_to: lookupProfileId(row['staffid']),
    legacy_last_update: parseTimestamp(row['lastupdate']),
  };
}

// ============================================================================
// PROCESS SINGLE FILE
// ============================================================================

async function processFile(
    source: typeof EVENT_SOURCES[0]
): Promise<TransformedEvent[]> {
  const filePath = path.join(DATA_DIR, source.file);

  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  File not found: ${source.file}`);
    return [];
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');

  const { data, errors } = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: '|',
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.error(`   ❌ Parse errors in ${source.file}:`, errors.slice(0, 3));
  }

  let events = data
      .map(row => transformRow(row, source))
      .filter((e): e is NonNullable<typeof e> => e !== null);

  // Apply limit per file if specified
  if (LIMIT && LIMIT > 0) {
    events = events.slice(0, LIMIT);
  }

  console.log(`   📄 ${source.file}: ${events.length} records`);

  return events;
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrate() {
  console.log('📅 Starting events migration...\n');

  // Initialize Supabase client
  if (!SUPABASE_URL) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  if (!SUPABASE_SECRET_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔌 Connected to Supabase');
  console.log(`   URL: ${SUPABASE_URL}\n`);

  // Load lookup tables
  await loadLookupTables(supabase);

  // Process all source files
  console.log('📂 Processing source files...\n');

  const allEvents: TransformedEvent[] = [];

  for (const source of EVENT_SOURCES) {
    const events = await processFile(source);
    allEvents.push(...events);
  }

  console.log(`\n✅ Total events to migrate: ${allEvents.length}\n`);

  // ============================================================================
  // DRY RUN: Preview
  // ============================================================================

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORDS BY TYPE');
    console.log('═'.repeat(60));

    for (const source of EVENT_SOURCES) {
      const sample = allEvents.find(e => e.legacy_table === source.legacyTable);
      if (sample) {
        console.log(`\n--- ${source.eventTypeCode.toUpperCase()} ---`);
        console.log(JSON.stringify(sample, null, 2));
      }
    }

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY BY TYPE');
    console.log('═'.repeat(60));

    for (const source of EVENT_SOURCES) {
      const count = allEvents.filter(e => e.legacy_table === source.legacyTable).length;
      console.log(`   ${source.eventTypeCode.padEnd(15)} ${count}`);
    }
    console.log(`   ${'─'.repeat(20)}`);
    console.log(`   ${'TOTAL'.padEnd(15)} ${allEvents.length}`);

    // Write preview file
    const outputPath = path.join(DATA_DIR, 'events-migration-preview.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      summary: EVENT_SOURCES.map(s => ({
        type: s.eventTypeCode,
        count: allEvents.filter(e => e.legacy_table === s.legacyTable).length,
      })),
      total: allEvents.length,
      records: allEvents.slice(0, 50),
    }, null, 2));

    console.log(`\n📁 Full preview written to: ${outputPath}`);
    console.log('\n🧪 DRY RUN COMPLETE - No data was inserted');
    console.log('   Run without --dry-run to insert data\n');
    return;
  }

  // ============================================================================
  // ACTUAL INSERT
  // ============================================================================

  let inserted = 0;
  let failed = 0;
  const errorLog: Array<{ batchNumber: number; error: string; sampleRecord: any }> = [];

  for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
    const batch = allEvents.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const { data: result, error } = await supabase
        .from('events')
        .insert(batch)
        .select('id');

    if (error) {
      console.error(`\n❌ Batch ${batchNumber} failed:`, error.message);
      errorLog.push({
        batchNumber,
        error: error.message,
        sampleRecord: batch[0],
      });
      failed += batch.length;
    } else {
      inserted += result?.length || 0;
      process.stdout.write(`\r⏳ Progress: ${inserted}/${allEvents.length} inserted`);
    }
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Failed: ${failed}`);
  console.log('═'.repeat(50));

  // Summary by type
  console.log('\n📊 Breakdown by type:');
  for (const source of EVENT_SOURCES) {
    const count = allEvents.filter(e => e.legacy_table === source.legacyTable).length;
    console.log(`   ${source.eventTypeCode.padEnd(15)} ${count}`);
  }

  // Write error report
  if (errorLog.length > 0) {
    const reportPath = path.join(DATA_DIR, 'events-migration-errors.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: { inserted, failed },
      errors: errorLog,
    }, null, 2));
    console.log(`\n📁 Error report: ${reportPath}`);
  }
}

// Run migration
migrate().catch(console.error);