export interface StudentProfile {
  // Basic Info
  id: string
  aaRef: string
  name: string
  chineseName: string
  surname: string
  firstname: string
  gender: "M" | "F"
  dateOfBirth: string
  passport: string

  // Status
  case: "Active" | "New" | "Archived"
  studentType: "AA Student" | "Consultant"
  placement: string

  // School & Application
  presentSchool: string
  schoolType: string
  nationality: string
  aaTestResult: { eng: string; math: string }
  testPaper: string
  yearApply: string
  applying: string
  entryYear: string
  enrollDate: string

  // Contact
  officer: string
  source: string
  address1: string
  address2?: string
  chineseAddress?: string
  contactTel: string
  contactFax?: string
  mobile: string
  email: string

  // Additional
  remarks?: string
  updated: string

  // Contacts (Parent/Guardian)
  contacts: {
    relationship: string
    surname: string
    firstname: string
    chineseName?: string
    gender: "M" | "F"
    occupation: string
    tel: string
    mobile: string
    fax?: string
    email: string
  }[]
}

export interface SchoolApplication {
  id: string
  schoolName: string
  yearApply: string
  courseDetail: string
  csd: string
  referral: "Yes" | "No"
  enrolStatus: "Awaiting Interview" | "Proceed" | "Offered" | "Cannot Proceed"
  subEnrolStatus?: string
  schDetail?: string
  eventName: string
  eventDate: string
}

// Main student profile used in detail pages
export const DUMMY_STUDENT: StudentProfile = {
  id: "S044751",
  aaRef: "0047308",
  name: "Jesse CHAN",
  chineseName: "劉韋鋒",
  surname: "LAU",
  firstname: "Waythan Wai Fung",
  gender: "M",
  dateOfBirth: "20-JUL-2011",
  passport: "HKSAR",

  case: "Active",
  studentType: "AA Student",
  placement: "asking p whether they will accept offer",

  presentSchool: "La Salle College",
  schoolType: "Hong Kong - Local",
  nationality: "HKSAR",
  aaTestResult: { eng: "Eng", math: "Math" },
  testPaper: "Year 9",
  yearApply: "Year 10",
  applying: "Year 12",
  entryYear: "Sep-2026",
  enrollDate: "20-MAY-2024",

  officer: "Jesse CHAN",
  source: "Walk-in (Friends)",
  address1: "Kent Court, 135, Boundary Street, Kowloon Tong, Kowloon, Hong Kong",
  chineseAddress: "",
  contactTel: "+44 14 4489 3000",
  mobile: "9095 3510",
  email: "fongsheena@yahoo.com.hk",

  remarks: "1",
  updated: "16-MAY-2025 01:11:51",

  contacts: [
    {
      relationship: "Mother",
      surname: "Ms",
      firstname: "FONG",
      chineseName: "",
      gender: "F",
      occupation: "Housewife",
      tel: "",
      mobile: "9095 3510",
      email: "fongsheena@yahoo.com.hk",
    },
    {
      relationship: "Father",
      surname: "Mr",
      firstname: "LAU",
      chineseName: "",
      gender: "M",
      occupation: "Director",
      tel: "",
      mobile: "6627 7838",
      email: "",
    },
  ],
}

// Array of all students for lists and dropdowns
export const DUMMY_STUDENTS: StudentProfile[] = [
  DUMMY_STUDENT,
  {
    id: "S043033",
    aaRef: "0043033",
    name: "Jack HO",
    chineseName: "何俊傑",
    surname: "HO",
    firstname: "Jack Chun Kit",
    gender: "M",
    dateOfBirth: "15-MAR-2010",
    passport: "HKSAR",
    case: "Active",
    studentType: "AA Student",
    placement: "Confirmed enrollment at Winchester College",
    presentSchool: "Diocesan Boys' School",
    schoolType: "Hong Kong - Local",
    nationality: "HKSAR",
    aaTestResult: { eng: "A", math: "A*" },
    testPaper: "Year 10",
    yearApply: "Year 11",
    applying: "Year 11",
    entryYear: "Sep-2025",
    enrollDate: "15-JAN-2024",
    officer: "CHOW Hoi Sun Hayson",
    source: "Referral (School)",
    address1: "The Peak, 88 Peak Road, Hong Kong",
    contactTel: "+852 2849 5678",
    mobile: "9234 5678",
    email: "jack.ho@email.com",
    remarks: "Top student, scholarship recipient",
    updated: "20-OCT-2025 14:30:00",
    contacts: [
      {
        relationship: "Father",
        surname: "Mr",
        firstname: "HO",
        chineseName: "何生",
        gender: "M",
        occupation: "Banker",
        tel: "+852 2849 5678",
        mobile: "9234 5678",
        email: "mr.ho@email.com",
      },
      {
        relationship: "Mother",
        surname: "Mrs",
        firstname: "HO",
        chineseName: "何太",
        gender: "F",
        occupation: "Teacher",
        tel: "+852 2849 5678",
        mobile: "9345 6789",
        email: "mrs.ho@email.com",
      },
    ],
  },
  {
    id: "S043623",
    aaRef: "0043623",
    name: "Sophie WONG",
    chineseName: "黃思琪",
    surname: "WONG",
    firstname: "Sophie Sze Ki",
    gender: "F",
    dateOfBirth: "22-AUG-2010",
    passport: "HKSAR",
    case: "Active",
    studentType: "AA Student",
    placement: "Awaiting interview results",
    presentSchool: "St. Paul's Co-educational College",
    schoolType: "Hong Kong - Local",
    nationality: "HKSAR",
    aaTestResult: { eng: "B+", math: "A" },
    testPaper: "Year 9",
    yearApply: "Year 10",
    applying: "Year 10",
    entryYear: "Sep-2026",
    enrollDate: "10-MAR-2024",
    officer: "CHOW Jamie Haole",
    source: "Walk-in (Website)",
    address1: "Mid-Levels, 123 Robinson Road, Hong Kong",
    contactTel: "+852 2523 4567",
    mobile: "9456 7890",
    email: "sophie.wong@email.com",
    remarks: "Strong in arts and humanities",
    updated: "18-OCT-2025 11:15:00",
    contacts: [
      {
        relationship: "Mother",
        surname: "Dr",
        firstname: "WONG",
        chineseName: "黃醫生",
        gender: "F",
        occupation: "Doctor",
        tel: "+852 2523 4567",
        mobile: "9456 7890",
        email: "dr.wong@email.com",
      },
    ],
  },
  {
    id: "S044850",
    aaRef: "0044850",
    name: "Hayden YIU",
    chineseName: "姚浩然",
    surname: "YIU",
    firstname: "Hayden Ho Yin",
    gender: "M",
    dateOfBirth: "05-DEC-2009",
    passport: "HKSAR",
    case: "Active",
    studentType: "AA Student",
    placement: "Preparing for entrance exams",
    presentSchool: "Wah Yan College",
    schoolType: "Hong Kong - Local",
    nationality: "HKSAR",
    aaTestResult: { eng: "A-", math: "A" },
    testPaper: "Year 10",
    yearApply: "Year 11",
    applying: "Year 11",
    entryYear: "Sep-2025",
    enrollDate: "05-FEB-2024",
    officer: "Jesse CHAN",
    source: "Referral (Friend)",
    address1: "Kowloon Tong, 456 Waterloo Road, Kowloon",
    contactTel: "+852 2336 7890",
    mobile: "9567 8901",
    email: "hayden.yiu@email.com",
    remarks: "Excellent leadership skills",
    updated: "19-OCT-2025 16:45:00",
    contacts: [
      {
        relationship: "Father",
        surname: "Mr",
        firstname: "YIU",
        chineseName: "姚生",
        gender: "M",
        occupation: "Entrepreneur",
        tel: "+852 2336 7890",
        mobile: "9567 8901",
        email: "mr.yiu@email.com",
      },
      {
        relationship: "Mother",
        surname: "Mrs",
        firstname: "YIU",
        chineseName: "姚太",
        gender: "F",
        occupation: "Accountant",
        tel: "+852 2336 7890",
        mobile: "9678 9012",
        email: "mrs.yiu@email.com",
      },
    ],
  },
  {
    id: "S045123",
    aaRef: "0045123",
    name: "Emma LEE",
    chineseName: "李芷晴",
    surname: "LEE",
    firstname: "Emma Chi Ching",
    gender: "F",
    dateOfBirth: "18-NOV-2011",
    passport: "HKSAR",
    case: "New",
    studentType: "AA Student",
    placement: "Initial consultation completed",
    presentSchool: "Island School",
    schoolType: "Hong Kong - International",
    nationality: "HKSAR",
    aaTestResult: { eng: "B", math: "B+" },
    testPaper: "Year 8",
    yearApply: "Year 9",
    applying: "Year 9",
    entryYear: "Sep-2027",
    enrollDate: "15-OCT-2025",
    officer: "CHOW Hoi Sun Hayson",
    source: "Walk-in (Website)",
    address1: "Repulse Bay, 789 Beach Road, Hong Kong",
    contactTel: "+852 2812 3456",
    mobile: "9789 0123",
    email: "emma.lee@email.com",
    remarks: "New inquiry, very interested in arts programs",
    updated: "21-OCT-2025 09:30:00",
    contacts: [
      {
        relationship: "Mother",
        surname: "Ms",
        firstname: "LEE",
        chineseName: "李小姐",
        gender: "F",
        occupation: "Designer",
        tel: "+852 2812 3456",
        mobile: "9789 0123",
        email: "ms.lee@email.com",
      },
    ],
  },
]

// Alias for backward compatibility
export const dummyStudents = DUMMY_STUDENTS

export const DUMMY_SCHOOL_APPLICATIONS: SchoolApplication[] = [
  {
    id: "1",
    schoolName: "Abingdon School",
    yearApply: "Year 10 (2026)",
    courseDetail: "",
    csd: "Sep-2026",
    referral: "No",
    enrolStatus: "Awaiting Interview",
    eventName: "EX - Early Online Interviews and P...",
    eventDate: "19-JUN-2025",
  },
  {
    id: "2",
    schoolName: "Brighton College",
    yearApply: "Year 10 (2026)",
    courseDetail: "",
    csd: "Sep-2026",
    referral: "No",
    enrolStatus: "Awaiting Interview",
    eventName: "EX - Early Online Interviews and P...",
    eventDate: "20-JUN-2025",
  },
  {
    id: "3",
    schoolName: "Rugby School",
    yearApply: "Year 10 (2026)",
    courseDetail: "",
    csd: "Sep-2026",
    referral: "No",
    enrolStatus: "Awaiting Interview",
    eventName: "EX - Early Online Interviews and P...",
    eventDate: "19-JUN-2025",
  },
  {
    id: "4",
    schoolName: "Abingdon School",
    yearApply: "Year 9 (2025)",
    courseDetail: "",
    csd: "Sep-2025",
    referral: "No",
    enrolStatus: "Proceed",
    eventName: "TS - TOP SCHOOLS WEEKEND...",
    eventDate: "22-SEP-2024",
  },
  {
    id: "5",
    schoolName: "Brighton College",
    yearApply: "Year 9 (2025)",
    courseDetail: "",
    csd: "Sep-2025",
    referral: "No",
    enrolStatus: "Cannot Proceed",
    eventName: "TS - TOP SCHOOLS WEEKEND...",
    eventDate: "22-SEP-2024",
  },
  {
    id: "6",
    schoolName: "Charterhouse",
    yearApply: "Year 10 (2025)",
    courseDetail: "",
    csd: "Sep-2025",
    referral: "No",
    enrolStatus: "Proceed",
    eventName: "TS - TOP SCHOOLS WEEKEND...",
    eventDate: "22-SEP-2024",
  },
  {
    id: "7",
    schoolName: "King's School (The), Cante...",
    yearApply: "Year 9 (2025)",
    courseDetail: "",
    csd: "Sep-2025",
    referral: "No",
    enrolStatus: "Offered",
    subEnrolStatus: "Scholarship-Music",
    schDetail: "a Music Ex...",
    eventName: "TS - TOP SCHOOLS WEEKEND...",
    eventDate: "22-SEP-2024",
  },
  {
    id: "8",
    schoolName: "Radley College",
    yearApply: "Year 10 (2025)",
    courseDetail: "",
    csd: "Sep-2025",
    referral: "No",
    enrolStatus: "Proceed",
    eventName: "TS - TOP SCHOOLS WEEKEND...",
    eventDate: "22-SEP-2024",
  },
]

// Helper function to get student by ID
export function getStudentById(id: string): StudentProfile | undefined {
  return DUMMY_STUDENTS.find((student) => student.id === id)
}

// Helper function to get students by status
export function getStudentsByStatus(status: StudentProfile["case"]): StudentProfile[] {
  return DUMMY_STUDENTS.filter((student) => student.case === status)
}

// Helper function to search students
export function searchStudents(query: string): StudentProfile[] {
  const lowerQuery = query.toLowerCase()
  return DUMMY_STUDENTS.filter(
    (student) =>
      student.firstname.toLowerCase().includes(lowerQuery) ||
      student.surname.toLowerCase().includes(lowerQuery) ||
      student.name.toLowerCase().includes(lowerQuery) ||
      student.chineseName.toLowerCase().includes(lowerQuery) ||
      student.id.toLowerCase().includes(lowerQuery) ||
      student.aaRef.toLowerCase().includes(lowerQuery),
  )
}

// Export type alias for compatibility
export type Student = StudentProfile
