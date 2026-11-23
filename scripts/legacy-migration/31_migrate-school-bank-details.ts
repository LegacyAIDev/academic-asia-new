/**
 * Data Migration Script: Import school bank details from CSV
 *
 * Source: AA_School_Bank.csv
 * Records: ~360 school banking records
 *
 * Notes:
 * - school_id in CSV is the numeric legacy ID → lookup via schools.legacy_id
 * - "ibankacc" field is actually the account holder/beneficiary name, NOT the IBAN number
 * - "ibanno" is the actual IBAN number
 * - "CH" currency mapped to "CHF" (Swiss Franc)
 *
 * Usage:
 *   npx tsx scripts/31_migrate-school-bank-details.ts --dry-run
 *   npx tsx scripts/31_migrate-school-bank-details.ts
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
const BATCH_SIZE = 200;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Bank.csv');

// Lookup maps
let schoolMap: Map<number, string> = new Map(); // legacy_id -> uuid
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid
let accountTypeMap: Map<string, number> = new Map(); // code -> id
let currencyMap: Map<string, number> = new Map(); // code -> id

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
    console.log(`   ✅ profiles: ${profileMap.size}`);

    // Load bank account types
    const { data: accountTypes } = await supabase
        .from('bank_account_types')
        .select('id, code, label');
    accountTypes?.forEach(row => {
        accountTypeMap.set(row.code, row.id);
        // Also map by label (lowercase) for CSV matching
        accountTypeMap.set(row.label.toLowerCase().trim(), row.id);
    });
    console.log(`   ✅ bank_account_types: ${accountTypeMap.size}`);

    // Load currencies
    const { data: currencies } = await supabase
        .from('currencies')
        .select('id, code');
    currencies?.forEach(row => {
        currencyMap.set(row.code, row.id);
    });
    console.log(`   ✅ currencies: ${currencyMap.size}\n`);
}

function cleanString(val: string): string | null {
    if (!val || val.trim() === '' || val.trim() === '.' || val.trim() === '-') return null;
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
    // Also handle YYYYMMDD (some records have short format)
    if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
        if (year === '0000') return null;
        return `${year}-${month}-${day} 00:00:00`;
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

function lookupAccountType(bankType: string): number | null {
    if (!bankType || bankType.trim() === '') return null;
    return accountTypeMap.get(bankType.toLowerCase().trim()) || null;
}

function lookupCurrency(currencyCode: string): number | null {
    if (!currencyCode || currencyCode.trim() === '') return null;
    let code = currencyCode.trim().toUpperCase();
    // Map legacy "CH" to "CHF"
    if (code === 'CH') code = 'CHF';
    return currencyMap.get(code) || null;
}

interface CsvRow {
    school_id: string;
    banktype: string;
    currency: string;
    bankname: string;
    bankacc: string;
    bankaddress: string;
    ibankacc: string;      // Account holder / beneficiary name (misleading column name)
    swift: string;
    sortcode: string;
    ibanno: string;         // Actual IBAN number
    remarks: string;
    lastupdate: string;
    staffid: string;
    billingname: string;
}

interface TransformedRecord {
    school_id: string;
    account_type_id: number | null;
    currency_id: number | null;
    bank_name: string | null;
    account_number: string | null;
    bank_address: string | null;
    account_holder: string | null;
    swift_code: string | null;
    sort_code: string | null;
    iban_number: string | null;
    billing_name: string | null;
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
        account_type_id: lookupAccountType(row.banktype),
        currency_id: lookupCurrency(row.currency),
        bank_name: cleanString(row.bankname),
        account_number: cleanString(row.bankacc),
        bank_address: cleanString(row.bankaddress),
        account_holder: cleanString(row.ibankacc),
        swift_code: cleanString(row.swift),
        sort_code: cleanString(row.sortcode),
        iban_number: cleanString(row.ibanno),
        billing_name: cleanString(row.billingname),
        remarks: cleanString(row.remarks),
        legacy_school_id: parseInt(row.school_id, 10) || 0,
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('🏦 Starting school bank details migration...\n');

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
                .from('school_bank_details')
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