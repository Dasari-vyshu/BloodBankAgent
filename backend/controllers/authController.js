// controllers/authController.js
const jwt = require("jsonwebtoken");
const store = require("../db/store");

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
const OTP_DEBUG_MODE = (process.env.OTP_DEBUG_MODE || "true").toLowerCase() === "true";

const MOBILE_REGEX = /^[6-9]\d{9}$/; // Indian 10-digit mobile numbers starting 6-9

function generateOtp() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * POST /api/auth/send-otp
 * body: { mobile }
 * Generates an OTP, stores it against the mobile number, and "sends" it.
 * There is no real SMS gateway wired up - see README for how to plug one
 * in (Twilio, MSG91, etc). In the meantime OTP_DEBUG_MODE returns the OTP
 * directly in the response so the app is usable end-to-end for a demo.
 */
function sendOtp(req, res) {
  const { mobile } = req.body;

  if (!mobile || !MOBILE_REGEX.test(String(mobile).trim())) {
    return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
  }

  const cleanMobile = String(mobile).trim();
  const otp = generateOtp();
  const otpExpiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  const existing = store.users.get(cleanMobile);
  if (existing) {
    existing.otp = otp;
    existing.otpExpiresAt = otpExpiresAt;
  } else {
    store.users.set(cleanMobile, {
      mobile: cleanMobile,
      otp,
      otpExpiresAt,
      createdAt: Date.now(),
      lastLoginAt: null,
    });
  }

  // Simulated SMS send - replace with a real provider in production.
  console.log(`[OTP] ${otp} for ${cleanMobile} (expires in ${OTP_EXPIRY_MINUTES} min)`);

  const response = {
    message: "OTP sent successfully.",
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  };
  if (OTP_DEBUG_MODE) {
    response.debugOtp = otp; // remove this in a real deployment
  }

  res.json(response);
}

/**
 * POST /api/auth/verify-otp
 * body: { mobile, otp }
 * Verifies the OTP and issues a JWT used for all dashboard API calls.
 */
function verifyOtp(req, res) {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ error: "Mobile number and OTP are required." });
  }

  const cleanMobile = String(mobile).trim();
  const user = store.users.get(cleanMobile);

  if (!user || !user.otp) {
    return res.status(400).json({ error: "No OTP was requested for this number." });
  }
  if (Date.now() > user.otpExpiresAt) {
    return res.status(400).json({ error: "OTP expired. Please request a new one." });
  }
  if (String(otp).trim() !== user.otp) {
    return res.status(400).json({ error: "Incorrect OTP." });
  }

  user.otp = null;
  user.otpExpiresAt = null;
  user.lastLoginAt = Date.now();

  const token = jwt.sign({ mobile: cleanMobile }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.json({
    message: "Login successful.",
    token,
    user: { mobile: cleanMobile },
  });
}

module.exports = { sendOtp, verifyOtp };
