/**
 * Data Migration Script: Import AA_Test bookings into student_individual_exams
 *
 * Source: AA_Test_1.txt + AA_Test_2.txt (pipe-delimited)
 *
 * The legacy AA_Test table stores one row per 15-min timeslot. A single exam
 * session for one student might span 6+ slots (= 90 minutes). This script
 * collapses 811K slot rows into ~19K session records by grouping on
 * (date, student, type, school).
 *
 * Timeslot mapping: Slot 1 = 09:00, Slot 2 = 09:15, ... (15-min intervals from 9am)
 *
 * Usage:
 *   npx tsx scripts/27_migrate-aa-test.ts --dry-run
 *   npx tsx scripts/27_migrate-aa-test.ts --dry-run --limit 50
 *   npx tsx scripts/27_migrate-aa-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_INDEX = args.indexOf('--limit');
const LIMIT = LIMIT_INDEX !== -1 ? parseInt(args[LIMIT_INDEX + 1], 10) : null;

if (DRY_RUN) console.log('🧪 DRY RUN MODE\n');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY!;

const BATCH_SIZE = 100;
const DATA_DIR = path.join(process.cwd(), 'data');

const SOURCE_FILES = ['AA_Test_1.txt', 'AA_Test_2.txt'];

// Timeslot to time: Slot 1 = 09:00, 15-min intervals
const SLOT_START_HOUR = 9;
const SLOT_MINUTES = 15;

function slotToTime(slot: number): string {
    const totalMinutes = (slot - 1) * SLOT_MINUTES;
    const hours = SLOT_START_HOUR + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// ============================================================================
// TYPE MAPPING
// ============================================================================

// Legacy aatesttype → individual_exam_types.code
const TYPE_MAP: Record<string, string> = {
    'aa test':      'aa_test',
    'redo aa':      'aa_test',
    'exam':         'entrance_exam',
    'school':       'entrance_exam',
    'online test':  'entrance_exam',    // entrance exam done online
    'video interview': 'interview',
    'skype':        'interview',
    'meeting':      'interview',
    'noskype/online/indi.': 'interview',
};

// Legacy aatestaction → exam_booking_statuses.code
const ACTION_MAP: Record<string, string> = {
    'show up': 'completed',
    'no show': 'cancelled',
    '':        'completed',   // empty = historical, already happened
};

// Delivery mode: derive from test type
const ONLINE_TYPES = new Set(['online test', 'video interview', 'skype', 'noskype/online/indi.']);

// ============================================================================
// LOOKUP MAPS
// ============================================================================

let studentMap: Map<string, string> = new Map();    // student_code -> uuid
let schoolMap: Map<number, string> = new Map();     // legacy_id -> uuid
let examTypeMap: Map<string, number> = new Map();   // code -> id
let statusMap: Map<string, number> = new Map();     // code -> id
let deliveryModeMap: Map<string, number> = new Map(); // code -> id

const unmappedValues = {
    students: new Set<string>(),
    schools: new Set<string>(),
    types: new Set<string>(),
};

// Cap skipped record tracking
const MAX_SKIPPED = 10000;
interface SkippedRecord { key: string; reason: string; }
const skippedRecords: SkippedRecord[] = [];

// ============================================================================
// LOAD LOOKUP TABLES
// ============================================================================

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Students — need all, paginate
    let allStudents: Array<{ id: string; student_code: string }> = [];
    let from = 0;
    const PAGE = 10000;
    while (true) {
        const { data } = await supabase
            .from('students')
            .select('id, student_code')
            .not('student_code', 'is', null)
            .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        allStudents.push(...data);
        from += PAGE;
        if (data.length < PAGE) break;
    }
    allStudents.forEach(row => {
        if (row.student_code) studentMap.set(row.student_code, row.id);
    });
    console.log(`   ✅ students: ${studentMap.size}`);

    // Schools
    const { data: schools } = await supabase
        .from('schools')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null)
        .limit(10000);
    schools?.forEach(row => {
        if (row.legacy_id) schoolMap.set(row.legacy_id, row.id);
    });
    console.log(`   ✅ schools: ${schoolMap.size}`);

    // Individual exam types
    const { data: examTypes } = await supabase
        .from('individual_exam_types')
        .select('id, code');
    examTypes?.forEach(row => examTypeMap.set(row.code, row.id));
    console.log(`   ✅ individual_exam_types: ${examTypeMap.size}`);

    // Booking statuses
    const { data: statuses } = await supabase
        .from('exam_booking_statuses')
        .select('id, code');
    statuses?.forEach(row => statusMap.set(row.code, row.id));
    console.log(`   ✅ exam_booking_statuses: ${statusMap.size}`);

    // Delivery modes
    const { data: deliveryModes } = await supabase
        .from('delivery_modes')
        .select('id, code');
    deliveryModes?.forEach(row => deliveryModeMap.set(row.code, row.id));
    console.log(`   ✅ delivery_modes: ${deliveryModeMap.size}`);

    console.log('');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cleanString(val: string | undefined): string | null {
    if (!val || val.trim() === '' || val.trim() === '.') return null;
    return val.trim();
}

function parseDate(dateStr: string | undefined): string | null {
    if (!dateStr || dateStr.trim() === '') return null;
    const trimmed = dateStr.trim();
    if (trimmed.length === 8 && /^\d{8}$/.test(trimmed)) {
        const year = trimmed.substring(0, 4);
        const month = trimmed.substring(4, 6);
        const day = trimmed.substring(6, 8);
        if (year === '0000' || month === '00' || day === '00') return null;
        return `${year}-${month}-${day}`;
    }
    return null;
}

// ============================================================================
// SESSION GROUPING
// ============================================================================

interface RawRow {
    aatestdate: string;
    aatesttimeslot: string;
    aa_id: string;
    room: string;
    seatsno: string;
    remarks: string;
    aatesttype: string;
    aatestaction: string;
    school_id: string;
}

interface Session {
    date: string;
    studentCode: string;
    testType: string;
    schoolLegacyId: number;
    minSlot: number;
    maxSlot: number;
    room: string | null;
    seatNo: number | null;
    remarks: string | null;
    action: string;
}

function groupIntoSessions(rows: RawRow[]): Session[] {
    // Key: date|student|type|school
    const groups = new Map<string, RawRow[]>();

    for (const row of rows) {
        const studentCode = row.aa_id?.trim();
        if (!studentCode) continue; // Skip rows with no student

        const key = `${row.aatestdate?.trim()}|${studentCode}|${row.aatesttype?.trim()}|${row.school_id?.trim()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
    }

    const sessions: Session[] = [];

    for (const [, groupRows] of groups) {
        const first = groupRows[0];
        const slots = groupRows
            .map(r => parseInt(r.aatesttimeslot, 10))
            .filter(n => !isNaN(n));

        if (slots.length === 0) continue;

        let minSlot = slots[0];
        let maxSlot = slots[0];
        for (let i = 1; i < slots.length; i++) {
            if (slots[i] < minSlot) minSlot = slots[i];
            if (slots[i] > maxSlot) maxSlot = slots[i];
        }

        const schoolId = parseInt(first.school_id?.trim() || '0', 10);
        const seatNo = parseInt(first.seatsno?.trim() || '0', 10);

        // Take the action from rows that have one (most rows are empty)
        const actions = groupRows
            .map(r => r.aatestaction?.trim().toLowerCase() || '')
            .filter(a => a !== '');
        const action = actions.length > 0 ? actions[0] : '';

        sessions.push({
            date: first.aatestdate?.trim(),
            studentCode: first.aa_id?.trim(),
            testType: (first.aatesttype?.trim() || '').toLowerCase(),
            schoolLegacyId: isNaN(schoolId) ? 0 : schoolId,
            minSlot,
            maxSlot,
            room: cleanString(first.room),
            seatNo: seatNo > 0 ? seatNo : null,
            remarks: cleanString(first.remarks),
            action,
        });
    }

    return sessions;
}

// ============================================================================
// TRANSFORM SESSION → INSERT RECORD
// ============================================================================

interface TransformedRecord {
    student_id: string;
    exam_type_id: number;
    school_id: string | null;
    subject: string | null;
    apply_year: string | null;
    duration_minutes: number;
    preferred_date: string | null;
    preferred_start_time: string | null;
    end_time_calculated: string | null;
    delivery_mode_id: number | null;
    location: string;
    room: string | null;
    seat_no: number | null;
    status_id: number;
    confirmed_date: string | null;
    confirmed_start_time: string | null;
    confirmed_end_time: string | null;
    remarks: string | null;
    legacy_student_code: string;
    legacy_test_type: string;
    legacy_action: string;
}

function transformSession(session: Session): TransformedRecord | null {
    // Student lookup
    const studentId = studentMap.get(session.studentCode);
    if (!studentId) {
        if (unmappedValues.students.size < MAX_SKIPPED) unmappedValues.students.add(session.studentCode);
        if (skippedRecords.length < MAX_SKIPPED) {
            skippedRecords.push({ key: session.studentCode, reason: 'Student not found' });
        }
        return null;
    }

    // Exam type mapping
    const typeCode = TYPE_MAP[session.testType];
    if (!typeCode) {
        // Skip 'others' and empty types — likely blank scheduler blocks
        if (session.testType !== 'others' && session.testType !== '') {
            if (unmappedValues.types.size < MAX_SKIPPED) unmappedValues.types.add(session.testType);
        }
        if (skippedRecords.length < MAX_SKIPPED) {
            skippedRecords.push({ key: `${session.studentCode}|${session.testType}`, reason: `Unmapped type: "${session.testType}"` });
        }
        return null;
    }

    const examTypeId = examTypeMap.get(typeCode);
    if (!examTypeId) return null;

    // School lookup (only for types that need it)
    let schoolId: string | null = null;
    if (session.schoolLegacyId > 0) {
        schoolId = schoolMap.get(session.schoolLegacyId) || null;
        if (!schoolId) {
            if (unmappedValues.schools.size < MAX_SKIPPED) unmappedValues.schools.add(String(session.schoolLegacyId));
        }
    }

    // Status mapping
    const statusCode = ACTION_MAP[session.action] || 'completed';
    const statusId = statusMap.get(statusCode) || statusMap.get('completed')!;

    // Time calculations
    const date = parseDate(session.date);
    const startTime = slotToTime(session.minSlot);
    // End time = start of last slot + 15 min
    const endTime = slotToTime(session.maxSlot + 1);
    const durationMinutes = (session.maxSlot - session.minSlot + 1) * SLOT_MINUTES;

    // Delivery mode
    const isOnline = ONLINE_TYPES.has(session.testType);
    const deliveryModeId = deliveryModeMap.get(isOnline ? 'online' : 'in_person') || null;

    return {
        student_id: studentId,
        exam_type_id: examTypeId,
        school_id: schoolId,
        subject: null,          // Not in legacy AA_Test (subjects are in AA_Student_Exam_Result)
        apply_year: null,       // Not in legacy AA_Test
        duration_minutes: durationMinutes,
        preferred_date: date,   // Legacy has no preferred vs confirmed — use same date
        preferred_start_time: startTime,
        end_time_calculated: endTime,
        delivery_mode_id: deliveryModeId,
        location: 'AA Office',
        room: session.room,
        seat_no: session.seatNo,
        status_id: statusId,
        confirmed_date: date,   // Legacy = already confirmed
        confirmed_start_time: startTime,
        confirmed_end_time: endTime,
        remarks: session.remarks,
        legacy_student_code: session.studentCode,
        legacy_test_type: session.testType,
        legacy_action: session.action,
    };
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================

async function migrate() {
    console.log('🧪 Starting AA_Test → student_individual_exams migration...\n');

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`🔌 Connected to: ${SUPABASE_URL}\n`);
    await loadLookupTables(supabase);

    // ========================================================================
    // Read all source files
    // ========================================================================

    console.log('📂 Reading source files...\n');

    const allRows: RawRow[] = [];
    for (const file of SOURCE_FILES) {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) {
            console.warn(`   ⚠️  Not found: ${file}`);
            continue;
        }
        const csv = fs.readFileSync(filePath, 'utf-8');
        const { data } = Papa.parse<RawRow>(csv, {
            header: true,
            delimiter: '|',
            skipEmptyLines: true,
        });
        console.log(`   📄 ${file}: ${data.length.toLocaleString()} rows`);
        for (const row of data) {
            allRows.push(row);
        }
    }

    console.log(`\n   Total rows: ${allRows.length.toLocaleString()}`);

    // ========================================================================
    // Group into sessions
    // ========================================================================

    console.log('\n🔄 Collapsing timeslots into sessions...\n');

    const sessions = groupIntoSessions(allRows);
    console.log(`   Sessions: ${sessions.length.toLocaleString()}`);

    // Breakdown by type
    const typeCounts: Record<string, number> = {};
    for (const s of sessions) {
        typeCounts[s.testType || '(empty)'] = (typeCounts[s.testType || '(empty)'] || 0) + 1;
    }
    console.log('\n   By type:');
    for (const [t, c] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
        const mapped = TYPE_MAP[t] || 'SKIP';
        console.log(`     ${t.padEnd(25)} ${c.toString().padStart(6)} → ${mapped}`);
    }

    // ========================================================================
    // Transform
    // ========================================================================

    console.log('\n🔄 Transforming sessions...\n');

    let records = sessions
        .map(s => transformSession(s))
        .filter((r): r is TransformedRecord => r !== null);

    if (LIMIT && LIMIT > 0) {
        records = records.slice(0, LIMIT);
        console.log(`   ⚠️  Limited to ${LIMIT} records`);
    }

    console.log(`   Valid records: ${records.length.toLocaleString()}`);
    console.log(`   Skipped: ${skippedRecords.length.toLocaleString()}`);

    // ========================================================================
    // DRY RUN
    // ========================================================================

    if (DRY_RUN) {
        console.log('\n' + '═'.repeat(60));
        console.log('📋 SAMPLE RECORDS');
        console.log('═'.repeat(60));

        // Show one of each type
        const shown = new Set<number>();
        for (const r of records) {
            if (!shown.has(r.exam_type_id)) {
                shown.add(r.exam_type_id);
                console.log(`\n--- exam_type_id: ${r.exam_type_id} ---`);
                console.log(JSON.stringify(r, null, 2));
            }
            if (shown.size >= 4) break;
        }

        // Stats
        console.log('\n' + '═'.repeat(60));
        console.log('📊 SUMMARY');
        console.log('═'.repeat(60));

        const byType: Record<number, number> = {};
        const byStatus: Record<number, number> = {};
        let withSchool = 0;
        for (const r of records) {
            byType[r.exam_type_id] = (byType[r.exam_type_id] || 0) + 1;
            byStatus[r.status_id] = (byStatus[r.status_id] || 0) + 1;
            if (r.school_id) withSchool++;
        }

        console.log('\n   By exam type:');
        for (const [id, c] of Object.entries(byType)) {
            console.log(`     type_id ${id}: ${c.toLocaleString()}`);
        }

        console.log('\n   By status:');
        for (const [id, c] of Object.entries(byStatus)) {
            console.log(`     status_id ${id}: ${c.toLocaleString()}`);
        }

        console.log(`\n   With school: ${withSchool.toLocaleString()}`);
        console.log(`   Without school: ${(records.length - withSchool).toLocaleString()}`);

        console.log('\n   ⚠️  Unmapped:');
        console.log(`     students: ${unmappedValues.students.size}`);
        console.log(`     schools: ${unmappedValues.schools.size}`);
        console.log(`     types: ${unmappedValues.types.size}`);
        if (unmappedValues.types.size > 0) {
            console.log(`     type values: ${[...unmappedValues.types].join(', ')}`);
        }

        // Write preview
        const previewPath = path.join(DATA_DIR, 'aa-test-migration-preview.json');
        fs.writeFileSync(previewPath, JSON.stringify({
            summary: { total_rows: allRows.length, sessions: sessions.length, valid_records: records.length },
            by_type: byType,
            by_status: byStatus,
            unmapped: {
                students: unmappedValues.students.size,
                schools: unmappedValues.schools.size,
                types: [...unmappedValues.types],
            },
            sample_records: records.slice(0, 20),
        }, null, 2));
        console.log(`\n   📁 Preview: ${previewPath}`);
        console.log('\n🧪 DRY RUN COMPLETE\n');
        return;
    }

    // ========================================================================
    // INSERT
    // ========================================================================

    let inserted = 0;
    let failed = 0;
    const errorLog: Array<{ batch: number; error: string; sample: any }> = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        const { data: result, error } = await supabase
            .from('student_individual_exams')
            .insert(batch)
            .select('id');

        if (error) {
            console.error(`\n❌ Batch ${batchNum}:`, error.message);
            errorLog.push({ batch: batchNum, error: error.message, sample: batch[0] });
            failed += batch.length;
        } else {
            inserted += result?.length || 0;
            process.stdout.write(`\r⏳ ${inserted.toLocaleString()}/${records.length.toLocaleString()}`);
        }
    }

    // ========================================================================
    // REPORT
    // ========================================================================

    console.log('\n\n' + '═'.repeat(50));
    console.log(`✅ Migration complete!`);
    console.log(`   Inserted: ${inserted.toLocaleString()}`);
    console.log(`   Failed: ${failed.toLocaleString()}`);
    console.log(`   Skipped: ${skippedRecords.length.toLocaleString()}`);
    console.log('═'.repeat(50));

    console.log('\n⚠️  Unmapped values:');
    console.log(`   students: ${unmappedValues.students.size}`);
    console.log(`   schools: ${unmappedValues.schools.size}`);
    console.log(`   types: ${unmappedValues.types.size}`);

    if (errorLog.length > 0) {
        const reportPath = path.join(DATA_DIR, 'aa-test-migration-errors.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: { inserted, failed, skipped: skippedRecords.length },
            errors: errorLog,
        }, null, 2));
        console.log(`\n📁 Error report: ${reportPath}`);
    }
}

migrate().catch(console.error);