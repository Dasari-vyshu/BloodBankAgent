// js/dashboard.js

if (!getToken()) {
  window.location.href = "index.html";
}

document.getElementById("userMobile").textContent = `+91 ${getMobile() || ""}`;

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  window.location.href = "index.html";
});

const searchAlert = document.getElementById("searchAlert");
function showSearchAlert(message, type = "error") {
  searchAlert.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}
function clearSearchAlert() {
  searchAlert.innerHTML = "";
}

// ---------- Stats cards ----------
async function loadStats() {
  try {
    const data = await apiRequest("/stats", { auth: true });
    document.getElementById("statBanks").textContent = data.bloodBankCount.toLocaleString();
    document.getElementById("statStates").textContent = data.stateCount.toLocaleString();
    document.getElementById("statDonors").textContent = data.donorCount.toLocaleString();
  } catch (err) {
    // Non-critical - leave the placeholder dashes in place.
    console.error(err);
  }
}

// ---------- Location dropdowns ----------
const stateSelect = document.getElementById("state");
const districtSelect = document.getElementById("district");
const citySelect = document.getElementById("city");

function fillSelect(select, values, placeholder = "Any") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

async function loadStates() {
  try {
    const states = await apiRequest("/blood-banks/meta/states", { auth: true });
    fillSelect(stateSelect, states);
  } catch (err) {
    console.error(err);
  }
}

async function loadDistricts(state) {
  try {
    const path = state ? `/blood-banks/meta/districts?state=${encodeURIComponent(state)}` : "/blood-banks/meta/districts";
    const districts = await apiRequest(path, { auth: true });
    fillSelect(districtSelect, districts);
  } catch (err) {
    console.error(err);
  }
}

async function loadCities(state, district) {
  try {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    const qs = params.toString();
    const cities = await apiRequest(`/blood-banks/meta/cities${qs ? "?" + qs : ""}`, { auth: true });
    fillSelect(citySelect, cities);
  } catch (err) {
    console.error(err);
  }
}

stateSelect.addEventListener("change", () => {
  loadDistricts(stateSelect.value);
  loadCities(stateSelect.value, "");
  districtSelect.value = "";
});

districtSelect.addEventListener("change", () => {
  loadCities(stateSelect.value, districtSelect.value);
});

// ---------- Emergency search ----------
const searchForm = document.getElementById("searchForm");
const resultsContainer = document.getElementById("resultsContainer");
const donorsContainer = document.getElementById("donorsContainer");

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderBloodBanks(banks) {
  if (!banks.length) {
    resultsContainer.innerHTML =
      '<div class="empty-state">No blood banks found for that location. Try widening your search.</div>';
    return;
  }

  const rows = banks
    .map(
      (b) => `
      <tr>
        <td><strong>${escapeHtml(b.name || "")}</strong></td>
        <td>
          ${escapeHtml(b.city || "")}
          ${b.district ? ", " + escapeHtml(b.district) : ""}
          <br>
          ${escapeHtml(b.state || "")}
        </td>
        <td>${escapeHtml(b.contact_no || b.mobile || b.helpline || "—")}</td>
        <td>${escapeHtml(b.distance_km ? b.distance_km + " km" : "—")}</td>
        <td>${escapeHtml(b.service_time || "—")}</td>
      </tr>`
    )
    .join("");

  resultsContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Blood Bank</th>
          <th>Location</th>
          <th>Contact</th>
          <th>Distance</th>
          <th>Service Time</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderDonors(donors) {
  if (!donors.length) {
    donorsContainer.innerHTML = '<div class="empty-state">No donor matches for this blood group yet.</div>';
    return;
  }
  const chips = donors.map((d) => `<span class="donor-chip">${escapeHtml(d.name)} · ${escapeHtml(d.blood_group)}</span>`).join("");
  donorsContainer.innerHTML = `<div class="donor-chip-list">${chips}</div>`;
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearSearchAlert();

  const bloodGroup = document.getElementById("bloodGroup").value;
  if (!bloodGroup) {
    showSearchAlert("Select a blood group to search.");
    return;
  }

  const payload = {
  bloodGroup,
  state: stateSelect.value,
  district: districtSelect.value,
  city: citySelect.value,
  unitsRequired: document.getElementById("unitsRequired").value,
  emergencyLevel: document.getElementById("emergencyLevel").value,

  userLat,
  userLng
};

  const btn = document.getElementById("searchBtn");
  btn.disabled = true;
  btn.textContent = "Searching…";
  resultsContainer.innerHTML = '<div class="loader">Searching connected blood banks…</div>';
  donorsContainer.innerHTML = '<div class="loader">Matching donors…</div>';

  try {
    const data = await apiRequest("/search", { method: "POST", auth: true, body: payload });
    console.log(data);
    renderBloodBanks(data.bloodBanks);
    renderDonors(data.suggestedDonors);
    showBloodBankMarkers(data.bloodBanks);
    loadHistory();
  } catch (err) {
    showSearchAlert(err.message);
    resultsContainer.innerHTML = '<div class="empty-state">Search failed. Try again.</div>';
    donorsContainer.innerHTML = "";
  } finally {
    btn.disabled = false;
    btn.textContent = "Search";
  }
});

// ---------- Recent search history ----------
const historyContainer = document.getElementById("historyContainer");

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

async function loadHistory() {
  try {
    const history = await apiRequest("/search/history", { auth: true });
    if (!history.length) {
      historyContainer.innerHTML = '<div class="empty-state">No searches yet.</div>';
      return;
    }
    historyContainer.innerHTML = history
      .map(
        (h) => `
        <div class="history-item">
          <div>
            <div><span class="badge badge-red">${escapeHtml(h.blood_group || "Any")}</span> ${escapeHtml(h.city || h.district || h.state || "Anywhere")}</div>
            <div class="meta">${h.results_count} result(s) · <span class="emergency-${escapeHtml(h.emergency_level || "")}">${escapeHtml(h.emergency_level || "")}</span></div>
          </div>
          <div class="meta">${formatDate(h.created_at)}</div>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

// ---------- Directory browse ----------
const directoryInput = document.getElementById("directorySearch");
const directoryContainer = document.getElementById("directoryContainer");
let directoryDebounce;

directoryInput.addEventListener("input", () => {
  clearTimeout(directoryDebounce);
  const term = directoryInput.value.trim();
  if (!term) {
    directoryContainer.innerHTML = '<div class="empty-state">Type a name above to search the full directory.</div>';
    return;
  }
  directoryDebounce = setTimeout(() => searchDirectory(term), 350);
});

async function searchDirectory(term) {
  directoryContainer.innerHTML = '<div class="loader">Searching…</div>';
  try {
    const data = await apiRequest(`/blood-banks?search=${encodeURIComponent(term)}&limit=25`, { auth: true });
    if (!data.results.length) {
      directoryContainer.innerHTML = '<div class="empty-state">No matches found.</div>';
      return;
    }
    const rows = data.results
      .map(
        (b) => `
        <tr>
          <td><strong>${escapeHtml(b.name)}</strong></td>
          <td>${escapeHtml(b.city || "")}, ${escapeHtml(b.state || "")}</td>
          <td>${escapeHtml(b.contact_no || b.mobile || "—")}</td>
        </tr>`
      )
      .join("");
    directoryContainer.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Location</th><th>Contact</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="hint" style="margin-top:8px;">Showing ${data.results.length} of ${data.total} matches.</div>`;
  } catch (err) {
    directoryContainer.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

// ---------- Init ----------
loadStats();
loadStates();
loadDistricts("");
loadCities("", "");
loadHistory();

// ---------- Google Maps ----------
let map;
let userLat = null;
let userLng = null;

function showBloodBankMarkers(bloodBanks) {

    bloodBanks.forEach((bank) => {

        if (!bank.latitude || !bank.longitude) {
            return;
        }

        new google.maps.Marker({
            position: {
                lat: Number(bank.latitude),
                lng: Number(bank.longitude)
            },
            map: map,
            title: bank.name
        });

    });
}

function initMap() {

    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: {
                lat: 20.5937,
                lng: 78.9629
            },
            zoom: 5
        }
    );

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            (position) => {

                userLat = position.coords.latitude;
                userLng = position.coords.longitude;

                map.setCenter({
                    lat: userLat,
                    lng: userLng
                });

                map.setZoom(12);

                new google.maps.Marker({
                    position: {
                        lat: userLat,
                        lng: userLng
                    },
                    map: map,
                    title: "Your Location"
                });

            },

            (error) => {
                console.log("Location access denied", error);
            }

        );
    }
}