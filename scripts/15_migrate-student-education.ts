/**
 * Data Migration Script: Import student education from CSV
 *
 * Source: AA_Student_Education.csv
 *
 * Usage:
 *   npx tsx scripts/15_migrate-student-education.ts --dry-run
 *   npx tsx scripts/15_migrate-student-education.ts
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
const BATCH_SIZE = 100;
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Education.csv');

// Course name mapping (CSV value -> code)
const COURSE_MAP: Record<string, string> = {
    // Interview
    'Interview Preparation': 'interview_preparation',
    'Interview Group Workshop': 'interview_group_workshop',
    '2025 Sept Intensive Interview Prep': 'intensive_interview_prep',

    // Entrance/Exam
    'Entrance Exam Preparation': 'entrance_exam_preparation',
    'Common Entrance 13+ Preparation': 'common_entrance_13_preparation',
    'Scholarship Exam Preparation': 'scholarship_exam_preparation',
    'Elite Entrance': 'elite_entrance',

    // GCSE
    'GCSE Preparation': 'gcse_preparation',
    'GCSE Group Workshop': 'gcse_group_workshop',
    'GCSE Easter Group Lessons': 'gcse_easter_group_lessons',
    'GCSE Summer Group Lessons': 'gcse_summer_group_lessons',

    // A Level
    'A Level Preparation': 'a_level_preparation',
    'A Level Summer Group Lessons': 'a_level_summer_group_lessons',

    // IB
    'IB Preparation': 'ib_preparation',

    // Tests
    'AA Test Preparation': 'aa_test_preparation',
    'CAT4 Preparation': 'cat4_preparation',
    'ISEB CPT': 'iseb_cpt',
    'ISEB CPT Preparation': 'iseb_cpt_preparation',
    'ISEB Workshop': 'iseb_workshop',
    'Ukiset Preparation': 'ukiset_preparation',
    'UCAT Preparation': 'ucat_preparation',

    // Tutoring
    'Subject Tutoring': 'subject_tutoring',
    'LT Subject Tutoring': 'lt_subject_tutoring',
    'Math Workshop': 'math_workshop',

    // Other
    'CV Preparation': 'cv_preparation',
    'Bridging Course Year 9': 'bridging_course_year_9',
    'Helix': 'helix',

    // Camps
    'AA Summer Camp 2025': 'aa_summer_camp_2025',
    'AA Summer Camp 2026': 'aa_summer_camp_2026',
};

// Lookup maps
let studentMap: Map<string, string> = new Map();
let courseMap: Map<string, number> = new Map();
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    course: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedCourses = new Set<string>();

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

    // Load education courses
    const { data: courses } = await supabase
        .from('education_courses')
        .select('id, code')
        .limit(100);
    courses?.forEach(row => {
        if (row.code) courseMap.set(row.code, row.id);
    });
    console.log(`   ✅ education_courses: ${courseMap.size}`);

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

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
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

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

interface CsvRow {
    aa_id: string;
    course: string;
    tutor: string;
    startdate: string;
    enddate: string;
    totalhour: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    email_sent: string;
}

interface TransformedRecord {
    student_id: string;
    course_id: number | null;
    legacy_course_name: string | null;
    tutor: string | null;
    start_date: string | null;
    end_date: string | null;
    total_hours: string | null;
    email_sent: boolean;
    remarks: string | null;
    legacy_student_code: string;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        skippedRecords.push({
            student_code: row.aa_id || 'null',
            course: row.course || 'null',
            reason: `student ${row.aa_id} not found`,
        });
        return null;
    }

    return {
        student_id: studentId,
        course_id: lookupCourse(row.course),
        legacy_course_name: cleanString(row.course),
        tutor: cleanString(row.tutor),
        start_date: parseDate(row.startdate),
        end_date: parseDate(row.enddate),
        total_hours: cleanString(row.totalhour),
        email_sent: row.email_sent === 'Y',
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('📚 Starting student education migration...\n');

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

    const records = data.map(transformRow).filter((r): r is TransformedRecord => r !== null);
    console.log(`✅ Transformed ${records.length} valid records\n`);

    if (DRY_RUN) {
        console.log('═'.repeat(60));
        console.log('📋 SAMPLE RECORDS');
        console.log('═'.repeat(60));
        records.slice(0, 3).forEach((r, i) => {
            console.log(`\n--- Record ${i + 1} ---`);
            console.log(JSON.stringify(r, null, 2));
        });

        // Course distribution
        const courseCounts: Record<string, number> = {};
        records.forEach(r => {
            const name = r.legacy_course_name || 'unknown';
            courseCounts[name] = (courseCounts[name] || 0) + 1;
        });

        console.log('\n📊 COURSES:');
        for (const [name, count] of Object.entries(courseCounts)) {
            console.log(`   ${count.toString().padStart(3)} - ${name}`);
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
        console.log('═'.repeat(60));

        if (unmappedCourses.size > 0) {
            console.log('\n⚠️  UNMAPPED COURSES (add to COURSE_MAP):');
            Array.from(unmappedCourses).forEach(c => console.log(`   - "${c}"`));
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student=${r.student_code}, course="${r.course}"`);
                console.log(`      → ${r.reason}`);
            });
        }

        console.log('\n🧪 DRY RUN COMPLETE\n');
        return;
    }

    let inserted = 0, failed = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { data: result, error } = await supabase
            .from('student_education')
            .insert(batch)
            .select('id');

        if (error) {
            console.error(`\n❌ Batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
            failed += batch.length;
        } else {
            inserted += result?.length || 0;
            process.stdout.write(`\r⏳ ${inserted}/${records.length}`);
        }
    }

    console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}, Skipped: ${skippedRecords.length}\n`);
}

migrate().catch(console.error);