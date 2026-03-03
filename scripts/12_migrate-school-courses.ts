/**
 * Data Migration Script: Import school_courses from AA_School_Course.csv
 *
 * Usage:
 *   npx tsx scripts/migrate-school-courses.ts --dry-run
 *   npx tsx scripts/migrate-school-courses.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_School_Course.csv');

// ============================================================================
// COURSE NAME NORMALIZATION MAP
// Maps CSV course names (and variants) to normalized codes
// ============================================================================

const COURSE_NAME_MAP: Record<string, string> = {
    // Early Years
    'Nursery': 'nursery',
    'Pre-Kindergarten': 'pre_kindergarten',
    'Pre-Prep': 'pre_prep',
    'Reception': 'reception',

    // Primary Years
    'Year 1': 'year_1',
    'Year 2': 'year_2',
    'Year 3': 'year_3',
    'Year 4': 'year_4',
    'Year 5': 'year_5',
    'Year 6': 'year_6',

    // Secondary Years
    'Year 7': 'year_7',
    'Year 8': 'year_8',
    'Year 9': 'year_9',
    'Year 9 - Scholarship': 'year_9_scholarship',
    'Year 10': 'year_10',
    'Year 11': 'year_11',

    // Sixth Form
    'Year 12': 'year_12',
    'Year 12_IB': 'year_12_ib',
    'Year 13': 'year_13',

    // GCSE variants
    '1 Year GCSE': '1_year_gcse',
    '1-Year GCSE': '1_year_gcse',
    '1-Year GCSE Programme': '1_year_gcse',
    '1 Year IGCSE': '1_year_igcse',
    '1-Year IGCSE': '1_year_igcse',
    '1 Year IGCSE/GCSE': '1_year_igcse_gcse',
    '1-Year IGCSE/GCSE': '1_year_igcse_gcse',
    '2 Years IGCSE/GCSE': '2_year_igcse_gcse',
    '2-Year IGCSE/GCSE': '2_year_igcse_gcse',
    '3-Year GCSE': '3_year_gcse',
    'Pre-GCSE': 'pre_gcse',
    'GCSE Pathway Discovery Year 9 Entry': 'gcse_pathway_discovery_y9',
    'GSCE Pathway Discovery Year 9 Entry': 'gcse_pathway_discovery_y9', // typo in data
    'GCSE Academic Pathway Year 10 Entry': 'gcse_academic_pathway_y10',
    'GCSE Academic Pathway Year 10 entry': 'gcse_academic_pathway_y10', // case variant

    // A-Level variants
    '1 Year AL': '1_year_al',
    '1-Year AL': '1_year_al',
    '1 Year A-level': '1_year_al',
    '18 months AL': '18_months_al',
    '2-Year AL': '2_year_al',
    '3 Years AL': '3_year_al',
    '3-Year AL': '3_year_al',
    'A Level': 'a_level',
    'AL plus+': 'al_plus',

    // Pre A-Level variants
    'Pre-AL': 'pre_al',
    '1-Year Pre-AL': '1_year_pre_al',
    '1 Year Pre- A Level Course': '1_year_pre_al',
    '2-Year Pre-AL': '2_year_pre_al',
    '2 Years Pre- A Level Course': '2_year_pre_al',
    '1 Year Pre-Sixth Form Programme': '1_year_pre_sixth_form',
    '1-Year Pre-Sixth Form': '1_year_pre_sixth_form',
    'Pre-Sixth Form Course': 'pre_sixth_form_course',
    'Pre-6th Form': 'pre_6th_form',

    // IB
    'IB': 'ib',
    'Pre-IB': 'pre_ib',

    // Foundation variants
    'Foundation': 'foundation',
    '1-Year Foundation': '1_year_foundation',
    'International Foundation': 'international_foundation',
    'International Foundation Year': 'international_foundation_year',
    'Sixth Form Foundation': 'sixth_form_foundation',
    'Sixth Form Foundation Year': 'sixth_form_foundation_year',
    '6th Form Foundation': '6th_form_foundation',
    'Pre-Foundation': 'pre_foundation',
    'Foundation Degree': 'foundation_degree',
    '1-Year Junior Foundation Course': '1_year_junior_foundation',

    // English programs
    'English': 'english',
    'English Course': 'english_course',
    'English for Education': 'english_for_education',
    'English Plus Multi-Activities': 'english_plus_multi_activities',
    'English Plus Multi- Activities': 'english_plus_multi_activities', // space variant
    'English Preparation for Pathways (EPP)': 'english_preparation_pathways',
    'English Preparation for Pathways (EEP)': 'english_preparation_pathways', // typo
    'English Language Preparation Programme (ELPP)': 'english_language_prep',
    'Pre-Sessional Course': 'pre_sessional_course',
    'IELTS': 'ielts',
    'IELTS Express': 'ielts_express',

    // Vocational / Other
    'BTEC': 'btec',
    'Access to Further Education': 'access_fe',
    'Access to FE': 'access_fe',
    'Development Year': 'development_year',
    'Academic Preparation Programme': 'academic_preparation',
    'Academic Preparation Course': 'academic_preparation',
    'Accelerated Learning Programme (BALP)': 'accelerated_learning',

    // Summer programs
    'Summer': 'summer',
    'Summer-4': 'summer_4',
    'Summer-8': 'summer_8',
    'Easter': 'easter',

    // Levels
    'Level 4': 'level_4',
    'Level 5': 'level_5',
    'Level 6': 'level_6',
    'Level 7': 'level_7',
    'Level 8': 'level_8',
    'Level 9': 'level_9',
    'Level 10': 'level_10',
};

// Lookup maps
let schoolMap: Map<number, string> = new Map();
let courseMap: Map<string, number> = new Map(); // code -> id
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    school_id: string;
    course_name: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedCourses = new Set<string>();
const unmappedSchools = new Set<string>();
const unmappedProfiles = new Set<string>();

async function loadLookupTables(supabase: SupabaseClient) {
    console.log('📚 Loading lookup tables...\n');

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

function lookupSchool(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    const id = parseInt(legacyId, 10);
    if (isNaN(id)) return null;
    const uuid = schoolMap.get(id);
    if (!uuid) unmappedSchools.add(legacyId);
    return uuid || null;
}

function lookupCourse(courseName: string): number | null {
    if (!courseName || courseName.trim() === '') return null;
    const name = courseName.trim();

    // Look up the normalized code
    const code = COURSE_NAME_MAP[name];
    if (!code) {
        unmappedCourses.add(name);
        return null;
    }

    // Look up the course ID
    const id = courseMap.get(code);
    if (!id) {
        unmappedCourses.add(`${name} (code: ${code})`);
        return null;
    }

    return id;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    const uuid = profileMap.get(legacyId.trim());
    if (!uuid) unmappedProfiles.add(legacyId);
    return uuid || null;
}

interface CsvRow {
    school_id: string;
    coursename: string;
    description: string;
    lastupdate: string;
    staffid: string;
    remarks: string;
    year: string;
    coursedate: string;
    name: string;
    subject: string;
}

interface TransformedRecord {
    school_id: string;
    course_id: number;
    legacy_school_id: number;
    legacy_course_name: string;
    description: string | null;
    course_date: string | null;
    school_year: string | null;
    name: string | null;
    subject: string | null;
    remarks: string | null;
    assigned_to: string | null;
    legacy_last_update: string | null;
}

function transformRow(row: CsvRow): TransformedRecord | null {
    const schoolId = lookupSchool(row.school_id);
    const courseId = lookupCourse(row.coursename);

    if (!schoolId || !courseId) {
        const reasons: string[] = [];
        if (!schoolId) reasons.push(`school ${row.school_id} not found`);
        if (!courseId) reasons.push(`course "${row.coursename}" not mapped`);

        skippedRecords.push({
            school_id: row.school_id || 'null',
            course_name: row.coursename || 'null',
            reason: reasons.join(', '),
        });
        return null;
    }

    return {
        school_id: schoolId,
        course_id: courseId,
        legacy_school_id: parseInt(row.school_id, 10),
        legacy_course_name: row.coursename?.trim() || '',
        description: cleanString(row.description),
        course_date: parseDate(row.coursedate),
        school_year: cleanString(row.year),
        name: cleanString(row.name),
        subject: cleanString(row.subject),
        remarks: cleanString(row.remarks),
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('📚 Starting school_courses migration...\n');

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
        records.slice(0, 2).forEach((r, i) => {
            console.log(`\n--- Record ${i + 1} ---`);
            console.log(JSON.stringify(r, null, 2));
        });

        // Course distribution
        const courseCounts: Record<string, number> = {};
        records.forEach(r => {
            courseCounts[r.legacy_course_name] = (courseCounts[r.legacy_course_name] || 0) + 1;
        });

        console.log('\n📊 TOP 15 COURSES (mapped):');
        const sortedCourses = Object.entries(courseCounts).sort((a, b) => b[1] - a[1]);
        sortedCourses.slice(0, 15).forEach(([name, count]) => {
            console.log(`   ${count.toString().padStart(5)} - ${name}`);
        });

        console.log('\n' + '═'.repeat(60));
        console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
        console.log('═'.repeat(60));

        const missingSchool = skippedRecords.filter(r => r.reason.includes('school'));
        const missingCourse = skippedRecords.filter(r => r.reason.includes('course'));

        console.log(`\n   Missing school: ${missingSchool.length}`);
        console.log(`   Missing course: ${missingCourse.length}`);

        if (unmappedCourses.size > 0) {
            console.log('\n⚠️  UNMAPPED COURSES (add to COURSE_NAME_MAP):');
            Array.from(unmappedCourses).slice(0, 20).forEach(c => {
                console.log(`   - "${c}"`);
            });
            if (unmappedCourses.size > 20) {
                console.log(`   ... and ${unmappedCourses.size - 20} more`);
            }
        }

        console.log('\n📝 Sample skipped records:');
        skippedRecords.slice(0, 10).forEach((r, i) => {
            console.log(`   ${i + 1}. school=${r.school_id}, course="${r.course_name}"`);
            console.log(`      → ${r.reason}`);
        });

        // Write skipped to file
        const skippedPath = path.join(process.cwd(), 'data', 'school-courses-skipped.json');
        fs.writeFileSync(skippedPath, JSON.stringify({
            summary: {
                total_skipped: skippedRecords.length,
                missing_school: missingSchool.length,
                missing_course: missingCourse.length,
                unmapped_courses: Array.from(unmappedCourses),
            },
            skipped_records: skippedRecords,
        }, null, 2));
        console.log(`\n📁 Skipped list saved to: ${skippedPath}`);

        console.log('\n🧪 DRY RUN COMPLETE\n');
        return;
    }

    let inserted = 0, failed = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { data: result, error } = await supabase
            .from('school_courses')
            .insert(batch)
            .select('id');

        if (error) {
            console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE)+1}:`, error.message);
            failed += batch.length;
        } else {
            inserted += result?.length || 0;
            process.stdout.write(`\r⏳ ${inserted}/${records.length}`);
        }
    }

    console.log(`\n\n✅ Complete! Inserted: ${inserted}, Failed: ${failed}, Skipped: ${skippedRecords.length}\n`);
}

migrate().catch(console.error);