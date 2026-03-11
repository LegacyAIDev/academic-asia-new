/**
 * Data Migration Script: Import school visits (AA staff visits to schools) from CSV
 *
 * Source: AA_School_Visit.csv
 * Records: ~85 consultant school visit records
 *
 * Notes:
 * - school_id in CSV is the numeric legacy ID → lookup via schools.legacy_id
 * - "result" field is empty for all records (reserved column)
 * - "remarks" field contains very detailed school visit notes (can be very long)
 * - These are AA consultant visits TO schools, not student visits
 *
 * Usage:
 *   npx tsx scripts/33_migrate-school-visits.ts --dry-run
 *   npx tsx scripts/33_migrate-school-visits.ts
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
const BATCH_SIZE = 50; // Small batch — remarks can be very large
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Visit.csv');

// Lookup maps
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid

// Track issues
interface SkippedRecord {
    school_id: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Load schools (by legacy_id)
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

function parseDate(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === '') return null;
    const trimmed = dateStr.trim();
    if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4);
        const month = trimmed.substring(4, 6);
        const day = trimmed.substring(6, 8);
        if (year === '0000') return null;
        return `${year}-${month}-${day}`;
    }
    return null;
}

function lookupSchool(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    const id = parseInt(legacyId, 10);
    if (isNaN(id)) return null;
    return schoolMap.get(id) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    school_id: string;
    visitdate: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    schoolcontact: string;
    visitlog: string;
    result: string;
}

interface TransformedRecord {
    school_id: string;
    visit_date: string | null;
    school_contact: string | null;
    visit_log: string | null;
    result: string | null;
    remarks: string | null;
    legacy_school_id: number;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const schoolId = lookupSchool(row.school_id);

    if (!schoolId) {
        skippedRecords.push({
            school_id: row.school_id || 'null',
            reason: `school legacy_id ${row.school_id} not found`,
        });
        return null;
    }

    return {
        school_id: schoolId,
        visit_date: parseDate(row.visitdate),
        school_contact: cleanString(row.schoolcontact),
        visit_log: cleanString(row.visitlog),
        result: cleanString(row.result),
        remarks: cleanString(row.remarks),
        legacy_school_id: parseInt(row.school_id, 10) || 0,
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('🏫 Starting school visits migration...\n');

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

    // Process in batches
    let inserted = 0, failed = 0, valid = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        const records = chunk
            .map(row => transformRow(row))
            .filter((r): r is TransformedRecord => r !== null);

        valid += records.length;

        if (!DRY_RUN && records.length > 0) {
            const { data: result, error } = await supabase
                .from('school_visits')
                .insert(records)
                .select('id');

            if (error) {
                failed += records.length;
                if (failed <= BATCH_SIZE) {
                    console.error(`\n❌ Batch error:`, error.message);
                }
            } else {
                inserted += result?.length || 0;
            }
            process.stdout.write(`\r⏳ ${inserted}/${valid} inserted`);
        }
    }

    // Summary
    console.log('\n\n' + '═'.repeat(60));
    if (DRY_RUN) {
        console.log('📋 DRY RUN SUMMARY');
        console.log('═'.repeat(60));
        console.log(`   Total rows: ${data.length}`);
        console.log(`   Valid records: ${valid}`);
        console.log(`   Skipped: ${skippedRecords.length}`);

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. school_id=${r.school_id}`);
                console.log(`      → ${r.reason}`);
            });
        }

        console.log('\n🧪 DRY RUN COMPLETE\n');
    } else {
        console.log('✅ MIGRATION COMPLETE');
        console.log('═'.repeat(60));
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Skipped: ${skippedRecords.length}`);
    }
}

migrate().catch(console.error);