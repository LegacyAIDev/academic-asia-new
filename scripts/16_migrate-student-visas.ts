/**
 * Data Migration Script: Import student visas from CSV
 *
 * Source: AA_Student_Visa.csv
 *
 * Usage:
 *   npx tsx scripts/16_migrate-student-visas.ts --dry-run
 *   npx tsx scripts/16_migrate-student-visas.ts
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
const BATCH_SIZE = 500;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Visa.csv');

// Lookup maps
let studentMap: Map<string, string> = new Map();
let schoolNameMap: Map<string, string> = new Map(); // school name (lowercase) -> uuid
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    school: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedSchools = new Set<string>();

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Load students
    const { data: students } = await supabase
        .from('students')
        .select('id, student_code')
        .not('student_code', 'is', null)
        .limit(50000);
    students?.forEach(row => {
        if (row.student_code) studentMap.set(row.student_code, row.id);
    });
    console.log(`   ✅ students: ${studentMap.size}`);

    // Load schools by name (for lookup)
    const { data: schools } = await supabase
        .from('schools')
        .select('id, name')
        .limit(10000);
    schools?.forEach(row => {
        if (row.name) {
            // Store by lowercase name for case-insensitive matching
            schoolNameMap.set(row.name.toLowerCase().trim(), row.id);
        }
    });
    console.log(`   ✅ schools: ${schoolNameMap.size}`);

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

function parseEntryYear(entryYear: string): { year: number | null, month: number | null } {
    if (!entryYear || entryYear.trim() === '') return { year: null, month: null };
    const trimmed = entryYear.trim();
    if (trimmed.length === 6 && /^\d{6}$/.test(trimmed)) {
        const year = parseInt(trimmed.substring(0, 4), 10);
        const month = parseInt(trimmed.substring(4, 6), 10);
        return { year: isNaN(year) ? null : year, month: isNaN(month) ? null : month };
    }
    return { year: null, month: null };
}

function parseDecimal(val: string): number {
    if (!val || val.trim() === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

function parseBool(val: string): boolean {
    return val === 'Y';
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupSchoolByName(schoolName: string): string | null {
    if (!schoolName || schoolName.trim() === '') return null;
    const name = schoolName.toLowerCase().trim();
    const uuid = schoolNameMap.get(name);
    if (!uuid) unmappedSchools.add(schoolName.trim());
    return uuid || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

// CSV columns (based on analysis):
// 0: aa_id, 1: application, 2: lastupdate, 3: staffid, 4: remarks
// 5-15: case (11 columns), 16: school, 17: case, 18: appointmentdate
// 19: amount, 20-23: case (4 columns), 24: receipt, 25: entryyear

interface TransformedRecord {
    student_id: string;
    school_id: string | null;
    application: string | null;
    entry_year: string | null;
    entry_month: number | null;
    entry_year_value: number | null;
    request_sent_to_parent: boolean;
    passport_received: boolean;
    passport_sent_to_school: boolean;
    sent_visa_information: boolean;
    cas_received: boolean;
    visa_granted: boolean;
    visa_copy: boolean;
    visa_copy_sent: boolean;
    appointment: boolean;
    appointment_date: string | null;
    amount: number;
    receipt: string | null;
    remarks: string | null;
    legacy_case_10: boolean;
    legacy_case_11: boolean;
    legacy_case_15: boolean;
    legacy_case_17: boolean;
    legacy_case_20: boolean;
    legacy_case_21: boolean;
    legacy_case_22: boolean;
    legacy_case_23: boolean;
    legacy_student_code: string;
    legacy_school_name: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: string[]): TransformedRecord | null {
    const studentCode = row[0]?.trim() || '';
    const studentId = lookupStudent(studentCode);

    if (!studentId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: studentCode || 'null',
                school: row[16] || 'null',
                reason: `student ${studentCode} not found`,
            });
        }
        return null;
    }

    const schoolName = row[16]?.trim() || '';
    const entryYear = parseEntryYear(row[25] || '');

    return {
        student_id: studentId,
        school_id: lookupSchoolByName(schoolName),
        application: cleanString(row[1] || ''),
        entry_year: cleanString(row[25] || ''),
        entry_month: entryYear.month,
        entry_year_value: entryYear.year,
        // Checkbox mapping (columns 5-13 for main checkboxes)
        request_sent_to_parent: parseBool(row[5] || ''),   // SR
        passport_received: parseBool(row[6] || ''),        // PR
        passport_sent_to_school: parseBool(row[7] || ''),  // PS
        sent_visa_information: parseBool(row[8] || ''),    // SV
        cas_received: parseBool(row[9] || ''),             // CAS
        visa_granted: parseBool(row[10] || ''),            // VG - Note: using col 10
        visa_copy: parseBool(row[11] || ''),               // VC - Note: using col 11
        visa_copy_sent: parseBool(row[12] || ''),          // VCS
        appointment: parseBool(row[13] || ''),             // AP
        appointment_date: parseTimestamp(row[18] || ''),
        amount: parseDecimal(row[19] || ''),
        receipt: cleanString(row[24] || ''),
        remarks: cleanString(row[4] || ''),
        // Legacy checkboxes (additional columns)
        legacy_case_10: parseBool(row[14] || ''),
        legacy_case_11: parseBool(row[15] || ''),
        legacy_case_15: parseBool(row[17] || ''),
        legacy_case_17: parseBool(row[20] || ''),
        legacy_case_20: parseBool(row[21] || ''),
        legacy_case_21: parseBool(row[22] || ''),
        legacy_case_22: parseBool(row[23] || ''),
        legacy_case_23: false, // No more columns
        legacy_student_code: studentCode,
        legacy_school_name: cleanString(schoolName),
        assigned_to: lookupProfile(row[3] || ''),
        legacy_last_update: parseTimestamp(row[2] || ''),
    };
}

async function migrate() {
    console.log('🛂 Starting student visa migration...\n');

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
    const { data, errors } = Papa.parse<string[]>(csvContent, {
        delimiter: '|',
        skipEmptyLines: true,
    });

    if (errors.length > 0) {
        console.error('❌ Parse errors:', errors.slice(0, 5));
    }

    // Skip header row
    const rows = data.slice(1);
    console.log(`📊 Found ${rows.length} records\n`);

    // Process in batches
    let inserted = 0, failed = 0, valid = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const records = chunk
            .map(row => transformRow(row))
            .filter((r): r is TransformedRecord => r !== null);

        valid += records.length;

        if (!DRY_RUN && records.length > 0) {
            const { data: result, error } = await supabase
                .from('student_visas')
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
        console.log(`   Total rows: ${rows.length}`);
        console.log(`   Valid records: ${valid}`);
        console.log(`   Skipped: ${skippedRecords.length}`);
        console.log(`   Unmapped schools: ${unmappedSchools.size}`);

        if (unmappedSchools.size > 0) {
            console.log('\n⚠️  UNMAPPED SCHOOLS (top 20):');
            Array.from(unmappedSchools).slice(0, 20).forEach(s => console.log(`   - "${s}"`));
            if (unmappedSchools.size > 20) {
                console.log(`   ... and ${unmappedSchools.size - 20} more`);
            }
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student=${r.student_code}, school="${r.school}"`);
                console.log(`      → ${r.reason}`);
            });
        }

        // Write skipped to file
        const skippedPath = path.join(process.cwd(), 'data', 'student-visas-skipped.json');
        fs.writeFileSync(skippedPath, JSON.stringify({
            summary: {
                total_skipped: skippedRecords.length,
                unmapped_schools: Array.from(unmappedSchools),
            },
            skipped_records: skippedRecords.slice(0, 1000),
        }, null, 2));
        console.log(`\n📁 Skipped list saved to: ${skippedPath}`);
        console.log('\n🧪 DRY RUN COMPLETE\n');
    } else {
        console.log('✅ MIGRATION COMPLETE');
        console.log('═'.repeat(60));
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Failed: ${failed}`);
        console.log(`   Skipped: ${skippedRecords.length}`);
        console.log(`   Unmapped schools: ${unmappedSchools.size}`);
    }
}

migrate().catch(console.error);