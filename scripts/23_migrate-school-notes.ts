/**
 * Data Migration Script: Import school notes from CSV
 *
 * Source: AA_School_Note.csv
 *
 * Usage:
 *   npx tsx scripts/23_migrate-school-notes.ts --dry-run
 *   npx tsx scripts/23_migrate-school-notes.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Note.csv');

// Note category mapping
const CATEGORY_MAP: Record<string, string> = {
    'school': 'school',
    'academic': 'academic',
    'al subjects': 'al_subjects',
    'accommodation': 'accommodation',
    'sports': 'sports',
    'activities': 'activities',
    'music': 'music',
    'application procedure': 'application_procedure',
    'aa only': 'aa_only',
    'scholarship': 'scholarship',
    'ukiset': 'ukiset',
    'feature': 'feature',
    'isi': 'isi',
    'alumni': 'alumni',
    'competition': 'competition',
    'university destination': 'university_destination',
    'nationality mix': 'nationality_mix',
    'portrait': 'portrait',
    'early entry scheme': 'early_entry_scheme',
    'visit': 'visit',
    'selected school list remark_eng': 'selected_school_list_remark_eng',
    'selected school list remark_chi': 'selected_school_list_remark_chi',
    'others': 'others',
};

// Lookup maps
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let categoryMap: Map<string, number> = new Map(); // code -> id
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid

// Track issues
interface SkippedRecord {
    school_id: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedCategories = new Set<string>();

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

    // Load note categories
    const { data: categories } = await supabase
        .from('school_note_categories')
        .select('id, code')
        .limit(50);
    categories?.forEach(row => {
        if (row.code) categoryMap.set(row.code, row.id);
    });
    console.log(`   ✅ school_note_categories: ${categoryMap.size}`);

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
    return schoolMap.get(id) || null;
}

function lookupCategory(categoryName: string): number | null {
    if (!categoryName || categoryName.trim() === '') return null;
    const lower = categoryName.toLowerCase().trim();
    const code = CATEGORY_MAP[lower];
    if (!code) {
        unmappedCategories.add(categoryName);
        return null;
    }
    return categoryMap.get(code) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    school_id: string;
    detailtype: string;
    detail: string;
    case: string;
    lastupdate: string;
    staffid: string;
}

interface TransformedRecord {
    school_id: string;
    category_id: number | null;
    detail: string | null;
    is_flagged: boolean;
    legacy_school_id: number;
    legacy_category: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const schoolId = lookupSchool(row.school_id);

    if (!schoolId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                school_id: row.school_id || 'null',
                reason: `school ${row.school_id} not found`,
            });
        }
        return null;
    }

    return {
        school_id: schoolId,
        category_id: lookupCategory(row.detailtype),
        detail: cleanString(row.detail),
        is_flagged: row.case === 'Y',
        legacy_school_id: parseInt(row.school_id, 10) || 0,
        legacy_category: cleanString(row.detailtype),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('📝 Starting school notes migration...\n');

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
                .from('school_notes')
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

        if (unmappedCategories.size > 0) {
            console.log('\n⚠️  UNMAPPED CATEGORIES:');
            Array.from(unmappedCategories).forEach(c => console.log(`   - "${c}"`));
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. school_id=${r.school_id}`);
                console.log(`      → ${r.reason}`);
            });
        }

        // Sample transformed records
        console.log('\n📝 Sample transformed records:');
        const samples = data.slice(0, 3).map(transformRow).filter(r => r !== null);
        samples.forEach((r, i) => {
            const detailPreview = r?.detail?.substring(0, 60) + (r?.detail && r.detail.length > 60 ? '...' : '');
            console.log(`   ${i + 1}. [${r?.legacy_category}] ${detailPreview}`);
        });

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