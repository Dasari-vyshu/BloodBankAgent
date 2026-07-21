# Blood Bank Availability Agent

An AI-agent-style web app that helps people find blood fast during
emergencies: search a nationwide blood bank directory by blood group and
location, see suggested donors as a backup, and track recent searches from a
dashboard. Login is by **mobile number + OTP** (no email/password).

Built from the project brief and two datasets you supplied:
- `backend/data/blood-banks.csv` - national blood bank directory (~3,380 rows)
- `backend/data/donors.csv` - sample donor list with blood groups (~117 rows)

## Folder structure

```
blood-bank-availability-agent/
├── backend/                  Node.js + Express API
│   ├── controllers/          Request handlers (auth, blood banks, donors, search)
│   ├── routes/                Route definitions, mounted under /api
│   ├── middleware/           JWT auth guard for protected routes
│   ├── db/
│   │   └── store.js           Loads both CSVs into memory at startup and
│   │                          holds users/OTPs/search history for the
│   │                          life of the process (see "Data storage" below)
│   ├── data/                 Source CSVs (already copied in for you)
│   ├── server.js             App entry point
│   ├── package.json
│   └── .env.example          Copy to .env and edit
└── frontend/                  Plain HTML/CSS/JS (no build step)
    ├── index.html             Login page (mobile number + OTP)
    ├── dashboard.html         Main dashboard (protected)
    ├── css/style.css
    └── js/
        ├── api.js             Shared fetch helper + session storage
        ├── login.js           Login page logic
        └── dashboard.js       Dashboard logic
```

## Data storage

This project intentionally has **no database server and no native
dependencies to compile**. On startup, `backend/db/store.js` reads both
CSV files straight into memory and the API filters/searches those in-memory
arrays directly. This keeps setup to just `npm install` + `npm start` on any
machine - no SQLite, no Visual Studio Build Tools, no Postgres/MySQL install.

Trade-off: logged-in users, OTPs, and search history reset whenever the
server restarts, since nothing is written to disk. The blood bank and donor
data reloads fresh from the CSVs every time, so that part is always
consistent.

If you later want data to persist across restarts (e.g. for a real
deployment), swap `db/store.js` for a real database - a JSON-file store via
`lowdb`, or SQLite via `better-sqlite3` if your environment can compile
native modules, or a hosted Postgres/MySQL instance.

## How login works

1. User enters a 10-digit mobile number → `POST /api/auth/send-otp`.
2. Server generates a 6-digit OTP, stores it against that number in memory
   (5 min expiry), and "sends" it. **No real SMS gateway is wired up.** With
   `OTP_DEBUG_MODE=true` (the default) the OTP is returned in the API
   response and shown on screen, so you can log in and demo the whole app
   without paying for SMS.
3. User enters the OTP → `POST /api/auth/verify-otp` → server returns a JWT.
4. The frontend stores the JWT in `localStorage` and sends it as
   `Authorization: Bearer <token>` on every dashboard API call.

### Wiring up real SMS (for production)

Replace the `console.log` in `backend/controllers/authController.js`
(`sendOtp` function) with a call to an SMS provider, for example:

- **Twilio Verify** - `npm install twilio`, use their Verify API which
  handles OTP generation/expiry for you.
- **MSG91 / 2Factor** (popular for Indian numbers) - plain HTTP APIs, call
  with `fetch`/`axios` passing the OTP you already generated.

Once a real provider is in place, set `OTP_DEBUG_MODE=false` in `.env` so
the OTP is never exposed in the API response.

## Setup

Requires **Node.js 18+**.

```bash
cd backend
npm install
copy .env.example .env      # Windows PowerShell/cmd
# cp .env.example .env      # macOS/Linux
notepad .env                 # edit JWT_SECRET to a long random string, save, close
npm start
```

You'll see:
```
Loaded 3384 blood banks.
Loaded 117 donors.
Blood Bank Availability Agent API running on http://localhost:5000
```

Open **http://localhost:5000** in a browser - the same Express server
serves the frontend as static files, so you don't need a second server or
a build step. Log in with any valid-looking Indian mobile number (e.g.
`9876543210`); the OTP will appear on screen in debug mode.

### Running frontend and backend separately (optional)

If you'd rather serve the frontend from a different tool (e.g. VS Code Live
Server) during development:
1. Keep `npm start` running the API on port 5000.
2. Open `frontend/index.html` directly, or serve `frontend/` with any static
   file server.
3. In `frontend/js/api.js`, change `API_BASE = "/api"` to
   `API_BASE = "http://localhost:5000/api"`.
4. Add proper CORS origin restrictions in `server.js` (`cors()` currently
   allows all origins, which is fine for local dev only).

## API reference

All routes below except `/api/auth/*` require `Authorization: Bearer <token>`.

| Method | Path                              | Purpose                                   |
|--------|------------------------------------|--------------------------------------------|
| POST   | `/api/auth/send-otp`              | Request an OTP for a mobile number         |
| POST   | `/api/auth/verify-otp`            | Verify OTP, receive a JWT                  |
| GET    | `/api/stats`                      | Summary counts for dashboard cards         |
| GET    | `/api/blood-banks`                | Search directory (`state`, `district`, `city`, `search`, `page`, `limit`) |
| GET    | `/api/blood-banks/:id`            | Full details for one blood bank            |
| GET    | `/api/blood-banks/meta/states`    | Distinct states, for a dropdown            |
| GET    | `/api/blood-banks/meta/districts` | Distinct districts (optionally `?state=`)  |
| GET    | `/api/blood-banks/meta/cities`    | Distinct cities (optionally `?state=&district=`) |
| GET    | `/api/donors`                     | List donors (`bloodGroup`, `search`)       |
| POST   | `/api/search`                     | Emergency search: blood banks by location + donors by blood group; logs the search |
| GET    | `/api/search/history`             | Logged-in user's last 20 searches          |

## Known limitations / next steps

- The public dataset lists blood **banks**, not live per-unit inventory by
  blood group - there's no column saying "12 units of O- in stock." The
  `/api/search` endpoint is honest about this: it returns nearby blood
  banks (by location) plus donors matching the requested blood group as a
  backup, rather than pretending to show live stock. If you get access to a
  blood-bank inventory API/feed, swap the lookup logic in
  `donorController.js` for a real one.
- Distance ranking currently sorts alphabetically, not by proximity. Every
  blood bank record already has `latitude`/`longitude` loaded into memory -
  add a haversine-distance calculation in `bloodBankController.js` /
  `donorController.js` once you have the user's coordinates (browser
  geolocation on the frontend, sent up with the search request).
- OTP delivery is simulated (see "Wiring up real SMS" above).
- Users, OTPs, and search history live in memory only and reset on server
  restart (see "Data storage" above) - fine for a demo/college project, not
  for production.
- No password/email fallback login - by design, per your request for
  mobile-number login.
- No automated tests yet. Given the moving pieces (auth, search), I'd
  suggest adding a few integration tests with `supertest` around
  `/api/auth/*` and `/api/search` before treating this as production-ready.
