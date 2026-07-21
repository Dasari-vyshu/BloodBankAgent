// routes/bloodBank.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const {
  listBloodBanks,
  getBloodBank,
  listStates,
  listDistricts,
  listCities,
} = require("../controllers/bloodBankController");

router.use(verifyToken);

router.get("/meta/states", listStates);
router.get("/meta/districts", listDistricts);
router.get("/meta/cities", listCities);
router.get("/", listBloodBanks);
router.get("/:id", getBloodBank);

module.exports = router;
