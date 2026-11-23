/**
 * Data Migration Script: Import student brief intro from CSV
 *
 * Source: AA_Student_Brief_Intro.csv
 *
 * Usage:
 *   npx tsx scripts/25_migrate-student-brief-intro.ts --dry-run
 *   npx tsx scripts/25_migrate-student-brief-intro.ts
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
const BATCH_SIZE = 100; // Smaller batch for text-heavy data
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Brief_Intro.csv');

// Spoken English level mapping
const SPOKEN_ENGLISH_MAP: Record<string, string> = {
    'native': 'native',
    'fluent': 'fluent',
    'excellent': 'excellent',
    'very good': 'very_good',
    'good': 'good',
    'satisfactory to good': 'satisfactory_to_good',
    'fairly good': 'fairly_good',
    'satisfactory': 'satisfactory',
    'fair': 'fair',
    'basic': 'basic',
    'limited': 'limited',
};

// Lookup maps
let studentMap: Map<string, string> = new Map(); // student_code -> uuid
let spokenEnglishMap: Map<string, number> = new Map(); // code -> id
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid

// Track issues
interface SkippedRecord {
    student_code: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedSpokenEnglish = new Set<string>();

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Load students (by student_code)
    const { data: students } = await supabase
        .from('students')
        .select('id, student_code')
        .not('student_code', 'is', null)
        .limit(50000);
    students?.forEach(row => {
        if (row.student_code) studentMap.set(row.student_code, row.id);
    });
    console.log(`   ✅ students: ${studentMap.size}`);

    // Load spoken English levels
    const { data: levels } = await supabase
        .from('spoken_english_levels')
        .select('id, code')
        .limit(50);
    levels?.forEach(row => {
        if (row.code) spokenEnglishMap.set(row.code, row.id);
    });
    console.log(`   ✅ spoken_english_levels: ${spokenEnglishMap.size}`);

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

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupSpokenEnglish(level: string): number | null {
    if (!level || level.trim() === '') return null;

    // Normalize: lowercase, remove trailing periods, trim
    let normalized = level.toLowerCase().trim();
    if (normalized.endsWith('.')) {
        normalized = normalized.slice(0, -1).trim();
    }

    const code = SPOKEN_ENGLISH_MAP[normalized];
    if (!code) {
        unmappedSpokenEnglish.add(level.trim());
        return null;
    }
    return spokenEnglishMap.get(code) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    aa_id: string;
    spokeneng: string;
    hobbies: string;
    subject: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
}

interface TransformedRecord {
    student_id: string;
    spoken_english_id: number | null;
    legacy_spoken_english: string | null;
    hobbies: string | null;
    subjects: string | null;
    remarks: string | null;
    legacy_student_code: string;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: row.aa_id || 'null',
                reason: `student ${row.aa_id} not found`,
            });
        }
        return null;
    }

    return {
        student_id: studentId,
        spoken_english_id: lookupSpokenEnglish(row.spokeneng),
        legacy_spoken_english: cleanString(row.spokeneng),
        hobbies: cleanString(row.hobbies),
        subjects: cleanString(row.subject),
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('👤 Starting student brief intro migration...\n');

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
                .from('student_brief_intro')
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

        if (unmappedSpokenEnglish.size > 0) {
            console.log(`\n⚠️  UNMAPPED SPOKEN ENGLISH LEVELS (${unmappedSpokenEnglish.size}):`);
            Array.from(unmappedSpokenEnglish).slice(0, 20).forEach(s => console.log(`   - "${s}"`));
            if (unmappedSpokenEnglish.size > 20) {
                console.log(`   ... and ${unmappedSpokenEnglish.size - 20} more`);
            }
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student_code=${r.student_code}`);
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