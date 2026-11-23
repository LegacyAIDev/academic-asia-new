/**
 * Data Migration Script: Import student event applications from CSV
 *
 * Source: AA_Student_Event_Application.csv
 *
 * Usage:
 *   npx tsx scripts/17_migrate-student-event-applications.ts --dry-run
 *   npx tsx scripts/17_migrate-student-event-applications.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Event_Application.csv');

// Lookup maps
let studentMap: Map<string, string> = new Map();
let eventNameMap: Map<string, string> = new Map(); // event name (uppercase) -> uuid
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    event: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
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

    // Load events by name (uppercase for matching)
    const { data: events } = await supabase
        .from('events')
        .select('id, name')
        .limit(10000);
    events?.forEach(row => {
        if (row.name) {
            eventNameMap.set(row.name.trim().toUpperCase(), row.id);
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

    // Handle YYYYMMDDHHMMSS format
    if (trimmed.length === 14 && /^\d{14}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
        const hour = trimmed.substring(8, 10), min = trimmed.substring(10, 12), sec = trimmed.substring(12, 14);
        if (year === '0000') return null;
        return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
    }

    // Handle YYYYMMDD format
    if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4), month = trimmed.substring(4, 6), day = trimmed.substring(6, 8);
        if (year === '0000') return null;
        return `${year}-${month}-${day} 00:00:00`;
    }

    return null;
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupEvent(eventName: string): string | null {
    if (!eventName || eventName.trim() === '') return null;
    const name = eventName.trim().toUpperCase();
    const uuid = eventNameMap.get(name);
    if (!uuid) unmappedEvents.add(eventName.trim());
    return uuid || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    aa_id: string;
    event: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    email_sent: string;
}

interface TransformedRecord {
    student_id: string;
    event_id: string | null;
    email_sent: boolean;
    remarks: string | null;
    legacy_student_code: string;
    legacy_event_name: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: row.aa_id || 'null',
                event: row.event || 'null',
                reason: `student ${row.aa_id} not found`,
            });
        }
        return null;
    }

    return {
        student_id: studentId,
        event_id: lookupEvent(row.event),
        email_sent: row.email_sent === 'Y',
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_event_name: cleanString(row.event),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('🎫 Starting student event applications migration...\n');

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
                .from('student_event_applications')
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
        console.log(`   With event linked: ${valid - unmappedEvents.size}`);
        console.log(`   Unmapped events: ${unmappedEvents.size}`);

        if (unmappedEvents.size > 0) {
            console.log('\n⚠️  UNMAPPED EVENTS (top 20):');
            Array.from(unmappedEvents).slice(0, 20).forEach(e => console.log(`   - "${e}"`));
            if (unmappedEvents.size > 20) {
                console.log(`   ... and ${unmappedEvents.size - 20} more`);
            }
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student=${r.student_code}, event="${r.event}"`);
                console.log(`      → ${r.reason}`);
            });
        }

        // Write skipped to file
        const skippedPath = path.join(process.cwd(), 'data', 'student-event-applications-skipped.json');
        fs.writeFileSync(skippedPath, JSON.stringify({
            summary: {
                total_skipped: skippedRecords.length,
                unmapped_events: Array.from(unmappedEvents),
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
        console.log(`   Unmapped events: ${unmappedEvents.size}`);
    }
}

migrate().catch(console.error);