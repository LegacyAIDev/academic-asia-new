/**
 * Data Migration Script: Import student application deposits from CSV
 *
 * IMPORTANT: Run AFTER migrate-student-applications.ts
 *
 * Source: AA_Student_SA_Deposit.csv
 *
 * Usage:
 *   npx tsx scripts/migrate-student-application-deposits.ts --dry-run
 *   npx tsx scripts/migrate-student-application-deposits.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_SA_Deposit.csv');

// Lookup maps
let applicationMap: Map<string, string> = new Map(); // "student_code|school_id" -> application uuid
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    school_id: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Load applications (need to match by student + school)
    // Get current (non-archived) applications first, as deposits are more likely linked to current
    const { data: applications } = await supabase
        .from('student_applications')
        .select('id, legacy_student_code, legacy_school_id')
        .eq('is_archived', false)
        .limit(200000);

    applications?.forEach(row => {
        if (row.legacy_student_code && row.legacy_school_id) {
            const key = `${row.legacy_student_code}|${row.legacy_school_id}`;
            applicationMap.set(key, row.id);
        }
    });
    console.log(`   ✅ applications (current): ${applicationMap.size}`);

    // Also load archived if deposit not found in current
    const { data: archivedApps } = await supabase
        .from('student_applications')
        .select('id, legacy_student_code, legacy_school_id')
        .eq('is_archived', true)
        .limit(300000);

    let archivedCount = 0;
    archivedApps?.forEach(row => {
        if (row.legacy_student_code && row.legacy_school_id) {
            const key = `${row.legacy_student_code}|${row.legacy_school_id}`;
            // Only add if not already in map (prefer current over archived)
            if (!applicationMap.has(key)) {
                applicationMap.set(key, row.id);
                archivedCount++;
            }
        }
    });
    console.log(`   ✅ applications (archived additions): ${archivedCount}`);
    console.log(`   ✅ total application mappings: ${applicationMap.size}`);

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

function parseDecimal(val: string): number | null {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

function lookupApplication(studentCode: string, schoolId: string): string | null {
    if (!studentCode || !schoolId) return null;
    const key = `${studentCode.trim()}|${parseInt(schoolId, 10)}`;
    return applicationMap.get(key) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    aa_id: string;
    school_id: string;
    depositdate: string;
    amount: string;
    discount: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    commission: string;
}

interface TransformedRecord {
    application_id: string;
    deposit_date: string | null;
    amount: number | null;
    discount: number | null;
    has_commission: boolean;
    remarks: string | null;
    legacy_student_code: string;
    legacy_school_id: number;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const applicationId = lookupApplication(row.aa_id, row.school_id);

    if (!applicationId) {
        skippedRecords.push({
            student_code: row.aa_id || 'null',
            school_id: row.school_id || 'null',
            reason: `application not found for ${row.aa_id} + school ${row.school_id}`,
        });
        return null;
    }

    return {
        application_id: applicationId,
        deposit_date: parseDate(row.depositdate),
        amount: parseDecimal(row.amount),
        discount: parseDecimal(row.discount),
        has_commission: row.commission === 'Y',
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_school_id: parseInt(row.school_id, 10),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('💰 Starting student application deposits migration...\n');

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

    if (DRY_RUN) {
        console.log('═'.repeat(60));
        console.log('📋 SAMPLE RECORD');
        console.log('═'.repeat(60));
        if (records[0]) console.log(JSON.stringify(records[0], null, 2));

        console.log('\n📊 STATS:');
        console.log(`   Valid deposits: ${records.length}`);
        console.log(`   With commission: ${records.filter(r => r.has_commission).length}`);
        console.log(`   Total amount: ${records.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}`);

        console.log('\n' + '═'.repeat(60));
        console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
        console.log('═'.repeat(60));

        console.log('\n📝 Sample skipped records:');
        skippedRecords.slice(0, 10).forEach((r, i) => {
            console.log(`   ${i + 1}. student=${r.student_code}, school=${r.school_id}`);
            console.log(`      → ${r.reason}`);
        });

        // Write skipped to file
        const skippedPath = path.join(process.cwd(), 'data', 'student-application-deposits-skipped.json');
        fs.writeFileSync(skippedPath, JSON.stringify({
            summary: {
                total_skipped: skippedRecords.length,
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
            .from('student_application_deposits')
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