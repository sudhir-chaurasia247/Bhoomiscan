const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/operator", authorize("operator", "admin"), dashboardController.operatorDashboard);
router.get("/verifier", authorize("verifier", "admin"), dashboardController.verifierDashboard);
router.get("/admin", authorize("admin"), dashboardController.adminDashboard);

module.exports = router;
