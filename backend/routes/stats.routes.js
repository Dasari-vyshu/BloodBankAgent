// routes/stats.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { getStats } = require("../controllers/bloodBankController");

router.use(verifyToken);
router.get("/", getStats);

module.exports = router;
