// routes/donor.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { listDonors } = require("../controllers/donorController");

router.use(verifyToken);
router.get("/", listDonors);

module.exports = router;
