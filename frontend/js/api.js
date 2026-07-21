// js/api.js
// Small fetch wrapper shared by login.js and dashboard.js.
// Assumes the frontend is served by the same Express server as the API
// (see backend/server.js), so relative "/api/..." URLs work as-is.
// If you host the frontend separately, change API_BASE to the full backend URL.

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("bba_token");
}

function setSession(token, mobile) {
  localStorage.setItem("bba_token", token);
  localStorage.setItem("bba_mobile", mobile);
}

function clearSession() {
  localStorage.removeItem("bba_token");
  localStorage.removeItem("bba_mobile");
}

function getMobile() {
  return localStorage.getItem("bba_mobile");
}

async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (!token) {
      window.location.href = "index.html";
      throw new Error("Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (res.status === 401 && auth) {
    clearSession();
    window.location.href = "index.html";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}
