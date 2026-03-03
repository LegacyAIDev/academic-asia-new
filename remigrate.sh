#!/bin/bash

# ============================================================================
# Full Database Remigration Script
#
# Usage:
#   ./scripts/remigrate.sh           # Full reset + migrate all
#   ./scripts/remigrate.sh --dry-run # Preview all migrations without inserting
#   ./scripts/remigrate.sh --skip-reset # Skip db reset, just run migrations
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=""
SKIP_RESET=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN="--dry-run"
      ;;
    --skip-reset)
      SKIP_RESET=true
      ;;
  esac
done

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   FULL DATABASE REMIGRATION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -n "$DRY_RUN" ]; then
  echo -e "${YELLOW}🧪 DRY RUN MODE - No data will be inserted${NC}"
  echo ""
fi

# ============================================================================
# STEP 1: Reset Database
# ============================================================================

if [ "$SKIP_RESET" = false ] && [ -z "$DRY_RUN" ]; then
  echo -e "${YELLOW}⚠️  This will DELETE all data and reset the database!${NC}"
  read -p "Are you sure? (y/N) " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
  fi

  echo -e "${BLUE}🔄 Step 1: Resetting database...${NC}"
  npx supabase db reset --linked
  echo -e "${GREEN}✅ Database reset complete${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Skipping database reset${NC}"
  echo ""
fi

# ============================================================================
# STEP 2: Run Migration Scripts in Order
# ============================================================================

echo -e "${BLUE}🚀 Step 2: Running migration scripts...${NC}"
echo ""

# Define migration order (profiles MUST be first)
SCRIPTS=(
  "1_migrate-profiles.ts"
  "2_migrate-students.ts"
  "3_migrate-schools.ts"
  "4_migrate-student-contacts.ts"
  "5_migrate-events.ts"
  "6_migrate-event-schools.ts"
  "7_migrate-event-interviewers.ts"
  "8_migrate-event-schedules.ts"
  "9_migrate-event-exams.ts"
  "10_migrate-event-results.ts"
  "11_migrate-school-sup-info.ts"
  "12_migrate-school-courses.ts"
)

TOTAL=${#SCRIPTS[@]}
CURRENT=0

for script in "${SCRIPTS[@]}"; do
  CURRENT=$((CURRENT + 1))
  SCRIPT_PATH="scripts/$script"

  if [ -f "$SCRIPT_PATH" ]; then
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
    echo -e "${BLUE}[$CURRENT/$TOTAL] Running: $script${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"

    if npx tsx "$SCRIPT_PATH" $DRY_RUN; then
      echo -e "${GREEN}✅ $script completed${NC}"
    else
      echo -e "${RED}❌ $script failed${NC}"
      exit 1
    fi
    echo ""
  else
    echo -e "${YELLOW}⚠️  Script not found: $SCRIPT_PATH (skipping)${NC}"
  fi
done

# ============================================================================
# STEP 3: Summary
# ============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ MIGRATION COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -z "$DRY_RUN" ]; then
  echo -e "${BLUE}📊 Verifying record counts...${NC}"
  echo ""

  npx supabase db execute --linked --sql "
    SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
    UNION ALL SELECT 'students', COUNT(*) FROM students
    UNION ALL SELECT 'schools', COUNT(*) FROM schools
    UNION ALL SELECT 'student_contacts', COUNT(*) FROM student_contacts
    UNION ALL SELECT 'events', COUNT(*) FROM events
    UNION ALL SELECT 'event_schools', COUNT(*) FROM event_schools
    UNION ALL SELECT 'event_interviewers', COUNT(*) FROM event_interviewers
    UNION ALL SELECT 'event_schedules', COUNT(*) FROM event_schedules
    UNION ALL SELECT 'event_exams', COUNT(*) FROM event_exams
    UNION ALL SELECT 'event_results', COUNT(*) FROM event_results
    UNION ALL SELECT 'school_supplementary_info', COUNT(*) FROM school_supplementary_info
    UNION ALL SELECT 'school_courses', COUNT(*) FROM school_courses
    UNION ALL SELECT 'student_applications', COUNT(*) FROM student_applications
    UNION ALL SELECT 'student_application_deposits', COUNT(*) FROM student_application_deposits
    ORDER BY 1;
  "
fi

echo ""
echo -e "${GREEN}🎉 Done!${NC}"