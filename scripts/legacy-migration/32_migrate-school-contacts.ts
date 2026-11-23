/**
 * Data Migration Script: Import school contacts from CSV
 *
 * Source: AA_School_Contact.csv
 * Records: ~3,820 school contact person records
 *
 * Notes:
 * - school_id in CSV is the numeric legacy ID → lookup via schools.legacy_id
 * - Priority field has "N" values (mapped to null) alongside numeric priorities
 * - "responsible" field is free-text with compound values (e.g. "Admissions & Expo")
 *   stored as-is since there are 40+ unique combinations
 * - Titles are varied ("Mr", "Mr.", "Mrs", "Mrs.", "Ms", "Ms.", "Dr", etc.)
 *   stored as-is and can be normalized in the UI layer
 *
 * Usage:
 *   npx tsx scripts/32_migrate-school-contacts.ts --dry-run
 *   npx tsx scripts/32_migrate-school-contacts.ts
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
const BATCH_SIZE = 300;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Contact.csv');

// Lookup maps
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid

// Track issues
interface SkippedRecord {
    school_id: string;
    name: string;
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
    if (!val || val.trim() === '' || val.trim() === '.' || val.trim() === '-' || val.trim() === '..') return null;
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

function parsePriority(val: string): number | null {
    if (!val || val.trim() === '' || val.trim().toUpperCase() === 'N') return null;
    const num = parseInt(val.trim(), 10);
    return isNaN(num) ? null : num;
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

function cleanGender(val: string): string | null {
    if (!val || val.trim() === '' || val.trim() === '.' || val.trim() === '-') return null;
    const upper = val.trim().toUpperCase();
    if (upper === 'M' || upper === 'F') return upper;
    return null;
}

interface CsvRow {
    school_id: string;
    contactposition: string;
    surname: string;
    firstname: string;
    title: string;
    gender: string;
    tel: string;
    mobile: string;
    fax: string;
    email1: string;
    email2: string;
    email3: string;
    address1: string;
    address2: string;
    priority: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    responsible: string;
}

interface TransformedRecord {
    school_id: string;
    position: string | null;
    surname: string | null;
    first_name: string | null;
    title: string | null;
    gender: string | null;
    telephone: string | null;
    mobile: string | null;
    fax: string | null;
    email_1: string | null;
    email_2: string | null;
    email_3: string | null;
    address_1: string | null;
    address_2: string | null;
    priority: number | null;
    responsible: string | null;
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
            name: `${row.firstname || ''} ${row.surname || ''}`.trim(),
            reason: `school legacy_id ${row.school_id} not found`,
        });
        return null;
    }

    return {
        school_id: schoolId,
        position: cleanString(row.contactposition),
        surname: cleanString(row.surname),
        first_name: cleanString(row.firstname),
        title: cleanString(row.title),
        gender: cleanGender(row.gender),
        telephone: cleanString(row.tel),
        mobile: cleanString(row.mobile),
        fax: cleanString(row.fax),
        email_1: cleanString(row.email1),
        email_2: cleanString(row.email2),
        email_3: cleanString(row.email3),
        address_1: cleanString(row.address1),
        address_2: cleanString(row.address2),
        priority: parsePriority(row.priority),
        responsible: cleanString(row.responsible),
        remarks: cleanString(row.remarks),
        legacy_school_id: parseInt(row.school_id, 10) || 0,
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('📇 Starting school contacts migration...\n');

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
                .from('school_contacts')
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
                console.log(`   ${i + 1}. school_id=${r.school_id} name=${r.name}`);
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