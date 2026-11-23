/**
 * Data Migration Script: Import school supplementary info from AA_School_Sup_Info.csv
 * 
 * Usage:
 *   npx tsx scripts/migrate-school-sup-info.ts --dry-run
 *   npx tsx scripts/migrate-school-sup-info.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Sup_Info.csv');

// Lookup maps
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map(); // "AA00070" -> uuid

// Track skipped records
interface SkippedRecord {
  school_id: string;
  info_type: string;
  reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedValues = { schools: new Set<string>(), profiles: new Set<string>() };

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading lookup tables...\n');

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
  school_id: string;
  infotype: string;
  info: string;
  lastupdate: string;
  staffid: string;
  remarks: string;
  ssyear: string;
}

interface TransformedRecord {
  school_id: string;
  legacy_school_id: number;
  info_type: string;
  info: string | null;
  school_year: string | null;
  remarks: string | null;
  assigned_to: string | null;
  legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
  const schoolId = lookupSchool(row.school_id);
  const infoType = cleanString(row.infotype);
  
  if (!schoolId) {
    skippedRecords.push({
      school_id: row.school_id || 'null',
      info_type: row.infotype || 'null',
      reason: `school ${row.school_id} not found`,
    });
    return null;
  }
  
  if (!infoType) {
    skippedRecords.push({
      school_id: row.school_id,
      info_type: 'null',
      reason: 'missing info_type',
    });
    return null;
  }
  
  return {
    school_id: schoolId,
    legacy_school_id: parseInt(row.school_id, 10),
    info_type: infoType,
    info: cleanString(row.info),
    school_year: cleanString(row.ssyear),
    remarks: cleanString(row.remarks),
    assigned_to: lookupProfile(row.staffid),
    legacy_last_update: parseTimestamp(row.lastupdate),
  };
}

async function migrate() {
  console.log('📋 Starting school supplementary info migration...\n');

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
    header: true,
    delimiter: '|',
    skipEmptyLines: true,
  });
  
  if (errors.length > 0) {
    console.error('❌ Parse errors:', errors.slice(0, 5));
  }

  console.log(`📊 Found ${data.length} records\n`);

  const records = data.map(transformRow).filter((r): r is TransformedRecord => r !== null);
  console.log(`✅ Transformed ${records.length} valid records\n`);

  // Analyze info types
  const infoTypeCounts: Record<string, number> = {};
  records.forEach(r => {
    infoTypeCounts[r.info_type] = (infoTypeCounts[r.info_type] || 0) + 1;
  });

  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 SAMPLE RECORD');
    console.log('═'.repeat(60));
    if (records[0]) console.log(JSON.stringify(records[0], null, 2));
    
    console.log('\n📊 TOP 15 INFO TYPES:');
    const sortedTypes = Object.entries(infoTypeCounts).sort((a, b) => b[1] - a[1]);
    sortedTypes.slice(0, 15).forEach(([type, count]) => {
      console.log(`   ${count.toString().padStart(4)} - ${type}`);
    });
    console.log(`   ... and ${Object.keys(infoTypeCounts).length - 15} more types`);

    console.log('\n' + '═'.repeat(60));
    console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
    console.log('═'.repeat(60));
    
    const missingSchool = skippedRecords.filter(r => r.reason.includes('school'));
    const missingType = skippedRecords.filter(r => r.reason.includes('info_type'));
    
    console.log(`\n   Missing school: ${missingSchool.length}`);
    console.log(`   Missing type:   ${missingType.length}`);
    
    console.log('\n📝 Sample skipped records:');
    skippedRecords.slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. school=${r.school_id}, type="${r.info_type}"`);
      console.log(`      → ${r.reason}`);
    });
    
    // Write skipped to file
    const skippedPath = path.join(process.cwd(), 'data', 'school-sup-info-skipped.json');
    fs.writeFileSync(skippedPath, JSON.stringify({
      summary: {
        total_skipped: skippedRecords.length,
        missing_school: missingSchool.length,
        missing_type: missingType.length,
      },
      skipped_records: skippedRecords,
    }, null, 2));
    console.log(`\n📁 Skipped list saved to: ${skippedPath}`);
    
    console.log('\n🧪 DRY RUN COMPLETE\n');
    return;
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase
      .from('school_supplementary_info')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message);
      failed += batch.length;
    } else {
      inserted += result?.length || 0;
      process.stdout.write(`\r⏳ ${inserted}/${records.length}`);
    }
  }

  console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}, Skipped: ${skippedRecords.length}\n`);
}

migrate().catch(console.error);
