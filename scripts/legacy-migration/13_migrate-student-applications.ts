/**
 * Data Migration Script: Import student applications from CSV files
 *
 * Sources:
 *   - AA_Student_SA.csv (current applications)
 *   - AA_Student_SA_History.csv (archived applications)
 *
 * Usage:
 *   npx tsx scripts/13_migrate-student-applications.ts --dry-run
 *   npx tsx scripts/13_migrate-student-applications.ts
 *   npx tsx scripts/13_migrate-student-applications.ts --history-only
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HISTORY_ONLY = args.includes('--history-only');

if (DRY_RUN) console.log('🧪 DRY RUN MODE\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
const BATCH_SIZE = 500;
const DATA_DIR = path.join(process.cwd(), 'data');

// ============================================================================
// STATUS MAPPING (CSV value -> code)
// ============================================================================

const STATUS_MAP: Record<string, string> = {
    'Awaiting AA Test': 'awaiting_aa_test',
    'Awaiting Exam Paper': 'awaiting_exam_paper',
    'Awaiting Expo Result': 'awaiting_expo_result',
    'Awaiting Interview': 'awaiting_interview',
    'Awaiting Interview (WL)': 'awaiting_interview_wl',
    'Awaiting Interview (Reg)': 'awaiting_interview_reg',
    'Awaiting Offer': 'awaiting_offer',
    'Awaiting Offer wo Reg': 'awaiting_offer_wo_reg',
    'Awaiting Response (S)': 'awaiting_response_s',
    'Awaiting Response (P)': 'awaiting_response_p',
    'Awaiting School after UKiset': 'awaiting_school_after_ukiset',
    'Awaiting Testing': 'awaiting_testing',
    'Awaiting Testing after Deposit': 'awaiting_testing_after_deposit',
    'Awaiting Testing after Offered': 'awaiting_testing_after_offered',
    'Awaiting Testing wo Reg': 'awaiting_testing_wo_reg',
    'Awaiting TS Result': 'awaiting_ts_result',
    'Offered': 'offered',
    'Offered (C)': 'offered_c',
    'Offered wo Reg': 'offered_wo_reg',
    'Offered without Reg': 'offered_without_reg',
    'Offered-scholarship': 'offered_scholarship',
    'DEPOSITED': 'deposited',
    'DEPOSITED-Cond': 'deposited_cond',
    'DEPOSITED-Cond-cfmed': 'deposited_cond_cfmed',
    'DEPOSITED-Scholarship': 'deposited_scholarship',
    'DEPOSITED-Scholarship (C)': 'deposited_scholarship_c',
    'Waiting List': 'waiting_list',
    'Waiting List after Exam': 'waiting_list_after_exam',
    'Completed': 'completed',
    'Confirmed': 'confirmed',
    'Proceed': 'proceed',
    'Proceed after UKiset': 'proceed_after_ukiset',
    'Result Received': 'result_received',
    'Joined School but Left After': 'joined_school_left_after',
    'Rejected': 'rejected',
    'Declined': 'declined',
    'Withdrawn': 'withdrawn',
    'Drop': 'drop',
    'Cannot Proceed': 'cannot_proceed',
    'TNFA': 'tnfa',
    'No Show-Interview': 'no_show_interview',
    'FULL': 'full',
    'FULL-check later': 'full_check_later',
    'FULL-WL': 'full_wl',
    'General Enquiry': 'general_enquiry',
    'Check Place': 'check_place',
    'Hold': 'hold',
    'Remind P': 'remind_p',
    'Test Only (Refer)': 'test_only_refer',
    'Re-assess after Exam': 're_assess_after_exam',
};

const SUB_STATUS_MAP: Record<string, string> = {
    'Scholarship-Academic Scholarship': 'scholarship_academic',
    'Scholarship-Music Scholarship': 'scholarship_music',
    'Scholarship-Music Exhibition': 'scholarship_music_exhibition',
    'Scholarship-Academic Exhibition': 'scholarship_academic_exhibition',
    'Scholarship-Sports Scholarship': 'scholarship_sports',
    'Scholarship-Art Scholarship': 'scholarship_art',
    'Scholarship-Boarding Scholarship': 'scholarship_boarding',
    'Scholarship-Academic & Music Scholarship': 'scholarship_academic_music',
    'Scholarship-Academic Scholarship & Music Exhibition': 'scholarship_academic_music_ex',
    'Scholarship-Academic Exhibition & Music Scholarship': 'scholarship_academic_ex_music',
    'Scholarship-Art and Music Scholarship': 'scholarship_art_music',
    'Scholarship-Academic & Music Exhibition': 'scholarship_academic_music_exhibition',
    'Scholarship-Conditional-Cfmed': 'scholarship_conditional_cfmed',
    'Other Awards': 'other_awards',
    'Conditional': 'conditional',
    'Conditional-Cfmed': 'conditional_cfmed',
    'Conditional Offer': 'conditional_offer',
    'Awaiting Exam Paper': 'awaiting_exam_paper',
    'Await Offer Letter': 'await_offer_letter',
    'Without Offer Letter': 'without_offer_letter',
    'Await UKiset': 'await_ukiset',
    'Check Later (select date)': 'check_later',
    'check place': 'check_place',
    'Informed school': 'informed_school',
    'Student info emailed school': 'student_info_emailed_school',
    'Decided not to sit for exam': 'decided_not_to_sit_exam',
    'Regff sent by email & reg post (bankers draft or cheque)': 'regff_sent_email_post',
    'Regff sent and await UKiset': 'regff_sent_await_ukiset',
    'exam papers sent by email and air mail': 'exam_papers_email_airmail',
    'exam papers sent by email and courier': 'exam_papers_email_courier',
    'exam papers BULK sent by courier': 'exam_papers_bulk_courier',
    'Normal': 'normal',
    'Summer': 'summer',
};

// Course name mapping
const COURSE_MAP: Record<string, string> = {
    'Nursery': 'nursery', 'Pre-Kindergarten': 'pre_kindergarten', 'Pre-Prep': 'pre_prep',
    'Reception': 'reception', 'Year 1': 'year_1', 'Year 2': 'year_2', 'Year 3': 'year_3',
    'Year 4': 'year_4', 'Year 5': 'year_5', 'Year 6': 'year_6', 'Year 7': 'year_7',
    'Year 8': 'year_8', 'Year 9': 'year_9', 'Year 10': 'year_10', 'Year 11': 'year_11',
    'Year 12': 'year_12', 'Year 13': 'year_13',
    '1 Year GCSE': '1_year_gcse', '1-Year GCSE': '1_year_gcse',
    '1 Year IGCSE': '1_year_igcse', '1-Year IGCSE': '1_year_igcse',
    '1 Year AL': '1_year_al', '1-Year AL': '1_year_al', '1 Year A-level': '1_year_al',
    '18 months AL': '18_months_al', '3 Years AL': '3_year_al', '3-Year AL': '3_year_al',
    'Pre-AL': 'pre_al', 'A Level': 'a_level',
    'IB': 'ib', 'Pre-IB': 'pre_ib',
    'Foundation': 'foundation', 'International Foundation': 'international_foundation',
    'International Foundation Year': 'international_foundation_year',
    'Summer': 'summer', 'English': 'english', 'BTEC': 'btec',
};

// Lookup maps
let studentMap: Map<string, string> = new Map();
let schoolMap: Map<number, string> = new Map();
let courseMap: Map<string, number> = new Map();
let statusMap: Map<string, number> = new Map();
let subStatusMap: Map<string, number> = new Map();
let eventNameMap: Map<string, string> = new Map();
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    school_id: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedStatuses = new Set<string>();
const unmappedSubStatuses = new Set<string>();
const unmappedCourses = new Set<string>();
const unmappedEvents = new Set<string>();

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

    // Load students (need all)
    const { data: students } = await supabase
        .from('students')
        .select('id, student_code')
        .not('student_code', 'is', null)
        .limit(50000);
    students?.forEach(row => {
        if (row.student_code) studentMap.set(row.student_code, row.id);
    });
    console.log(`   ✅ students: ${studentMap.size}`);

    // Load schools
    const { data: schools } = await supabase
        .from('schools')
        .select('id, legacy_id')
        .not('legacy_id', 'is', null)
        .limit(10000);
    schools?.forEach(row => {
        if (row.legacy_id) schoolMap.set(row.legacy_id, row.id);
    });
    console.log(`   ✅ schools: ${schoolMap.size}`);

    // Load courses
    const { data: courses } = await supabase
        .from('courses')
        .select('id, code')
        .limit(500);
    courses?.forEach(row => {
        if (row.code) courseMap.set(row.code, row.id);
    });
    console.log(`   ✅ courses: ${courseMap.size}`);

    // Load statuses
    const { data: statuses } = await supabase
        .from('application_statuses')
        .select('id, code')
        .limit(100);
    statuses?.forEach(row => {
        if (row.code) statusMap.set(row.code, row.id);
    });
    console.log(`   ✅ application_statuses: ${statusMap.size}`);

    // Load sub-statuses
    const { data: subStatuses } = await supabase
        .from('application_sub_statuses')
        .select('id, code')
        .limit(100);
    subStatuses?.forEach(row => {
        if (row.code) subStatusMap.set(row.code, row.id);
    });
    console.log(`   ✅ application_sub_statuses: ${subStatusMap.size}`);

    // Load events by name (uppercase for matching)
    const { data: events } = await supabase
        .from('events')
        .select('id, name')
        .limit(10000);
    events?.forEach(row => {
        if (row.name) eventNameMap.set(row.name.trim().toUpperCase(), row.id);
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

function parseDecimal(val: string): number | null {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupSchool(legacyId: string): string | null {
    const id = parseInt(legacyId, 10);
    if (isNaN(id)) return null;
    return schoolMap.get(id) || null;
}

function lookupCourse(courseName: string): number | null {
    if (!courseName || courseName.trim() === '') return null;
    const name = courseName.trim();
    const code = COURSE_MAP[name];
    if (!code) {
        unmappedCourses.add(name);
        return null;
    }
    return courseMap.get(code) || null;
}

function lookupStatus(statusLabel: string): number | null {
    if (!statusLabel || statusLabel.trim() === '') return null;
    const label = statusLabel.trim();
    const code = STATUS_MAP[label];
    if (!code) {
        unmappedStatuses.add(label);
        return null;
    }
    return statusMap.get(code) || null;
}

function lookupSubStatus(subStatusLabel: string): number | null {
    if (!subStatusLabel || subStatusLabel.trim() === '') return null;
    const label = subStatusLabel.trim();
    const code = SUB_STATUS_MAP[label];
    if (!code) {
        unmappedSubStatuses.add(label);
        return null;
    }
    return subStatusMap.get(code) || null;
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
    school_id: string;
    course: string;
    entryyear: string;
    referral: string;
    registerdate: string;
    lastupdate: string;
    staffid: string;
    aa_remark: string;
    result_remark: string;
    remark_to_school: string;
    eventdate: string;
    eventtime: string;
    enroll_status: string;
    enroll_sub_status: string;
    coursedetail: string;
    s_detail: string;
    scholarship: string;
    event: string;
}

interface TransformedRecord {
    student_id: string;
    school_id: string;
    course_id: number | null;
    course_detail: string | null;
    entry_year: string | null;
    entry_month: number | null;
    entry_year_value: number | null;
    status_id: number | null;
    sub_status_id: number | null;
    is_referral: boolean;
    scholarship_amount: number;
    scholarship_detail: string | null;
    event_id: string | null;
    event_date: string | null;
    event_time: string | null;
    aa_remarks: string | null;
    result_remarks: string | null;
    remarks_to_school: string | null;
    registration_date: string | null;
    legacy_student_code: string;
    legacy_school_id: number;
    legacy_course: string | null;
    legacy_event_name: string | null;
    legacy_status: string | null;
    legacy_sub_status: string | null;
    is_archived: boolean;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow, isArchived: boolean): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);
    const schoolId = lookupSchool(row.school_id);

    if (!studentId || !schoolId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: row.aa_id || 'null',
                school_id: row.school_id || 'null',
                reason: !studentId ? `student ${row.aa_id} not found` : `school ${row.school_id} not found`,
            });
        }
        return null;
    }

    const entryYear = parseEntryYear(row.entryyear);

    return {
        student_id: studentId,
        school_id: schoolId,
        course_id: lookupCourse(row.course),
        course_detail: cleanString(row.coursedetail),
        entry_year: cleanString(row.entryyear),
        entry_month: entryYear.month,
        entry_year_value: entryYear.year,
        status_id: lookupStatus(row.enroll_status),
        sub_status_id: lookupSubStatus(row.enroll_sub_status),
        is_referral: row.referral === 'Y',
        scholarship_amount: parseDecimal(row.scholarship) || 0,
        scholarship_detail: cleanString(row.s_detail),
        event_id: lookupEvent(row.event),
        event_date: parseDate(row.eventdate),
        event_time: cleanString(row.eventtime),
        aa_remarks: cleanString(row.aa_remark),
        result_remarks: cleanString(row.result_remark),
        remarks_to_school: cleanString(row.remark_to_school),
        registration_date: parseDate(row.registerdate),
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_school_id: parseInt(row.school_id, 10),
        legacy_course: cleanString(row.course),
        legacy_event_name: cleanString(row.event),
        legacy_status: cleanString(row.enroll_status),
        legacy_sub_status: cleanString(row.enroll_sub_status),
        is_archived: isArchived,
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function processAndInsertFile(
    supabase: SupabaseClient,
    filePath: string,
    isArchived: boolean
): Promise<{ inserted: number; failed: number; total: number }> {
    if (!fs.existsSync(filePath)) {
        console.warn(`   ⚠️  File not found: ${filePath}`);
        return { inserted: 0, failed: 0, total: 0 };
    }

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = Papa.parse<CsvRow>(csvContent, {
        header: true, delimiter: '|', skipEmptyLines: true,
    });

    const label = isArchived ? 'history' : 'current';
    console.log(`   📄 ${path.basename(filePath)} (${label}): ${data.length} rows`);

    let inserted = 0, failed = 0, valid = 0;

    // Process in chunks to avoid memory issues
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        const records = chunk
            .map(row => transformRow(row, isArchived))
            .filter((r): r is TransformedRecord => r !== null);

        valid += records.length;

        if (!DRY_RUN && records.length > 0) {
            const { data: result, error } = await supabase
                .from('student_applications')
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
            process.stdout.write(`\r   ⏳ ${inserted}/${valid} inserted`);
        }
    }

    if (!DRY_RUN) {
        console.log(`\r   ✅ ${inserted}/${valid} inserted                    `);
    } else {
        console.log(`   ✅ ${valid}/${data.length} valid records`);
    }

    return { inserted, failed, total: valid };
}

async function migrate() {
    console.log('📝 Starting student applications migration...\n');

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`🔌 Connected to: ${SUPABASE_URL}\n`);
    await loadLookupTables(supabase);

    console.log('📂 Processing source files...\n');

    let totalInserted = 0, totalFailed = 0, totalValid = 0;

    // Process current applications
    if (!HISTORY_ONLY) {
        const current = await processAndInsertFile(
            supabase,
            path.join(DATA_DIR, 'AA_Student_SA.csv'),
            false
        );
        totalInserted += current.inserted;
        totalFailed += current.failed;
        totalValid += current.total;
    }

    // Process history
    const history = await processAndInsertFile(
        supabase,
        path.join(DATA_DIR, 'AA_Student_SA_History.csv'),
        true
    );
    totalInserted += history.inserted;
    totalFailed += history.failed;
    totalValid += history.total;

    // Summary
    console.log('\n' + '═'.repeat(60));
    if (DRY_RUN) {
        console.log('📋 DRY RUN SUMMARY');
        console.log('═'.repeat(60));
        console.log(`   Total valid: ${totalValid}`);
        console.log(`   Skipped: ${skippedRecords.length}`);

        if (unmappedStatuses.size > 0) {
            console.log('\n⚠️  UNMAPPED STATUSES:');
            Array.from(unmappedStatuses).forEach(s => console.log(`   - "${s}"`));
        }
        if (unmappedSubStatuses.size > 0) {
            console.log('\n⚠️  UNMAPPED SUB-STATUSES:');
            Array.from(unmappedSubStatuses).slice(0, 10).forEach(s => console.log(`   - "${s}"`));
        }
        if (unmappedCourses.size > 0) {
            console.log('\n⚠️  UNMAPPED COURSES:');
            Array.from(unmappedCourses).slice(0, 10).forEach(c => console.log(`   - "${c}"`));
        }
        if (unmappedEvents.size > 0) {
            console.log(`\n⚠️  UNMAPPED EVENTS: ${unmappedEvents.size}`);
            Array.from(unmappedEvents).slice(0, 10).forEach(e => console.log(`   - "${e}"`));
        }

        // Write skipped to file
        const skippedPath = path.join(DATA_DIR, 'student-applications-skipped.json');
        fs.writeFileSync(skippedPath, JSON.stringify({
            summary: {
                total_skipped: skippedRecords.length,
                unmapped_statuses: Array.from(unmappedStatuses),
                unmapped_sub_statuses: Array.from(unmappedSubStatuses),
                unmapped_courses: Array.from(unmappedCourses),
                unmapped_events_count: unmappedEvents.size,
            },
            skipped_records: skippedRecords.slice(0, 1000),
        }, null, 2));
        console.log(`\n📁 Skipped list saved to: ${skippedPath}`);
        console.log('\n🧪 DRY RUN COMPLETE\n');
    } else {
        console.log('✅ MIGRATION COMPLETE');
        console.log('═'.repeat(60));
        console.log(`   Inserted: ${totalInserted}`);
        console.log(`   Failed: ${totalFailed}`);
        console.log(`   Skipped: ${skippedRecords.length}`);
    }
}

migrate().catch(console.error);