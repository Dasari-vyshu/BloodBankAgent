// controllers/bloodBankController.js
const store = require("../db/store");

/**
 * GET /api/blood-banks
 * query: state, district, city, search, page, limit
 * Location-based directory search over the seeded blood bank dataset.
 */
function listBloodBanks(req, res) {
  const { state, district, city, search } = req.query;
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = (page - 1) * limit;

  let rows = store.getBloodBanks().filter((b) => {
    if (state && !store.contains(b.state, state)) return false;
    if (district && !store.contains(b.district, district)) return false;
    if (city && !store.contains(b.city, city)) return false;
    if (search && !store.contains(b.name, search)) return false;
    return true;
  });

  rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  const total = rows.length;
  const page_rows = rows.slice(offset, offset + limit).map((b) => ({
    id: b.id,
    name: b.name,
    state: b.state,
    district: b.district,
    city: b.city,
    address: b.address,
    pincode: b.pincode,
    contact_no: b.contact_no,
    mobile: b.mobile,
    helpline: b.helpline,
    email: b.email,
    website: b.website,
    category: b.category,
    blood_component_available: b.blood_component_available,
    service_time: b.service_time,
    latitude: b.latitude,
    longitude: b.longitude,
  }));

  res.json({ total, page, limit, results: page_rows });
}

/** GET /api/blood-banks/:id */
function getBloodBank(req, res) {
  const id = parseInt(req.params.id, 10);
  const row = store.getBloodBanks().find((b) => b.id === id);
  if (!row) return res.status(404).json({ error: "Blood bank not found." });
  res.json(row);
}

/** GET /api/blood-banks/meta/states - distinct states for a dropdown */
function listStates(req, res) {
  const states = store.distinctSorted(store.getBloodBanks().map((b) => b.state));
  res.json(states);
}

/** GET /api/blood-banks/meta/districts?state=... */
function listDistricts(req, res) {
  const { state } = req.query;
  const rows = store.getBloodBanks().filter((b) => !state || store.equalsIgnoreCase(b.state, state));
  res.json(store.distinctSorted(rows.map((b) => b.district)));
}

/** GET /api/blood-banks/meta/cities?state=&district= */
function listCities(req, res) {
  const { state, district } = req.query;
  const rows = store.getBloodBanks().filter((b) => {
    if (state && !store.equalsIgnoreCase(b.state, state)) return false;
    if (district && !store.equalsIgnoreCase(b.district, district)) return false;
    return true;
  });
  res.json(store.distinctSorted(rows.map((b) => b.city)));
}

/** GET /api/stats - summary numbers for the dashboard header cards */
function getStats(req, res) {
  const bloodBanks = store.getBloodBanks();
  const bloodBankCount = bloodBanks.length;
  const stateCount = store.distinctSorted(bloodBanks.map((b) => b.state)).length;
  const donorCount = store.getDonors().length;
  res.json({ bloodBankCount, stateCount, donorCount });
}

module.exports = { listBloodBanks, getBloodBank, listStates, listDistricts, listCities, getStats };
