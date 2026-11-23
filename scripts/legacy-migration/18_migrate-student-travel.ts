/**
 * Data Migration Script: Import student travel from CSV
 *
 * Source: AA_Student_Travel.csv
 *
 * Usage:
 *   npx tsx scripts/18_migrate-student-travel.ts --dry-run
 *   npx tsx scripts/18_migrate-student-travel.ts
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
const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Student_Travel.csv');

// Airport name normalization map
const AIRPORT_MAP: Record<string, string> = {
    'london heathrow t1': 'london_heathrow_t1',
    'london heathrow t2': 'london_heathrow_t2',
    'london heathrow t3': 'london_heathrow_t3',
    'london heathrow t4': 'london_heathrow_t4',
    'london heathrow t5': 'london_heathrow_t5',
    'london heathrow - t1': 'london_heathrow_t1',
    'london heathrow - t2': 'london_heathrow_t2',
    'london heathrow - t3': 'london_heathrow_t3',
    'london heathrow - t4': 'london_heathrow_t4',
    'london heathrow - t5': 'london_heathrow_t5',
    'london heathrow airport- terminal 3': 'london_heathrow_t3',
    'heathrow': 'london_heathrow_t5', // Default to T5
    'heathrow t3': 'london_heathrow_t3',
    'heathrow t5': 'london_heathrow_t5',
    'london heathrow': 'london_heathrow_t5',
    'london gatwick': 'london_gatwick',
    'london luton': 'london_luton',
    'london stansted': 'london_stansted',
    'london stanstead': 'london_stansted',
    'manchester t1': 'manchester_t1',
    'manchester t2': 'manchester_t2',
    'manchester t3': 'manchester_t3',
    'manchester international airport': 'manchester_t1',
    'birmingham': 'birmingham',
    'bristol': 'bristol',
    'edinburgh': 'edinburgh',
    'leeds': 'leeds',
    'newcastle': 'newcastle',
    'norwich': 'norwich',
    'belfast george best city airport': 'belfast_george_best',
    'belfast international': 'belfast_international',
    'humberside': 'humberside',
    'isle of man': 'isle_of_man',
    'dubai t3': 'dubai_t3',
};

// Pickup status mapping
const PICKUP_STATUS_MAP: Record<string, string> = {
    'booking made & awt contact details': 'booking_made_awaiting_contact',
    'confirmation emailed family': 'confirmation_emailed_family',
    'consultant handle': 'consultant_handle',
    'details confirmed': 'details_confirmed',
    'family acknowledged confirmation': 'family_acknowledged',
    'family self-arrange': 'family_self_arrange',
    'itin received': 'itin_received',
    'itin requested': 'itin_requested',
    'request made': 'request_made',
    'sch/guardian cfm booking will be made': 'sch_guardian_booking',
};

// Pickup provider mapping
const PICKUP_PROVIDER_MAP: Record<string, string> = {
    'school': 'school',
    'whg': 'whg',
    'quest': 'quest',
    'others': 'others',
};

// Lookup maps
let studentMap: Map<string, string> = new Map();
let airportMap: Map<string, number> = new Map();
let pickupStatusMap: Map<string, number> = new Map();
let pickupProviderMap: Map<string, number> = new Map();
let profileMap: Map<string, string> = new Map();

// Track issues
interface SkippedRecord {
    student_code: string;
    reason: string;
}
const skippedRecords: SkippedRecord[] = [];
const unmappedAirports = new Set<string>();
const unmappedPickupStatuses = new Set<string>();

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

    // Load airports
    const { data: airports } = await supabase
        .from('airports')
        .select('id, code')
        .limit(100);
    airports?.forEach(row => {
        if (row.code) airportMap.set(row.code, row.id);
    });
    console.log(`   ✅ airports: ${airportMap.size}`);

    // Load pickup statuses
    const { data: pickupStatuses } = await supabase
        .from('pickup_statuses')
        .select('id, code')
        .limit(50);
    pickupStatuses?.forEach(row => {
        if (row.code) pickupStatusMap.set(row.code, row.id);
    });
    console.log(`   ✅ pickup_statuses: ${pickupStatusMap.size}`);

    // Load pickup providers
    const { data: pickupProviders } = await supabase
        .from('pickup_providers')
        .select('id, code')
        .limit(50);
    pickupProviders?.forEach(row => {
        if (row.code) pickupProviderMap.set(row.code, row.id);
    });
    console.log(`   ✅ pickup_providers: ${pickupProviderMap.size}`);

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
    if (!val || val.trim() === '' || val.trim() === '.' || val.trim() === '0') return null;
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

function parseInt2(val: string): number {
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
}

function lookupStudent(code: string): string | null {
    if (!code || code.trim() === '') return null;
    return studentMap.get(code.trim()) || null;
}

function lookupAirport(airportName: string): number | null {
    if (!airportName || airportName.trim() === '') return null;
    const name = airportName.toLowerCase().trim();
    const code = AIRPORT_MAP[name];
    if (!code) {
        unmappedAirports.add(airportName.trim());
        return null;
    }
    return airportMap.get(code) || null;
}

function lookupPickupStatus(status: string): number | null {
    if (!status || status.trim() === '') return null;
    const s = status.toLowerCase().trim();
    const code = PICKUP_STATUS_MAP[s];
    if (!code) {
        unmappedPickupStatuses.add(status.trim());
        return null;
    }
    return pickupStatusMap.get(code) || null;
}

function lookupPickupProvider(provider: string): number | null {
    if (!provider || provider.trim() === '') return null;
    const p = provider.toLowerCase().trim();
    const code = PICKUP_PROVIDER_MAP[p];
    if (!code) return null; // Custom providers stored as text
    return pickupProviderMap.get(code) || null;
}

function lookupProfile(legacyId: string): string | null {
    if (!legacyId || legacyId.trim() === '') return null;
    return profileMap.get(legacyId.trim()) || null;
}

// Extract flight number from combined string like "Cathay Pacific CX255"
function extractFlightNumber(flightStr: string): string | null {
    if (!flightStr || flightStr.trim() === '') return null;
    const trimmed = flightStr.trim();
    // Match flight codes like CX255, CZ303, BA123, etc.
    const match = trimmed.match(/([A-Z]{2,3}\d{1,4})/i);
    return match ? match[1].toUpperCase() : trimmed;
}

interface CsvRow {
    aa_id: string;
    case: string;           // Y/N - pickup required
    pickupby: string;
    flightno: string;
    airline: string;
    arrivalairport: string;
    arrivaldate: string;
    arrivaltime: string;
    predepart: string;      // pickup status
    joininst: string;       // meeting point details
    lastupdate: string;
    staffid: string;
    remarks: string;
    journeyno: string;
    route: string;
}

interface TransformedRecord {
    student_id: string;
    journey_no: number;
    route: number;
    requires_pickup: boolean;
    flight_number: string | null;
    legacy_airline: string | null;
    airport_id: number | null;
    legacy_airport: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    pickup_status_id: number | null;
    legacy_pickup_status: string | null;
    pickup_provider_id: number | null;
    pickup_by: string | null;
    meeting_point_details: string | null;
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
            reason: `student ${row.aa_id} not found`,
        });
        return null;
    }

    return {
        student_id: studentId,
        journey_no: parseInt2(row.journeyno),
        route: parseInt2(row.route) || 1,
        requires_pickup: row.case === 'Y',
        flight_number: extractFlightNumber(row.flightno),
        legacy_airline: cleanString(row.airline) || cleanString(row.flightno),
        airport_id: lookupAirport(row.arrivalairport),
        legacy_airport: cleanString(row.arrivalairport),
        arrival_date: parseDate(row.arrivaldate),
        arrival_time: cleanString(row.arrivaltime),
        pickup_status_id: lookupPickupStatus(row.predepart),
        legacy_pickup_status: cleanString(row.predepart),
        pickup_provider_id: lookupPickupProvider(row.pickupby),
        pickup_by: cleanString(row.pickupby),
        meeting_point_details: cleanString(row.joininst),
        remarks: cleanString(row.remarks),
        legacy_student_code: row.aa_id?.trim() || '',
        assigned_to: lookupProfile(row.staffid),
        legacy_last_update: parseTimestamp(row.lastupdate),
    };
}

async function migrate() {
    console.log('✈️  Starting student travel migration...\n');

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

        console.log('\n📊 STATS:');
        console.log(`   Requires pickup: ${records.filter(r => r.requires_pickup).length}`);
        console.log(`   With airport mapped: ${records.filter(r => r.airport_id).length}`);
        console.log(`   With pickup status mapped: ${records.filter(r => r.pickup_status_id).length}`);

        console.log('\n' + '═'.repeat(60));
        console.log(`❌ SKIPPED RECORDS: ${skippedRecords.length}`);
        console.log('═'.repeat(60));

        if (unmappedAirports.size > 0) {
            console.log('\n⚠️  UNMAPPED AIRPORTS:');
            Array.from(unmappedAirports).forEach(a => console.log(`   - "${a}"`));
        }

        if (unmappedPickupStatuses.size > 0) {
            console.log('\n⚠️  UNMAPPED PICKUP STATUSES:');
            Array.from(unmappedPickupStatuses).forEach(s => console.log(`   - "${s}"`));
        }

        if (skippedRecords.length > 0) {
            console.log('\n📝 Sample skipped records:');
            skippedRecords.slice(0, 5).forEach((r, i) => {
                console.log(`   ${i + 1}. student=${r.student_code}`);
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
            .from('student_travel')
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