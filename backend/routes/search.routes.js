// routes/search.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { runEmergencySearch, getSearchHistory } = require("../controllers/donorController");

router.use(verifyToken);
router.post("/", runEmergencySearch);
router.get("/history", getSearchHistory);

module.exports = router;
