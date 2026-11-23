/**
 * Data Migration Script: Import student pre-departure records from CSV
 *
 * Source: AA_Student_Predeparture.csv
 * Records: ~3,200 pre-departure briefing records
 *
 * Notes:
 * - Event names like "Pre-Departure Briefing 2014" are matched against the events table
 * - School names matched by case-insensitive lookup against schools table
 * - Flight details stored as free-text (too varied to normalize)
 * - WHG/Quest are boolean guardian service flags (same concept as student_travel)
 * - 393 records have empty event names (still imported with null event_id)
 *
 * Usage:
 *   npx tsx scripts/29_migrate-student-predeparture.ts --dry-run
 *   npx tsx scripts/29_migrate-student-predeparture.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Predeparture.csv');

// Lookup maps
let studentMap: Map<string, string> = new Map(); // student_code -> uuid
let schoolNameMap: Map<string, string> = new Map(); // school name (lowercase) -> uuid
let eventNameMap: Map<string, string> = new Map(); // event name (uppercase) -> uuid
let profileMap: Map<string, string> = new Map(); // legacy_id -> uuid

// Track issues
interface SkippedRecord {
    student_code: string;
    event: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedSchools = new Set<string>();
const unmappedEvents = new Set<string>();

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

    // Load schools by name
    const { data: schools } = await supabase
        .from('schools')
        .select('id, name')
        .limit(10000);
    schools?.forEach(row => {
        if (row.name) {
            schoolNameMap.set(row.name.toLowerCase().trim(), row.id);
        }
    });
    console.log(`   ✅ schools: ${schoolNameMap.size}`);

    // Load events by name (uppercase for matching, same pattern as student event applications)
    const { data: events } = await supabase
        .from('events')
        .select('id, name')
        .limit(10000);
    events?.forEach(row => {
        if (row.name) {
            eventNameMap.set(row.name.toUpperCase().trim(), row.id);
        }
    });
    console.log(`   ✅ events: ${eventNameMap.size}`);

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
    // Format: YYYYMMDD
    if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4);
        const month = trimmed.substring(4, 6);
        const day = trimmed.substring(6, 8);
        if (year === '0000') return null;
        return `${year}-${month}-${day}`;
    }
    return null;
}

function parseBool(val: string): boolean {
    return val?.trim() === '1';
}

function parseInt10(val: string): number {
    if (!val || val.trim() === '') return 0;
    const num = parseInt(val.trim(), 10);
    return isNaN(num) ? 0 : num;
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupSchool(name: string): string | null {
    if (!name || name.trim() === '') return null;
    return schoolNameMap.get(name.toLowerCase().trim()) || null;
}

function lookupEvent(name: string): string | null {
    if (!name || name.trim() === '') return null;
    return eventNameMap.get(name.toUpperCase().trim()) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    event: string;
    aa_id: string;
    school: string;
    email: string;
    seatrequest: string;
    seatassign: string;
    whg: string;
    quest: string;
    relatives: string;
    others: string;
    appdate: string;
    apptime: string;
    flightno: string;
    airline: string;
    arrivalairport: string;
    arrivaldate: string;
    terminal: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
}

interface TransformedRecord {
    student_id: string;
    school_id: string | null;
    event_id: string | null;
    email: string | null;
    seats_requested: number;
    seats_assigned: number;
    whg: boolean;
    quest: boolean;
    relatives: string | null;
    others: string | null;
    appointment_date: string | null;
    appointment_time: string | null;
    flight_number: string | null;
    airline: string | null;
    arrival_airport: string | null;
    arrival_date: string | null;
    terminal: string | null;
    remarks: string | null;
    legacy_student_code: string;
    legacy_event_name: string | null;
    legacy_school_name: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        skippedRecords.push({
            student_code: row.aa_id || 'null',
            event: row.event || '',
            reason: `student ${row.aa_id} not found`,
        });
        return null;
    }

    const schoolId = lookupSchool(row.school);
    if (!schoolId && row.school?.trim()) {
        unmappedSchools.add(row.school.trim());
    }

    const eventId = lookupEvent(row.event);
    if (!eventId && row.event?.trim()) {
        unmappedEvents.add(row.event.trim());
    }

    return {
        student_id: studentId,
        school_id: schoolId,
        event_id: eventId,
        email: cleanString(row.email),
        seats_requested: parseInt10(row.seatrequest),
        seats_assigned: parseInt10(row.seatassign),
        whg: parseBool(row.whg),
        quest: parseBool(row.quest),
        relatives: cleanString(row.relatives),
        others: cleanString(row.others),
        appointment_date: parseDate(row.appdate),
        appointment_time: cleanString(row.apptime),
        flight_number: cleanString(row.flightno),
        airline: cleanString(row.airline),
        arrival_airport: cleanString(row.arrivalairport),
        arrival_date: cleanString(row.arrivaldate),
        terminal: cleanString(row.terminal),
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_event_name: cleanString(row.event),
        legacy_school_name: cleanString(row.school),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('✈️  Starting student pre-departure migration...\n');

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
                .from('student_predeparture')
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

        if (unmappedEvents.size > 0) {
            console.log(`\n⚠️  Unmapped events (${unmappedEvents.size}):`);
            [...unmappedEvents].forEach(e => console.log(`   - ${e}`));
        }

        if (unmappedSchools.size > 0) {
            console.log(`\n⚠️  Unmapped schools (${unmappedSchools.size}):`);
            [...unmappedSchools].slice(0, 10).forEach(s => console.log(`   - ${s}`));
            if (unmappedSchools.size > 10) console.log(`   ... and ${unmappedSchools.size - 10} more`);
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student_code=${r.student_code} event=${r.event}`);
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
        if (unmappedEvents.size > 0) {
            console.log(`   ⚠️  Unmapped events: ${unmappedEvents.size}`);
        }
        if (unmappedSchools.size > 0) {
            console.log(`   ⚠️  Unmapped schools: ${unmappedSchools.size}`);
        }
    }
}

migrate().catch(console.error);