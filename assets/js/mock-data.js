/* ==========================================================================
   Livinkey Admin — Mock Data Layer
   Frontend-only demo data. In a real build this is replaced by API calls.
   ========================================================================== */

const LK = window.LK || {};

// Admin Credentials
LK.credentials = {
  "molittle1011@gmail.com": { password: "super@123", role: "Super Admin", name: "Molly Little" },
  "mosnake111@gmail.com":   { password: "admin@123",  role: "Admin",       name: "Mo Snake" }
};

LK.notificationsCount = 3;

// PGs Data - Added qrCode field to each PG
LK.pgs = [
  {
    id: "PG001",
    name: "Alishan PG",
    location: "Plot No. 45, Sector 12, Kharghar, Navi Mumbai",
    floors: 3,
    roomsPerFloor: 4,
    capacity: 2,
    qrCode: null,
    rooms: [
      { roomNo: "101", floor: "1st Floor", occupants: ["Amit Sharma"], rent: 11000, capacity: 2 },
      { roomNo: "102", floor: "1st Floor", occupants: ["Diego Alvarez", "Louis Meyer"], rent: 11000, capacity: 2 },
      { roomNo: "103", floor: "1st Floor", occupants: ["Riya Kapoor"], rent: 13500, capacity: 1 },
      { roomNo: "104", floor: "1st Floor", occupants: [], rent: 11000, capacity: 2 },
      { roomNo: "201", floor: "2nd Floor", occupants: ["Sara Chen"], rent: 12000, capacity: 2 },
      { roomNo: "202", floor: "2nd Floor", occupants: [], rent: 12000, capacity: 2 },
      { roomNo: "203", floor: "2nd Floor", occupants: ["Karan Mehta", "Vikram Rao"], rent: 10000, capacity: 3 },
      { roomNo: "204", floor: "2nd Floor", occupants: [], rent: 12000, capacity: 2 },
      { roomNo: "301", floor: "3rd Floor", occupants: [], rent: 14000, capacity: 1 },
      { roomNo: "302", floor: "3rd Floor", occupants: ["Anjali Nair"], rent: 11500, capacity: 2 },
      { roomNo: "303", floor: "3rd Floor", occupants: [], rent: 11500, capacity: 2 },
      { roomNo: "304", floor: "3rd Floor", occupants: [], rent: 14000, capacity: 1 }
    ]
  },
  {
    id: "PG002",
    name: "DS Apartment",
    location: "Plot No. 78, Near City Centre, Vashi, Navi Mumbai",
    floors: 2,
    roomsPerFloor: 3,
    capacity: 2,
    qrCode: null,
    rooms: [
      { roomNo: "101", floor: "1st Floor", occupants: ["Priya Patel"], rent: 13000, capacity: 2 },
      { roomNo: "102", floor: "1st Floor", occupants: ["John Smith", "Maria Garcia"], rent: 12000, capacity: 2 },
      { roomNo: "103", floor: "1st Floor", occupants: [], rent: 12500, capacity: 2 },
      { roomNo: "201", floor: "2nd Floor", occupants: ["Rahul Singh"], rent: 14000, capacity: 1 },
      { roomNo: "202", floor: "2nd Floor", occupants: [], rent: 13000, capacity: 2 },
      { roomNo: "203", floor: "2nd Floor", occupants: [], rent: 13000, capacity: 2 }
    ]
  },
  {
    id: "PG003",
    name: "Happy Living PG",
    location: "Plot No. 12, Sector 15, Belapur, Navi Mumbai",
    floors: 4,
    roomsPerFloor: 3,
    capacity: 2,
    qrCode: null,
    rooms: [
      { roomNo: "101", floor: "1st Floor", occupants: ["Neha Gupta"], rent: 10500, capacity: 2 },
      { roomNo: "102", floor: "1st Floor", occupants: ["Vikram Kumar"], rent: 10000, capacity: 2 },
      { roomNo: "103", floor: "1st Floor", occupants: [], rent: 10500, capacity: 2 },
      { roomNo: "201", floor: "2nd Floor", occupants: ["Sunita Reddy"], rent: 11000, capacity: 2 },
      { roomNo: "202", floor: "2nd Floor", occupants: ["Manish Joshi", "Arjun Nair"], rent: 10000, capacity: 2 },
      { roomNo: "203", floor: "2nd Floor", occupants: [], rent: 11000, capacity: 2 },
      { roomNo: "301", floor: "3rd Floor", occupants: [], rent: 11500, capacity: 2 },
      { roomNo: "302", floor: "3rd Floor", occupants: ["David Chen"], rent: 12000, capacity: 1 },
      { roomNo: "303", floor: "3rd Floor", occupants: [], rent: 11500, capacity: 2 },
      { roomNo: "401", floor: "4th Floor", occupants: [], rent: 12000, capacity: 2 },
      { roomNo: "402", floor: "4th Floor", occupants: [], rent: 12000, capacity: 2 },
      { roomNo: "403", floor: "4th Floor", occupants: [], rent: 12500, capacity: 2 }
    ]
  }
];

// Tenants (Members) - Added arrivalDate field
LK.tenants = [
  {
    id: "T001", 
    name: "Amit Sharma", 
    email: "amit.sharma@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9876543210",
    gender: "Male", 
    pgId: "PG001",
    roomNo: "101", 
    rent: 11000, 
    securityFee: 5000,
    paymentDate: 5,
    paidPeriods: [{ from: "2026-05-05", to: "2026-06-04" }],
    billStatus: "unpaid", 
    dueMonths: ["July"], 
    dueAmount: 11000, 
    delayedDays: 0, 
    fine: 0,
    aadhar: "1234-5678-9012",
    parentAadhar: "",
    cForm: "",
    arrivalDate: "2026-01-15",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: false,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  },
  {
    id: "T002", 
    name: "Diego Alvarez", 
    email: "diego.alvarez@example.com", 
    role: "Tenant",
    residency: "International", 
    nationality: "Argentinian", 
    countryCode: "+54", 
    phone: "91123456",
    gender: "Male", 
    pgId: "PG001",
    roomNo: "102", 
    rent: 11000, 
    securityFee: 3000,
    paymentDate: 12,
    paidPeriods: [{ from: "2026-06-12", to: "2026-07-11" }],
    billStatus: "unfinished", 
    dueMonths: ["July"], 
    dueAmount: 4500, 
    delayedDays: 0, 
    fine: 0,
    aadhar: "",
    parentAadhar: "",
    cForm: "CF-2026-001",
    arrivalDate: "2026-02-01",
    docs: { 
      photo: true, 
      passport: true, 
      visa: true, 
      arrivalStamp: true,
      cForm: true,
      universityId: true,
      aadhar: false, 
      parentAadhar: false,
      frro: false
    }
  },
  {
    id: "T003", 
    name: "Riya Kapoor", 
    email: "riya.kapoor@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9812345678",
    gender: "Female", 
    pgId: "PG001",
    roomNo: "103", 
    rent: 13500, 
    securityFee: 6000,
    paymentDate: 1,
    paidPeriods: [{ from: "2026-07-01", to: "2026-07-31" }],
    billStatus: "paid", 
    dueMonths: [], 
    dueAmount: 0, 
    delayedDays: 0, 
    fine: 0,
    paidAmount: 13500, 
    paidDate: "2026-07-01", 
    nextPaymentDate: "2026-08-01",
    aadhar: "9876-5432-1098",
    parentAadhar: "4567-8901-2345",
    cForm: "",
    arrivalDate: "2026-03-10",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: true,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  },
  {
    id: "T004", 
    name: "Sara Chen", 
    email: "sara.chen@example.com", 
    role: "Tenant",
    residency: "International", 
    nationality: "Singaporean", 
    countryCode: "+65", 
    phone: "81234567",
    gender: "Female", 
    pgId: "PG001",
    roomNo: "201", 
    rent: 12000, 
    securityFee: 4000,
    paymentDate: 3,
    paidPeriods: [{ from: "2026-06-03", to: "2026-07-02" }],
    billStatus: "delayed", 
    dueMonths: ["July"], 
    dueAmount: 12000, 
    delayedDays: 9, 
    fine: 900,
    aadhar: "",
    parentAadhar: "",
    cForm: "CF-2026-004",
    arrivalDate: "2026-04-05",
    docs: { 
      photo: true, 
      passport: true, 
      visa: true, 
      arrivalStamp: false,
      cForm: true,
      universityId: true,
      aadhar: false, 
      parentAadhar: false,
      frro: false
    }
  },
  {
    id: "T005", 
    name: "Karan Mehta", 
    email: "karan.mehta@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9900112233",
    gender: "Male", 
    pgId: "PG001",
    roomNo: "203", 
    rent: 10000, 
    securityFee: 2500,
    paymentDate: 15,
    paidPeriods: [{ from: "2026-06-15", to: "2026-07-14" }],
    billStatus: "cash", 
    dueMonths: [], 
    dueAmount: 0, 
    delayedDays: 0, 
    fine: 0,
    paidAmount: 10000, 
    paidDate: "2026-07-14", 
    nextPaymentDate: "2026-08-14",
    aadhar: "5678-9012-3456",
    parentAadhar: "",
    cForm: "",
    arrivalDate: "2026-05-20",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: false,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  },
  {
    id: "T006", 
    name: "Vikram Rao", 
    email: "vikram.rao@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9871234560",
    gender: "Male", 
    pgId: "PG001",
    roomNo: "203", 
    rent: 10000, 
    securityFee: 3000,
    paymentDate: 20,
    paidPeriods: [{ from: "2026-06-20", to: "2026-07-19" }],
    billStatus: "unpaid", 
    dueMonths: ["July", "August"], 
    dueAmount: 20000, 
    delayedDays: 0, 
    fine: 0,
    aadhar: "3456-7890-1234",
    parentAadhar: "2345-6789-0123",
    cForm: "",
    arrivalDate: "2026-06-01",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: true,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  },
  {
    id: "T007", 
    name: "Anjali Nair", 
    email: "anjali.nair@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9765432109",
    gender: "Female", 
    pgId: "PG001",
    roomNo: "302", 
    rent: 11500, 
    securityFee: 3500,
    paymentDate: 8,
    paidPeriods: [{ from: "2026-07-08", to: "2026-08-07" }],
    billStatus: "paid", 
    dueMonths: [], 
    dueAmount: 0, 
    delayedDays: 0, 
    fine: 0,
    paidAmount: 11500, 
    paidDate: "2026-07-08", 
    nextPaymentDate: "2026-08-08",
    aadhar: "7890-1234-5678",
    parentAadhar: "",
    cForm: "",
    arrivalDate: "2026-06-15",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: false,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  },
  {
    id: "T008", 
    name: "Priya Patel", 
    email: "priya.patel@example.com", 
    role: "Tenant",
    residency: "National", 
    nationality: "Indian", 
    countryCode: "+91", 
    phone: "9876543120",
    gender: "Female", 
    pgId: "PG002",
    roomNo: "101", 
    rent: 13000, 
    securityFee: 4500,
    paymentDate: 10,
    paidPeriods: [{ from: "2026-07-10", to: "2026-08-09" }],
    billStatus: "paid", 
    dueMonths: [], 
    dueAmount: 0, 
    delayedDays: 0, 
    fine: 0,
    paidAmount: 13000, 
    paidDate: "2026-07-10", 
    nextPaymentDate: "2026-08-10",
    aadhar: "9012-3456-7890",
    parentAadhar: "",
    cForm: "",
    arrivalDate: "2026-07-01",
    docs: { 
      photo: true, 
      aadhar: true, 
      parentAadhar: false,
      universityId: false,
      passport: false, 
      visa: false, 
      frro: false, 
      cForm: false, 
      arrivalStamp: false
    }
  }
];

// Guests
LK.guests = [
  {
    id: "G001", 
    name: "Louis Meyer", 
    email: "louis.meyer@example.com", 
    role: "Guest",
    residency: "International", 
    nationality: "French", 
    countryCode: "+33", 
    phone: "612345678",
    joinedOn: "2026-07-18"
  },
  {
    id: "G002", 
    name: "Ken Tanaka", 
    email: "ken.tanaka@example.com", 
    role: "Guest",
    residency: "International", 
    nationality: "Japanese", 
    countryCode: "+81", 
    phone: "9012345678",
    joinedOn: "2026-06-30"
  },
  {
    id: "G003", 
    name: "Maria Garcia", 
    email: "maria.garcia@example.com", 
    role: "Guest",
    residency: "International", 
    nationality: "Spanish", 
    countryCode: "+34", 
    phone: "611223344",
    joinedOn: "2026-07-25"
  }
];

// Admins
LK.admins = [
  {
    id: "A001", 
    name: "Mo Snake", 
    email: "mosnake111@gmail.com", 
    phone: "9898989898", 
    role: "Admin",
    aadhar: "https://placehold.co/400x300/92C24A/FFFFFF?text=Aadhar",
    access: {
      tenants: { v: true, a: true, e: true, d: false },
      guests:  { v: true, a: true, e: false, d: false },
      admins:  { v: false, a: false, e: false, d: false },
      messages:{ v: true, a: true, e: true, d: false },
      bills:   { v: true, a: false, e: false, d: false },
      pgs:     { v: true, a: false, e: false, d: false },
      maintenance: { v: true, a: false, e: false, d: false },
      documents: { v: true, a: false, e: false, d: false }
    }
  }
];

// Conversations
LK.conversations = {
  "T001": [
    { from: "tenant", text: "Hi, I wanted to confirm my room cleaning schedule for this week.", time: "Yesterday, 6:12 PM" },
    { from: "admin", text: "Hello Amit! Housekeeping visits Tue & Fri, 10–12 PM.", time: "Yesterday, 6:20 PM", reactions: ["👍"] },
    { from: "tenant", text: "Perfect, thank you!", time: "Yesterday, 6:21 PM" }
  ],
  "T002": [
    { from: "admin", text: "Hi Diego, welcome back! Your July rent balance is ₹4,500.", time: "Today, 9:02 AM" },
    { from: "tenant", text: "Got it, paying it tonight 👍", time: "Today, 9:15 AM", reactions: ["❤️"] }
  ],
  "T004": [
    { from: "admin", text: "Hi Sara, your payment is 9 days overdue, a late fine of ₹900 applies.", time: "Today, 11:00 AM" }
  ],
  "T006": [
    { from: "tenant", text: "Can I get an extension till Friday?", time: "2 days ago, 4:40 PM" }
  ]
};

// Maintenance Requests - Added status field
LK.maintenance = [
  {
    id: "M001",
    roomNo: "101",
    tenantName: "Amit Sharma",
    email: "amit.sharma@example.com",
    type: "Plumber",
    serviceDate: "2026-07-25",
    freeTime: "2:00 PM - 4:00 PM",
    description: "Water leakage in bathroom sink. Please fix urgently.",
    picture: "https://placehold.co/400x300/FF6B6B/FFFFFF?text=Plumbing+Issue",
    status: "Pending"
  },
  {
    id: "M002",
    roomNo: "201",
    tenantName: "Sara Chen",
    email: "sara.chen@example.com",
    type: "AC",
    serviceDate: "2026-07-28",
    freeTime: "10:00 AM - 12:00 PM",
    description: "AC not cooling properly. Making weird noise.",
    picture: "https://placehold.co/400x300/4ECDC4/FFFFFF?text=AC+Issue",
    status: "In Progress"
  },
  {
    id: "M003",
    roomNo: "203",
    tenantName: "Karan Mehta",
    email: "karan.mehta@example.com",
    type: "Refrigerator",
    serviceDate: "2026-07-26",
    freeTime: "6:00 PM - 8:00 PM",
    description: "Refrigerator not cooling, food is spoiling.",
    picture: null,
    status: "Pending"
  },
  {
    id: "M004",
    roomNo: "302",
    tenantName: "Anjali Nair",
    email: "anjali.nair@example.com",
    type: "Toilet Heater",
    serviceDate: "2026-07-27",
    freeTime: "4:00 PM - 6:00 PM",
    description: "Geyser not working, no hot water.",
    picture: "https://placehold.co/400x300/FFA07A/FFFFFF?text=Heater+Issue",
    status: "Completed"
  },
  {
    id: "M005",
    roomNo: "102",
    tenantName: "Diego Alvarez",
    email: "diego.alvarez@example.com",
    type: "Kitchen",
    serviceDate: "2026-07-29",
    freeTime: "12:00 PM - 2:00 PM",
    description: "Kitchen sink blocked. Water not draining.",
    picture: null,
    status: "Pending"
  }
];

window.LK = LK;