// controllers/donorController.js
const { getDistance } = require("geolib");
const store = require("../db/store");

/** GET /api/donors?bloodGroup=&search= */
function listDonors(req, res) {
  const { bloodGroup, search } = req.query;
  let rows = store.getDonors().filter((d) => {
    if (bloodGroup && !store.equalsIgnoreCase(d.blood_group, bloodGroup)) return false;
    if (search && !store.contains(d.name, search)) return false;
    return true;
  });
  rows = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
  res.json({ total: rows.length, results: rows });
}

/**
 * POST /api/search
 * body: { bloodGroup, state, district, city, unitsRequired, emergencyLevel }
 * This is the main "find blood fast" action from the dashboard. It combines
 * a location-based blood bank lookup with a blood-group-based donor match,
 * and logs the request so it shows up in the user's recent search history.
 */
function runEmergencySearch(req, res) {
  const { 
  bloodGroup, 
  state, 
  district, 
  city, 
  unitsRequired, 
  emergencyLevel,
  userLat,
  userLng
} = req.body;

  let bloodBanks = store.getBloodBanks().filter((b) => {
    if (state && !store.contains(b.state, state)) return false;
    if (district && !store.contains(b.district, district)) return false;
    if (city && !store.contains(b.city, city)) return false;
    return true;
  });
  bloodBanks = bloodBanks
    .slice()
    .sort((a, b) => {
  if (!userLat || !userLng) {
    return a.name.localeCompare(b.name);
  }

  const distA = getDistance(
    {
      latitude: Number(userLat),
      longitude: Number(userLng),
    },
    {
      latitude: Number(a.latitude),
      longitude: Number(a.longitude),
    }
  );

  const distB = getDistance(
    {
      latitude: Number(userLat),
      longitude: Number(userLng),
    },
    {
      latitude: Number(b.latitude),
      longitude: Number(b.longitude),
    }
  );

  return distA - distB;
})
    .slice(0, 50)
    .map((b) => {

  let distance_km = null;

  if (
    userLat &&
    userLng &&
    b.latitude &&
    b.longitude
  ) {
    distance_km =
      getDistance(
        {
          latitude: Number(userLat),
          longitude: Number(userLng),
        },
        {
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
        }
      ) / 1000;
  }

  return {
    id: b.id,
    name: b.name,
    state: b.state,
    district: b.district,
    city: b.city,
    address: b.address,
    contact_no: b.contact_no,
    mobile: b.mobile,
    helpline: b.helpline,
    email: b.email,
    blood_component_available: b.blood_component_available,
    service_time: b.service_time,
    latitude: b.latitude,
    longitude: b.longitude,
    distance_km: distance_km 
      ? distance_km.toFixed(2) 
      : null,
  };
});

  let notificationMessage = null;

if (bloodBanks.length === 0 && donors.length > 0) {
  notificationMessage =
    `Blood unavailable. Alert sent to ${donors.length} matching donors.`;

  console.log("===== NOTIFICATION AGENT =====");
  console.log(notificationMessage);

  donors.forEach((donor) => {
    console.log(
      `Alert sent to ${donor.name} (${donor.mobile || donor.phone || "No Phone"})`
    );
  });
}
  store.addSearchRequest({
    mobile: req.user.mobile,
    blood_group: bloodGroup || null,
    state: state || null,
    district: district || null,
    city: city || null,
    units_required: unitsRequired ? parseInt(unitsRequired, 10) : null,
    emergency_level: emergencyLevel || null,
    results_count: bloodBanks.length,
    created_at: Date.now(),
  });

  res.json({
  bloodBanks,
  suggestedDonors: donors,
  notificationMessage,
  note:
    "Blood banks are matched by location. Per-unit live inventory isn't in the demo dataset, so donors are suggested as a backup by matching blood group.",
});
}

/** GET /api/search/history - the logged-in user's recent searches */
function getSearchHistory(req, res) {
  const rows = store.searchRequests
    .filter((r) => r.mobile === req.user.mobile)
    .slice(0, 20)
    .map(({ id, blood_group, state, district, city, units_required, emergency_level, results_count, created_at }) => ({
      id,
      blood_group,
      state,
      district,
      city,
      units_required,
      emergency_level,
      results_count,
      created_at,
    }));
  res.json(rows);
}

module.exports = { listDonors, runEmergencySearch, getSearchHistory };
