/**
 * Data Migration Script: Import staff as users with profiles
 * 
 * This script:
 * 1. Creates auth.users via Supabase Admin API
 * 2. Updates the auto-created profile with staff data
 * 3. Outputs credentials to a file for distribution
 * 
 * Usage:
 *   npx tsx scripts/migrate-profiles.ts --dry-run         # Test without creating
 *   npx tsx scripts/migrate-profiles.ts --dry-run --limit 5  # Preview 5 records
 *   npx tsx scripts/migrate-profiles.ts                   # Actually create users
 * 
 * Requirements:
 *   npm install papaparse @supabase/supabase-js dotenv
 *   npm install -D @types/papaparse tsx
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CLI ARGUMENTS
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_INDEX = args.indexOf('--limit');
const LIMIT = LIMIT_INDEX !== -1 ? parseInt(args[LIMIT_INDEX + 1], 10) : null;

if (DRY_RUN) {
  console.log('🧪 DRY RUN MODE - No users will be created\n');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SECRET_KEY!;

const CSV_PATH = path.join(process.cwd(), 'data', 'AA_Staff.csv');

// Track results
const unmappedValues: Record<string, Set<string>> = {
  department: new Set(),
};

// ============================================================================
// LOOKUP MAPS
// ============================================================================

type LookupMap = Map<string, number>;

const lookupMaps: Record<string, LookupMap> = {
  department: new Map(),
};

// ============================================================================
// VALUE MAPPINGS
// ============================================================================

const DEPARTMENT_CODE_MAP: Record<string, string> = {
  'Admin': 'admin',
  'Consultant': 'consultant',
  'General': 'general',
};

// ============================================================================
// LOAD LOOKUP TABLES
// ============================================================================

async function loadLookupTables(supabase: SupabaseClient) {
  console.log('📚 Loading reference tables from database...\n');

  const { data: departments } = await supabase.from('departments').select('id, code');
  departments?.forEach(row => lookupMaps.department.set(row.code, row.id));
  console.log(`   ✅ departments: ${departments?.length || 0} records`);

  console.log('');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cleanString(val: string): string | null {
  if (!val || val.trim() === '' || val.trim() === '.') return null;
  return val.trim();
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Format: YYYYMMDDHHMMSS or YYYYMMDD
  if (/^\d{8,14}$/.test(trimmed)) {
    const year = trimmed.substring(0, 4);
    const month = trimmed.substring(4, 6);
    const day = trimmed.substring(6, 8);
    
    if (year === '0000' || month === '00' || day === '00') return null;
    
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

function parseInt2(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function lookupId(
  csvValue: string,
  codeMap: Record<string, string>,
  lookupMap: LookupMap,
  fieldName: string
): number | null {
  if (!csvValue || csvValue.trim() === '') return null;
  
  const trimmed = csvValue.trim();
  const code = codeMap[trimmed];
  
  if (!code) {
    unmappedValues[fieldName]?.add(trimmed);
    return null;
  }
  
  const id = lookupMap.get(code);
  if (!id) {
    unmappedValues[fieldName]?.add(trimmed);
    return null;
  }
  
  return id;
}

function generatePassword(): string {
  // Generate a secure random password: 12 chars, alphanumeric
  return crypto.randomBytes(9).toString('base64').slice(0, 12);
}

function generateEmail(row: CsvRow): string | null {
  // Priority: email1 (work email) > email2 > constructed from loginname
  const email1 = cleanString(row.email1);
  const email2 = cleanString(row.email2);
  
  if (email1 && email1.includes('@')) return email1;
  if (email2 && email2.includes('@')) return email2;
  
  // Construct from login name if no email
  const loginName = cleanString(row.loginname);
  if (loginName) {
    return `${loginName}@academic-asia.com`;
  }
  
  return null;
}

// ============================================================================
// CSV ROW TYPE
// ============================================================================

interface CsvRow {
  staffid: string;
  surname: string;
  firstname: string;
  joindate: string;
  adminlevel: string;
  loginname: string;
  loginpassword: string;
  department: string;
  lastupdate: string;
  remarks: string;
  email1: string;
  email2: string;
  staffposition: string;
  tel: string;
  mobile: string;
  fax: string;
  yearlycase: string;
  weeklycase: string;
  dailycase: string;
}

// ============================================================================
// TRANSFORM FUNCTION
// ============================================================================

interface TransformedStaff {
  legacy_id: string | null;
  email: string | null;
  password: string;
  surname: string | null;
  first_name: string | null;
  email_1: string | null;
  email_2: string | null;
  telephone: string | null;
  mobile: string | null;
  fax: string | null;
  department_id: number | null;
  admin_level: number | null;
  position: string | null;
  join_date: string | null;
  yearly_case_count: number;
  weekly_case_count: number;
  daily_case_count: number;
  remarks: string | null;
}

function transformRow(row: CsvRow): TransformedStaff | null {
  const email = generateEmail(row);
  
  // Skip if no valid email (required for auth)
  if (!email) {
    console.warn(`   ⚠️  Skipping ${row.staffid}: no valid email`);
    return null;
  }
  
  return {
    legacy_id: cleanString(row.staffid),
    email: email,
    password: generatePassword(),
    surname: cleanString(row.surname),
    first_name: cleanString(row.firstname),
    email_1: cleanString(row.email1),
    email_2: cleanString(row.email2),
    telephone: cleanString(row.tel),
    mobile: cleanString(row.mobile),
    fax: cleanString(row.fax),
    department_id: lookupId(row.department, DEPARTMENT_CODE_MAP, lookupMaps.department, 'department'),
    admin_level: parseInt2(row.adminlevel),
    position: cleanString(row.staffposition),
    join_date: parseDate(row.joindate),
    yearly_case_count: parseInt2(row.yearlycase) || 0,
    weekly_case_count: parseInt2(row.weeklycase) || 0,
    daily_case_count: parseInt2(row.dailycase) || 0,
    remarks: cleanString(row.remarks),
  };
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrate() {
  console.log('👤 Starting staff/profiles migration...\n');

  // Initialize Supabase client
  if (!SUPABASE_URL) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
  if (!SUPABASE_SECRET_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔌 Connected to Supabase');
  console.log(`   URL: ${SUPABASE_URL}\n`);

  // Load lookup tables
  await loadLookupTables(supabase);

  // Check if file exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_PATH}`);
    console.error('   Place AA_Staff.csv in the /data folder');
    process.exit(1);
  }

  // Read and parse CSV
  console.log(`📂 Reading CSV file: ${CSV_PATH}`);
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  
  const { data, errors } = Papa.parse<CsvRow>(csvContent, {
    header: true,
    delimiter: '|',
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.error('❌ CSV parsing errors:', errors.slice(0, 5));
  }

  console.log(`📊 Found ${data.length} records in CSV\n`);

  // Transform all rows
  let staff = data
    .map(transformRow)
    .filter((s): s is NonNullable<typeof s> => s !== null);

  console.log(`✅ Transformed ${staff.length} valid records\n`);

  // Apply limit if specified
  if (LIMIT && LIMIT > 0) {
    staff = staff.slice(0, LIMIT);
    console.log(`🔢 Limited to ${staff.length} records (--limit ${LIMIT})\n`);
  }

  // ============================================================================
  // DRY RUN: Preview
  // ============================================================================
  
  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📋 USERS TO BE CREATED');
    console.log('═'.repeat(60));
    
    for (const s of staff) {
      console.log(`\n  ${s.legacy_id || 'N/A'}: ${s.email}`);
      console.log(`     Name: ${s.first_name} ${s.surname}`);
      console.log(`     Position: ${s.position || 'N/A'}`);
      console.log(`     Department ID: ${s.department_id || 'N/A'}`);
      console.log(`     Admin Level: ${s.admin_level ?? 'N/A'}`);
    }

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`
    Total to create: ${staff.length}
    With department: ${staff.filter(s => s.department_id).length}
    With position:   ${staff.filter(s => s.position).length}
    `);

    console.log('\n🧪 DRY RUN COMPLETE - No users were created');
    console.log('   Run without --dry-run to create users\n');
    return;
  }

  // ============================================================================
  // CREATE USERS AND PROFILES
  // ============================================================================

  const credentials: Array<{ email: string; password: string; name: string }> = [];
  let created = 0;
  let failed = 0;

  for (const s of staff) {
    process.stdout.write(`\r⏳ Creating user ${created + failed + 1}/${staff.length}...`);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: s.email!,
      password: s.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        surname: s.surname,
        first_name: s.first_name,
      },
    });

    if (authError) {
      console.error(`\n❌ Failed to create user ${s.email}:`, authError.message);
      failed++;
      continue;
    }

    const userId = authData.user.id;

    // 2. Update the auto-created profile with staff data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        legacy_id: s.legacy_id,
        surname: s.surname,
        first_name: s.first_name,
        email_1: s.email_1,
        email_2: s.email_2,
        telephone: s.telephone,
        mobile: s.mobile,
        fax: s.fax,
        department_id: s.department_id,
        admin_level: s.admin_level,
        position: s.position,
        join_date: s.join_date,
        yearly_case_count: s.yearly_case_count,
        weekly_case_count: s.weekly_case_count,
        daily_case_count: s.daily_case_count,
        remarks: s.remarks,
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`\n❌ Failed to update profile for ${s.email}:`, profileError.message);
      // User created but profile update failed - still count as partial success
    }

    credentials.push({
      email: s.email!,
      password: s.password,
      name: `${s.first_name || ''} ${s.surname || ''}`.trim(),
    });
    
    created++;
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Failed: ${failed}`);
  console.log('═'.repeat(50));

  // Write credentials to file (IMPORTANT: Share securely and delete after!)
  if (credentials.length > 0) {
    const credentialsPath = path.join(process.cwd(), 'data', 'staff-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log(`\n🔐 Credentials saved to: ${credentialsPath}`);
    console.log('   ⚠️  IMPORTANT: Share these securely and DELETE this file after distribution!\n');

    // Also create a human-readable version
    const readablePath = path.join(process.cwd(), 'data', 'staff-credentials.txt');
    const readableContent = credentials
      .map(c => `Name: ${c.name}\nEmail: ${c.email}\nPassword: ${c.password}\n`)
      .join('\n---\n\n');
    fs.writeFileSync(readablePath, readableContent);
    console.log(`   Also saved as: ${readablePath}`);
  }
}

// Run migration
migrate().catch(console.error);
