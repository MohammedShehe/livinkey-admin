/* ==========================================================================
   Livinkey Admin — Mock Data Layer
   Frontend-only demo data. In a real build this is replaced by API calls.
   ========================================================================== */

const LK = window.LK || {};

LK.credentials = {
  "molittle1011@gmail.com": { password: "super@123", role: "Super Admin", name: "Molly Little" },
  "mosnake111@gmail.com":   { password: "admin@123",  role: "Admin",       name: "Mo Snake" },
  "neha.joshi@livinkey.com": { password: "admin@123", role: "Admin", name: "Neha Joshi" },
  "rahul.bose@livinkey.com": { password: "admin@123", role: "Admin", name: "Rahul Bose" }
};

LK.notificationsCount = 6;

LK.rooms = [
  { id: "R101", roomNo: "101", floor: "1st Floor", capacity: 2, rent: 11000, occupants: ["Amit Sharma"] },
  { id: "R102", roomNo: "102", floor: "1st Floor", capacity: 2, rent: 11000, occupants: ["Diego Alvarez", "Louis Meyer"] },
  { id: "R103", roomNo: "103", floor: "1st Floor", capacity: 1, rent: 13500, occupants: ["Riya Kapoor"] },
  { id: "R201", roomNo: "201", floor: "2nd Floor", capacity: 2, rent: 12000, occupants: ["Sara Chen"] },
  { id: "R202", roomNo: "202", floor: "2nd Floor", capacity: 2, rent: 12000, occupants: [] },
  { id: "R203", roomNo: "203", floor: "2nd Floor", capacity: 3, rent: 10000, occupants: ["Karan Mehta", "Vikram Rao"] },
  { id: "R301", roomNo: "301", floor: "3rd Floor", capacity: 1, rent: 14000, occupants: [] },
  { id: "R302", roomNo: "302", floor: "3rd Floor", capacity: 2, rent: 11500, occupants: ["Anjali Nair"] }
];

/* Members (role: Member) + Guests (role: Guest) share one array; guests carry fewer fields */
LK.users = [
  {
    id: "U001", name: "Amit Sharma", email: "amit.sharma@example.com", role: "Member",
    residency: "National", country: "India", countryCode: "+91", phone: "9876543210",
    gender: "Male", roomNo: "101", rent: 11000, paymentDate: 5,
    paidPeriods: [{ from: "2026-05-05", to: "2026-06-04" }],
    billStatus: "unpaid", dueMonths: ["July"], dueAmount: 11000, delayedDays: 0, fine: 0,
    docs: { user: true, cForm: false, passport: false, frro: false, visa: false, arrival: false }
  },
  {
    id: "U002", name: "Diego Alvarez", email: "diego.alvarez@example.com", role: "Member",
    residency: "International", country: "Argentina", countryCode: "+54", phone: "91123456",
    gender: "Male", roomNo: "102", rent: 11000, paymentDate: 12,
    paidPeriods: [{ from: "2026-06-12", to: "2026-07-11" }],
    billStatus: "unfinished", dueMonths: ["July"], dueAmount: 4500, delayedDays: 0, fine: 0,
    docs: { user: true, cForm: true, passport: true, frro: true, visa: true, arrival: true }
  },
  {
    id: "U003", name: "Riya Kapoor", email: "riya.kapoor@example.com", role: "Member",
    residency: "National", country: "India", countryCode: "+91", phone: "9812345678",
    gender: "Female", roomNo: "103", rent: 13500, paymentDate: 1,
    paidPeriods: [{ from: "2026-07-01", to: "2026-07-31" }],
    billStatus: "paid", dueMonths: [], dueAmount: 0, delayedDays: 0, fine: 0,
    paidAmount: 13500, paidDate: "2026-07-01", nextPaymentDate: "2026-08-01",
    docs: { user: true, cForm: false, passport: false, frro: false, visa: false, arrival: false }
  },
  {
    id: "U004", name: "Sara Chen", email: "sara.chen@example.com", role: "Member",
    residency: "International", country: "Singapore", countryCode: "+65", phone: "81234567",
    gender: "Female", roomNo: "201", rent: 12000, paymentDate: 3,
    paidPeriods: [{ from: "2026-06-03", to: "2026-07-02" }],
    billStatus: "delayed", dueMonths: ["July"], dueAmount: 12000, delayedDays: 9, fine: 900,
    docs: { user: true, cForm: true, passport: true, frro: false, visa: true, arrival: false }
  },
  {
    id: "U005", name: "Karan Mehta", email: "karan.mehta@example.com", role: "Member",
    residency: "National", country: "India", countryCode: "+91", phone: "9900112233",
    gender: "Male", roomNo: "203", rent: 10000, paymentDate: 15,
    paidPeriods: [{ from: "2026-06-15", to: "2026-07-14" }],
    billStatus: "cash", dueMonths: [], dueAmount: 0, delayedDays: 0, fine: 0,
    paidAmount: 10000, paidDate: "2026-07-14", nextPaymentDate: "2026-08-14",
    docs: { user: true, cForm: false, passport: false, frro: false, visa: false, arrival: false }
  },
  {
    id: "U006", name: "Vikram Rao", email: "vikram.rao@example.com", role: "Member",
    residency: "National", country: "India", countryCode: "+91", phone: "9871234560",
    gender: "Male", roomNo: "203", rent: 10000, paymentDate: 20,
    paidPeriods: [{ from: "2026-06-20", to: "2026-07-19" }],
    billStatus: "unpaid", dueMonths: ["July", "August"], dueAmount: 20000, delayedDays: 0, fine: 0,
    docs: { user: true, cForm: false, passport: false, frro: false, visa: false, arrival: false }
  },
  {
    id: "U007", name: "Anjali Nair", email: "anjali.nair@example.com", role: "Member",
    residency: "National", country: "India", countryCode: "+91", phone: "9765432109",
    gender: "Female", roomNo: "302", rent: 11500, paymentDate: 8,
    paidPeriods: [{ from: "2026-07-08", to: "2026-08-07" }],
    billStatus: "paid", dueMonths: [], dueAmount: 0, delayedDays: 0, fine: 0,
    paidAmount: 11500, paidDate: "2026-07-08", nextPaymentDate: "2026-08-08",
    docs: { user: true, cForm: false, passport: false, frro: false, visa: false, arrival: false }
  },
  {
    id: "G001", name: "Louis Meyer", email: "louis.meyer@example.com", role: "Guest",
    residency: "International", country: "France", countryCode: "+33", phone: "612345678",
    joinedOn: "2026-07-18"
  },
  {
    id: "G002", name: "Priya Verma", email: "priya.verma@example.com", role: "Guest",
    residency: "National", country: "India", countryCode: "+91", phone: "9123456780",
    joinedOn: "2026-07-22"
  },
  {
    id: "G003", name: "Ken Tanaka", email: "ken.tanaka@example.com", role: "Guest",
    residency: "International", country: "Japan", countryCode: "+81", phone: "9012345678",
    joinedOn: "2026-06-30"
  }
];

LK.admins = [
  {
    id: "A001", name: "Mo Snake", email: "mosnake111@gmail.com", phone: "9898989898", role: "Admin",
    access: {
      members: { v: true, a: true, e: true, d: false },
      guests:  { v: true, a: true, e: false, d: false },
      admins:  { v: false, a: false, e: false, d: false },
      messages:{ v: true, a: true, e: true, d: false },
      bills:   { v: true, a: false, e: false, d: false },
      rooms:   { v: true, a: false, e: false, d: false }
    }
  },
  {
    id: "A002", name: "Neha Joshi", email: "neha.joshi@livinkey.com", phone: "9090909090", role: "Admin",
    access: {
      members: { v: true, a: false, e: false, d: false },
      guests:  { v: true, a: true, e: true, d: true },
      admins:  { v: false, a: false, e: false, d: false },
      messages:{ v: true, a: true, e: false, d: false },
      bills:   { v: true, a: true, e: true, d: false },
      rooms:   { v: true, a: true, e: false, d: false }
    }
  },
  {
    id: "A003", name: "Rahul Bose", email: "rahul.bose@livinkey.com", phone: "9080706050", role: "Admin",
    access: {
      members: { v: true, a: true, e: true, d: true },
      guests:  { v: true, a: true, e: true, d: true },
      admins:  { v: false, a: false, e: false, d: false },
      messages:{ v: true, a: true, e: true, d: true },
      bills:   { v: true, a: true, e: true, d: true },
      rooms:   { v: true, a: true, e: true, d: false }
    }
  }
];

LK.conversations = {
  "U001": [
    { from: "member", text: "Hi, I wanted to confirm my room cleaning schedule for this week.", time: "Yesterday, 6:12 PM" },
    { from: "admin", text: "Hello Amit! Housekeeping visits Tue & Fri, 10–12 PM.", time: "Yesterday, 6:20 PM", reactions: ["👍"] },
    { from: "member", text: "Perfect, thank you!", time: "Yesterday, 6:21 PM" }
  ],
  "U002": [
    { from: "admin", text: "Hi Diego, welcome back! Your July rent balance is ₹4,500.", time: "Today, 9:02 AM" },
    { from: "member", text: "Got it, paying it tonight 👍", time: "Today, 9:15 AM", reactions: ["❤️"] }
  ],
  "U004": [
    { from: "admin", text: "Hi Sara, your payment is 9 days overdue, a late fine of ₹900 applies.", time: "Today, 11:00 AM" }
  ],
  "U006": [
    { from: "member", text: "Can I get an extension till Friday?", time: "2 days ago, 4:40 PM" }
  ]
};

window.LK = LK;