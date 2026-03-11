/**
 * Data Migration Script: Import student officer assignments from CSV
 *
 * Source: AA_Student_Officer.csv
 * Records: ~111,600 consultant-student assignment records
 *
 * Notes:
 * - The "remarks" field often contains role info ("major", "minor") + additional notes
 * - Priority field has some non-numeric values ("N", "2.") that need cleaning
 * - Both S-prefixed (students) and T-prefixed records exist
 *
 * Usage:
 *   npx tsx scripts/28_migrate-student-officers.ts --dry-run
 *   npx tsx scripts/28_migrate-student-officers.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Officer.csv');

// Lookup maps
let studentMap: Map<string, string> = new Map(); // student_code -> uuid
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid
let roleMap: Map<string, number> = new Map(); // role code -> id

// Track issues
interface SkippedRecord {
    student_code: string;
    consultant: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedConsultants = new Set<string>();

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

    // Load profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null)
        .limit(1000);
    profiles?.forEach(row => {
        if (row.legacy_id) profileMap.set(row.legacy_id, row.id);
    });
    console.log(`   ✅ profiles: ${profileMap.size}`);

    // Load officer role types
    const { data: roles } = await supabase
        .from('officer_role_types')
        .select('id, code');
    roles?.forEach(row => {
        roleMap.set(row.code, row.id);
    });
    console.log(`   ✅ officer_role_types: ${roleMap.size}\n`);
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

function parsePriority(val: string): number {
    if (!val || val.trim() === '') return 1;
    const cleaned = val.trim().replace(/\.$/, ''); // Remove trailing dot ("2." -> "2")
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 1 : Math.max(1, num);
}

/**
 * Extract role (major/minor) from the remarks field.
 * The remarks field often contains "major", "minor", or variations like "Major", "majpr", etc.
 * along with additional freetext notes like consultant names.
 */
function extractRole(remarks: string): { roleId: number | null; cleanedRemarks: string | null } {
    if (!remarks || remarks.trim() === '') {
        return { roleId: null, cleanedRemarks: null };
    }

    const trimmed = remarks.trim();
    const lower = trimmed.toLowerCase();

    // Check if the entire field is just "major" or "minor" (with typos)
    const majorExact = /^(major|majpr|majer|kajor|major2)$/i.test(trimmed);
    const minorExact = /^(minor|minro)$/i.test(trimmed);

    if (majorExact) return { roleId: roleMap.get('major') || null, cleanedRemarks: null };
    if (minorExact) return { roleId: roleMap.get('minor') || null, cleanedRemarks: null };

    // Check if remarks START with major/minor (possibly followed by other notes)
    if (/^major\b/i.test(trimmed)) {
        const rest = trimmed.replace(/^major\s*/i, '').trim();
        return { roleId: roleMap.get('major') || null, cleanedRemarks: rest || null };
    }
    if (/^minor\b/i.test(trimmed)) {
        const rest = trimmed.replace(/^minor\s*/i, '').trim();
        return { roleId: roleMap.get('minor') || null, cleanedRemarks: rest || null };
    }

    // Check if remarks contain "(major)" or "(minor)" or "major" embedded
    if (/\bmajor\b/i.test(lower)) {
        const cleaned = trimmed.replace(/\(?\bmajor\b\)?\s*/gi, '').trim();
        return { roleId: roleMap.get('major') || null, cleanedRemarks: cleaned || null };
    }
    if (/\bminor\b/i.test(lower)) {
        const cleaned = trimmed.replace(/\(?\bminor\b\)?\s*/gi, '').trim();
        return { roleId: roleMap.get('minor') || null, cleanedRemarks: cleaned || null };
    }

    return { roleId: null, cleanedRemarks: trimmed };
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    aa_id: string;
    consultant: string;
    priority: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
}

interface TransformedRecord {
    student_id: string;
    consultant_id: string | null;
    priority: number;
    role_id: number | null;
    remarks: string | null;
    legacy_student_code: string;
    legacy_consultant_id: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: row.aa_id || 'null',
                consultant: row.consultant || '',
                reason: `student ${row.aa_id} not found`,
            });
        }
        return null;
    }

    const consultantId = lookupProfile(row.consultant);
    if (!consultantId && row.consultant?.trim()) {
        unmappedConsultants.add(row.consultant.trim());
    }

    const { roleId, cleanedRemarks } = extractRole(row.remarks);

    return {
        student_id: studentId,
        consultant_id: consultantId,
        priority: parsePriority(row.priority),
        role_id: roleId,
        remarks: cleanedRemarks,
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_consultant_id: cleanString(row.consultant),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('👤 Starting student officers migration...\n');

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
                .from('student_officers')
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

        if (unmappedConsultants.size > 0) {
            console.log(`\n⚠️  Unmapped consultants (${unmappedConsultants.size}):`);
            [...unmappedConsultants].slice(0, 10).forEach(c => console.log(`   - ${c}`));
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student_code=${r.student_code} consultant=${r.consultant}`);
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
        if (unmappedConsultants.size > 0) {
            console.log(`   ⚠️  Unmapped consultants: ${unmappedConsultants.size}`);
        }
    }
}

migrate().catch(console.error);