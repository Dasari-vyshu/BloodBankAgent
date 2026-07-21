// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const store = require("./db/store");

// Load the blood bank and donor CSVs into memory before the server starts
// handling requests.
store.init();

const authRoutes = require("./routes/auth.routes");
const bloodBankRoutes = require("./routes/bloodBank.routes");
const donorRoutes = require("./routes/donor.routes");
const searchRoutes = require("./routes/search.routes");
const statsRoutes = require("./routes/stats.routes");

const app = express();
const PORT = process.env.PORT || 5000;
console.log("Google Maps Key:", process.env.GOOGLE_MAPS_API_KEY);
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/blood-banks", bloodBankRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Serve the frontend (plain HTML/CSS/JS) as static files so the whole
// project can be run from a single server during development.
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));

// Fallback: any non-API GET request returns the frontend so client-side
// links like /dashboard.html keep working.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`Blood Bank Availability Agent API running on http://localhost:${PORT}`);
});
