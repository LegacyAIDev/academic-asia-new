/**
 * Data Migration Script: Import student exam results from CSV
 *
 * Source: AA_Student_Exam_Result.csv
 *
 * Usage:
 *   npx tsx scripts/19_migrate-student-exam-results.ts --dry-run
 *   npx tsx scripts/19_migrate-student-exam-results.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Exam_Result.csv');

// Exam type mapping (parsed from exam field)
const EXAM_TYPE_MAP: Record<string, string> = {
    'aa test': 'aa_test',
    'individual exam': 'individual_exam',
    'school exam': 'school_exam',
};

// Subject mapping (parsed from exam field)
const SUBJECT_MAP: Record<string, string> = {
    'eng': 'eng',
    'maths': 'maths',
    'piano': 'piano',
    'english': 'english',
    'a level': 'a_level',
    'gcse': 'gcse',
    'ib': 'ib',
    'pre - u': 'pre_u',
    'pre-u': 'pre_u',
};

// Exam paper mapping
const PAPER_MAP: Record<string, string> = {
    'year 5': 'year_5',
    'year 6': 'year_6',
    'year 7': 'year_7',
    'year 8': 'year_8',
    'year 9': 'year_9',
    'year 10': 'year_10',
    'year 11': 'year_11',
    'year 12': 'year_12',
    'year 13': 'year_13',
    'foundation': 'foundation',
    'pre-al': 'pre_al',
    'english course': 'english_course',
    'no paper': 'no_paper',
};

// Lookup maps
let studentMap: Map<string, string> = new Map();
let examTypeMap: Map<string, number> = new Map();
let subjectMap: Map<string, number> = new Map();
let paperMap: Map<string, number> = new Map();
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    exam: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedExams = new Set<string>();
const unmappedPapers = new Set<string>();

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

    // Load exam types
    const { data: examTypes } = await supabase
        .from('exam_types')
        .select('id, code')
        .limit(50);
    examTypes?.forEach(row => {
        if (row.code) examTypeMap.set(row.code, row.id);
    });
    console.log(`   ✅ exam_types: ${examTypeMap.size}`);

    // Load subjects
    const { data: subjects } = await supabase
        .from('exam_subjects')
        .select('id, code')
        .limit(50);
    subjects?.forEach(row => {
        if (row.code) subjectMap.set(row.code, row.id);
    });
    console.log(`   ✅ exam_subjects: ${subjectMap.size}`);

    // Load papers
    const { data: papers } = await supabase
        .from('exam_papers')
        .select('id, code')
        .limit(50);
    papers?.forEach(row => {
        if (row.code) paperMap.set(row.code, row.id);
    });
    console.log(`   ✅ exam_papers: ${paperMap.size}`);

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

function parseDecimal(val: string): number | null {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

// Parse exam field like "AA Test Maths" -> { examType: "aa_test", subject: "maths" }
function parseExam(exam: string): { examTypeId: number | null, subjectId: number | null } {
    if (!exam || exam.trim() === '') return { examTypeId: null, subjectId: null };

    const lower = exam.toLowerCase().trim();
    let examTypeId: number | null = null;
    let subjectId: number | null = null;

    // Try to match exam type
    for (const [key, code] of Object.entries(EXAM_TYPE_MAP)) {
        if (lower.startsWith(key)) {
            examTypeId = examTypeMap.get(code) || null;

            // Extract subject (rest of the string after exam type)
            const subjectPart = lower.substring(key.length).trim();
            if (subjectPart) {
                const subjectCode = SUBJECT_MAP[subjectPart];
                if (subjectCode) {
                    subjectId = subjectMap.get(subjectCode) || null;
                } else {
                    unmappedExams.add(exam);
                }
            }
            break;
        }
    }

    if (!examTypeId) {
        unmappedExams.add(exam);
    }

    return { examTypeId, subjectId };
}

function lookupPaper(paper: string): number | null {
    if (!paper || paper.trim() === '') return null;
    const lower = paper.toLowerCase().trim();
    const code = PAPER_MAP[lower];
    if (!code) {
        unmappedPapers.add(paper);
        return null;
    }
    return paperMap.get(code) || null;
}

interface CsvRow {
    aa_id: string;
    exam: string;
    results: string;
    maxscore: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    course: string;
}

interface TransformedRecord {
    student_id: string;
    exam_type_id: number | null;
    subject_id: number | null;
    paper_id: number | null;
    score: number | null;
    max_score: number | null;
    remarks: string | null;
    legacy_student_code: string;
    legacy_exam: string | null;
    legacy_course: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const studentId = lookupStudent(row.aa_id);

    if (!studentId) {
        if (skippedRecords.length < 10000) {
            skippedRecords.push({
                student_code: row.aa_id || 'null',
                exam: row.exam || 'null',
                reason: `student ${row.aa_id} not found`,
            });
        }
        return null;
    }

    const { examTypeId, subjectId } = parseExam(row.exam);

    return {
        student_id: studentId,
        exam_type_id: examTypeId,
        subject_id: subjectId,
        paper_id: lookupPaper(row.course),
        score: parseDecimal(row.results),
        max_score: parseDecimal(row.maxscore),
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        legacy_exam: cleanString(row.exam),
        legacy_course: cleanString(row.course),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('📝 Starting student exam results migration...\n');

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
                .from('student_exam_results')
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

        // Stats
        const withExamType = data.filter(r => {
            const { examTypeId } = parseExam(r.exam);
            return examTypeId !== null;
        }).length;
        console.log(`   With exam type: ${withExamType}`);

        if (unmappedExams.size > 0) {
            console.log('\n⚠️  UNMAPPED EXAMS:');
            Array.from(unmappedExams).forEach(e => console.log(`   - "${e}"`));
        }

        if (unmappedPapers.size > 0) {
            console.log('\n⚠️  UNMAPPED PAPERS:');
            Array.from(unmappedPapers).forEach(p => console.log(`   - "${p}"`));
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student=${r.student_code}, exam="${r.exam}"`);
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
        console.log(`   Unmapped exams: ${unmappedExams.size}`);
        console.log(`   Unmapped papers: ${unmappedPapers.size}`);
    }
}

migrate().catch(console.error);