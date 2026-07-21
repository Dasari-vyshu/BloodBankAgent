// db/store.js
// Pure-JS in-memory data store. Replaces the earlier SQLite-based design so
// the project runs on Windows without a C++ build toolchain (better-sqlite3
// needs native compilation, which requires Visual Studio Build Tools).
//
// The dataset here is small (~3,500 rows total), so loading it into memory
// at startup and filtering with plain JS is simple and fast enough. The
// trade-off: users, OTPs, and search history reset whenever the server
// restarts. If you need that to persist across restarts, swap this file
// for a real database once your environment can build native modules (or
// use a pure-JS DB like lowdb / sql.js).

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const BLOOD_BANKS_CSV = path.join(__dirname, "..", "data", "blood-banks.csv");
const DONORS_CSV = path.join(__dirname, "..", "data", "donors.csv");

let bloodBanks = [];
let donors = [];

// mobile -> { mobile, otp, otpExpiresAt, createdAt, lastLoginAt }
const users = new Map();

// in-memory log of emergency searches, newest first is easiest via unshift
const searchRequests = [];
let nextSearchId = 1;

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/#/g, "no").replace(/\s+/g, "_");
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parse(raw, {
    columns: (header) => header.map(normalizeKey),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

function loadBloodBanks() {
  if (!fs.existsSync(BLOOD_BANKS_CSV)) {
    console.warn(`No file found at ${BLOOD_BANKS_CSV}, blood bank list will be empty.`);
    return;
  }
  const rows = readCsv(BLOOD_BANKS_CSV);
  bloodBanks = rows.map((r, i) => ({
    id: i + 1,
    name: r.blood_bank_name || r.name || "Unknown",
    state: r.state || "",
    district: r.district || "",
    city: r.city || "",
    address: r.address || "",
    pincode: r.pincode || "",
    contact_no: r.contact_no || "",
    mobile: r.mobile || "",
    helpline: r.helpline || "",
    fax: r.fax || "",
    email: r.email || "",
    website: r.website || "",
    nodal_officer: r.nodal_officer || "",
    contact_nodal_officer: r.contact_nodal_officer || "",
    mobile_nodal_officer: r.mobile_nodal_officer || "",
    email_nodal_officer: r.email_nodal_officer || "",
    qualification_nodal_officer: r.qualification_nodal_officer || "",
    category: r.category || "",
    blood_component_available: r.blood_component_available || "",
    apheresis: r.apheresis || "",
    service_time: r.service_time || "",
    license_no: r.license_no || "",
    date_license_obtained: r.date_license_obtained || "",
    date_of_renewal: r.date_of_renewal || "",
    latitude: r.latitude ? parseFloat(r.latitude) : null,
    longitude: r.longitude ? parseFloat(r.longitude) : null,
  }));
  console.log(`Loaded ${bloodBanks.length} blood banks.`);
}

function loadDonors() {
  if (!fs.existsSync(DONORS_CSV)) {
    console.warn(`No file found at ${DONORS_CSV}, donor list will be empty.`);
    return;
  }
  const rows = readCsv(DONORS_CSV);
  let id = 1;
  donors = rows
    .map((r) => ({ name: (r.name || r.donor_name || "").trim(), blood_group: (r.blood_group || r.bloodgroup || "").trim() }))
    .filter((d) => d.name && d.blood_group)
    .map((d) => ({ id: id++, ...d }));
  console.log(`Loaded ${donors.length} donors.`);
}

function init() {
  loadBloodBanks();
  loadDonors();
}

// ---------- helpers used by controllers ----------

function contains(haystack, needle) {
  if (!needle) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(String(needle).toLowerCase());
}

function equalsIgnoreCase(a, b) {
  if (!b) return true;
  if (!a) return false;
  return a.toLowerCase() === String(b).toLowerCase();
}

function distinctSorted(values) {
  return [...new Set(values.filter((v) => v && v.trim() !== ""))].sort((a, b) => a.localeCompare(b));
}

module.exports = {
  init,
  getBloodBanks: () => bloodBanks,
  getDonors: () => donors,
  users,
  searchRequests,
  addSearchRequest(entry) {
    const record = { id: nextSearchId++, ...entry };
    searchRequests.unshift(record);
    return record;
  },
  contains,
  equalsIgnoreCase,
  distinctSorted,
};
