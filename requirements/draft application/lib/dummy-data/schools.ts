export interface SchoolProfile {
  // Basic Info
  id: string
  schoolName: string
  shortName: string
  country: string
  region: string
  city: string

  // School Details
  schoolType: "Boys" | "Girls" | "Co-ed"
  boardingType: "Day" | "Boarding" | "Day & Boarding"
  curriculum: string[]
  schoolLevel: string[]
  religiousAffiliation: string
  founded: string

  // Academic
  studentPopulation: number
  teacherStudentRatio: string
  averageClassSize: number
  examBoards: string[]
  languagesOffered: string[]

  // Admissions
  ageRange: string
  entryPoints: string[]
  feesPerTerm: {
    day?: string
    boarding?: string
    international?: string
  }
  scholarships: boolean

  // Contact & Location
  address: string
  postcode: string
  telephone: string
  email: string
  website: string
  headmaster: string

  // Facilities
  facilities: string[]
  sports: string[]
  extracurricular: string[]

  // Status
  status: "Active" | "Inactive" | "Partner"
  partnerSince?: string
  lastVisit?: string
  notes?: string

  // Stats
  totalApplications: number
  successfulPlacements: number
  interviewsScheduled: number
}

// Alias for compatibility
export type School = SchoolProfile

export interface SchoolContact {
  id: string
  schoolId: string
  name: string
  position: string
  email: string
  telephone: string
  mobile?: string
  isPrimary: boolean
}

export const DUMMY_SCHOOLS: SchoolProfile[] = [
  {
    id: "SCH001",
    schoolName: "Eton College",
    shortName: "Eton",
    country: "United Kingdom",
    region: "South East England",
    city: "Windsor",

    schoolType: "Boys",
    boardingType: "Boarding",
    curriculum: ["GCSE", "A-Level"],
    schoolLevel: ["Secondary", "Sixth Form"],
    religiousAffiliation: "Church of England",
    founded: "1440",

    studentPopulation: 1315,
    teacherStudentRatio: "1:8",
    averageClassSize: 12,
    examBoards: ["Edexcel", "OCR", "AQA"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin", "Russian", "Japanese"],

    ageRange: "13-18",
    entryPoints: ["13+", "16+"],
    feesPerTerm: {
      boarding: "£15,910",
      international: "£15,910",
    },
    scholarships: true,

    address: "Windsor, Berkshire",
    postcode: "SL4 6DW",
    telephone: "+44 1753 370100",
    email: "admissions@etoncollege.org.uk",
    website: "www.etoncollege.com",
    headmaster: "Simon Henderson",

    facilities: ["Library", "Science Labs", "Sports Hall", "Swimming Pool", "Theatre", "Music School", "Art Gallery"],
    sports: ["Rowing", "Cricket", "Football", "Rugby", "Tennis", "Athletics"],
    extracurricular: ["Drama", "Music", "Debating", "Chess", "Model UN", "Duke of Edinburgh"],

    status: "Active",
    partnerSince: "2010",
    lastVisit: "15-MAY-2024",
    notes: "Top tier school, very competitive. Requires early preparation.",

    totalApplications: 156,
    successfulPlacements: 23,
    interviewsScheduled: 8,
  },
  {
    id: "SCH002",
    schoolName: "Harrow School",
    shortName: "Harrow",
    country: "United Kingdom",
    region: "Greater London",
    city: "Harrow on the Hill",

    schoolType: "Boys",
    boardingType: "Boarding",
    curriculum: ["GCSE", "A-Level", "IB"],
    schoolLevel: ["Secondary", "Sixth Form"],
    religiousAffiliation: "Church of England",
    founded: "1572",

    studentPopulation: 830,
    teacherStudentRatio: "1:7",
    averageClassSize: 10,
    examBoards: ["OCR", "AQA", "Edexcel", "IB"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin", "Latin", "Greek"],

    ageRange: "13-18",
    entryPoints: ["13+", "16+"],
    feesPerTerm: {
      boarding: "£15,850",
      international: "£15,850",
    },
    scholarships: true,

    address: "5 High Street, Harrow on the Hill",
    postcode: "HA1 3HP",
    telephone: "+44 20 8872 8000",
    email: "admissions@harrowschool.org.uk",
    website: "www.harrowschool.org.uk",
    headmaster: "Alastair Land",

    facilities: [
      "Library",
      "Science Centre",
      "Sports Complex",
      "Swimming Pool",
      "Theatre",
      "Music Rooms",
      "Art Studios",
    ],
    sports: ["Football", "Cricket", "Rugby", "Squash", "Tennis", "Athletics", "Swimming"],
    extracurricular: ["Drama", "Music", "Debating", "Business Club", "Robotics", "Community Service"],

    status: "Active",
    partnerSince: "2012",
    lastVisit: "22-MAR-2024",
    notes: "Strong academic reputation. Good success rate with our students.",

    totalApplications: 134,
    successfulPlacements: 19,
    interviewsScheduled: 5,
  },
  {
    id: "SCH003",
    schoolName: "Rugby School",
    shortName: "Rugby",
    country: "United Kingdom",
    region: "Midlands",
    city: "Rugby",

    schoolType: "Co-ed",
    boardingType: "Day & Boarding",
    curriculum: ["GCSE", "A-Level", "Pre-U"],
    schoolLevel: ["Secondary", "Sixth Form"],
    religiousAffiliation: "Church of England",
    founded: "1567",

    studentPopulation: 920,
    teacherStudentRatio: "1:9",
    averageClassSize: 14,
    examBoards: ["OCR", "AQA", "Cambridge Pre-U"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin"],

    ageRange: "13-18",
    entryPoints: ["13+", "16+"],
    feesPerTerm: {
      day: "£10,570",
      boarding: "£14,100",
      international: "£14,100",
    },
    scholarships: true,

    address: "Lawrence Sheriff Street, Rugby",
    postcode: "CV22 5EH",
    telephone: "+44 1788 556216",
    email: "admissions@rugbyschool.co.uk",
    website: "www.rugbyschool.co.uk",
    headmaster: "Peter Green",

    facilities: [
      "Library",
      "Science Block",
      "Sports Centre",
      "Swimming Pool",
      "Performing Arts Centre",
      "Music School",
    ],
    sports: ["Rugby", "Cricket", "Hockey", "Tennis", "Athletics", "Swimming", "Rowing"],
    extracurricular: ["Drama", "Music", "Art", "Debating", "CCF", "Duke of Edinburgh"],

    status: "Active",
    partnerSince: "2015",
    lastVisit: "10-JAN-2024",

    totalApplications: 89,
    successfulPlacements: 14,
    interviewsScheduled: 3,
  },
  {
    id: "SCH004",
    schoolName: "Wycombe Abbey School",
    shortName: "Wycombe Abbey",
    country: "United Kingdom",
    region: "South East England",
    city: "High Wycombe",

    schoolType: "Girls",
    boardingType: "Boarding",
    curriculum: ["GCSE", "A-Level"],
    schoolLevel: ["Secondary", "Sixth Form"],
    religiousAffiliation: "Church of England",
    founded: "1896",

    studentPopulation: 660,
    teacherStudentRatio: "1:6",
    averageClassSize: 11,
    examBoards: ["OCR", "AQA", "Edexcel"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin", "Italian"],

    ageRange: "11-18",
    entryPoints: ["11+", "13+", "16+"],
    feesPerTerm: {
      boarding: "£15,210",
      international: "£15,210",
    },
    scholarships: true,

    address: "High Wycombe, Buckinghamshire",
    postcode: "HP11 1PE",
    telephone: "+44 1494 520381",
    email: "admissions@wycombeabbey.com",
    website: "www.wycombeabbey.com",
    headmaster: "Jo Duncan",

    facilities: [
      "Library",
      "Science Labs",
      "Sports Hall",
      "Swimming Pool",
      "Music School",
      "Art Centre",
      "Dance Studio",
    ],
    sports: ["Lacrosse", "Tennis", "Swimming", "Athletics", "Netball", "Hockey"],
    extracurricular: ["Drama", "Music", "Art", "Public Speaking", "Model UN", "Community Service"],

    status: "Active",
    partnerSince: "2013",
    lastVisit: "05-APR-2024",
    notes: "Excellent results for girls. Very supportive pastoral care.",

    totalApplications: 98,
    successfulPlacements: 16,
    interviewsScheduled: 6,
  },
  {
    id: "SCH005",
    schoolName: "Brighton College",
    shortName: "Brighton",
    country: "United Kingdom",
    region: "South East England",
    city: "Brighton",

    schoolType: "Co-ed",
    boardingType: "Day & Boarding",
    curriculum: ["GCSE", "A-Level", "IB"],
    schoolLevel: ["Prep", "Secondary", "Sixth Form"],
    religiousAffiliation: "Non-denominational",
    founded: "1845",

    studentPopulation: 1150,
    teacherStudentRatio: "1:8",
    averageClassSize: 13,
    examBoards: ["OCR", "AQA", "Edexcel", "IB"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin", "Russian"],

    ageRange: "3-18",
    entryPoints: ["11+", "13+", "16+"],
    feesPerTerm: {
      day: "£8,950",
      boarding: "£14,640",
      international: "£14,640",
    },
    scholarships: true,

    address: "Eastern Road, Brighton",
    postcode: "BN2 0AL",
    telephone: "+44 1273 704200",
    email: "admissions@brightoncollege.org.uk",
    website: "www.brightoncollege.com",
    headmaster: "Richard Cairns",

    facilities: [
      "Library",
      "Science Centre",
      "Sports Complex",
      "Swimming Pool",
      "Theatre",
      "Music Department",
      "Art Gallery",
    ],
    sports: ["Cricket", "Football", "Rugby", "Hockey", "Tennis", "Swimming", "Athletics"],
    extracurricular: ["Drama", "Music", "Art", "Debating", "CCF", "Duke of Edinburgh", "Entrepreneurship"],

    status: "Partner",
    partnerSince: "2018",
    lastVisit: "28-FEB-2024",
    notes: "Modern approach to education. Strong in both academics and co-curricular.",

    totalApplications: 67,
    successfulPlacements: 11,
    interviewsScheduled: 4,
  },
  {
    id: "SCH006",
    schoolName: "Charterhouse",
    shortName: "Charterhouse",
    country: "United Kingdom",
    region: "South East England",
    city: "Godalming",

    schoolType: "Co-ed",
    boardingType: "Boarding",
    curriculum: ["GCSE", "A-Level"],
    schoolLevel: ["Secondary", "Sixth Form"],
    religiousAffiliation: "Church of England",
    founded: "1611",

    studentPopulation: 900,
    teacherStudentRatio: "1:8",
    averageClassSize: 12,
    examBoards: ["OCR", "AQA"],
    languagesOffered: ["French", "German", "Spanish", "Mandarin", "Latin"],

    ageRange: "13-18",
    entryPoints: ["13+", "16+"],
    feesPerTerm: {
      boarding: "£15,110",
      international: "£15,110",
    },
    scholarships: true,

    address: "Godalming, Surrey",
    postcode: "GU7 2DX",
    telephone: "+44 1483 291500",
    email: "admissions@charterhouse.org.uk",
    website: "www.charterhouse.org.uk",
    headmaster: "Alex Peterken",

    facilities: [
      "Library",
      "Science Centre",
      "Sports Complex",
      "Swimming Pool",
      "Theatre",
      "Music School",
      "Art Gallery",
    ],
    sports: ["Football", "Cricket", "Rugby", "Hockey", "Tennis", "Golf", "Athletics"],
    extracurricular: ["Drama", "Music", "Art", "Debating", "Business", "Technology"],

    status: "Active",
    partnerSince: "2014",
    lastVisit: "12-MAR-2024",

    totalApplications: 72,
    successfulPlacements: 12,
    interviewsScheduled: 2,
  },
]

// Export alias for backward compatibility
export const dummySchools = DUMMY_SCHOOLS

export const DUMMY_SCHOOL_CONTACTS: Record<string, SchoolContact[]> = {
  SCH001: [
    {
      id: "C001",
      schoolId: "SCH001",
      name: "Sarah Thompson",
      position: "Admissions Director",
      email: "s.thompson@etoncollege.org.uk",
      telephone: "+44 1753 370100",
      mobile: "+44 7700 900123",
      isPrimary: true,
    },
    {
      id: "C002",
      schoolId: "SCH001",
      name: "James Mitchell",
      position: "International Liaison",
      email: "j.mitchell@etoncollege.org.uk",
      telephone: "+44 1753 370101",
      isPrimary: false,
    },
  ],
  SCH002: [
    {
      id: "C003",
      schoolId: "SCH002",
      name: "Emma Williams",
      position: "Head of Admissions",
      email: "e.williams@harrowschool.org.uk",
      telephone: "+44 20 8872 8001",
      mobile: "+44 7700 900456",
      isPrimary: true,
    },
  ],
  SCH003: [
    {
      id: "C004",
      schoolId: "SCH003",
      name: "David Brown",
      position: "Admissions Officer",
      email: "d.brown@rugbyschool.co.uk",
      telephone: "+44 1788 556216",
      isPrimary: true,
    },
  ],
}

// Export alias for backward compatibility
export const dummySchoolContacts = DUMMY_SCHOOL_CONTACTS

// Helper function to get school by ID
export function getSchoolById(id: string): SchoolProfile | undefined {
  return DUMMY_SCHOOLS.find((school) => school.id === id)
}

// Helper function to get school contacts
export function getSchoolContacts(schoolId: string): SchoolContact[] {
  return DUMMY_SCHOOL_CONTACTS[schoolId] || []
}

// Helper function to get primary contact
export function getPrimaryContact(schoolId: string): SchoolContact | undefined {
  const contacts = getSchoolContacts(schoolId)
  return contacts.find((contact) => contact.isPrimary)
}
