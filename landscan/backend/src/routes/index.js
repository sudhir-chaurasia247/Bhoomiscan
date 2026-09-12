const express = require("express");
const authRoutes = require("./authRoutes");
const documentRoutes = require("./documentRoutes");
const ocrRoutes = require("./ocrRoutes");
const recordRoutes = require("./recordRoutes");
const verificationRoutes = require("./verificationRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const adminRoutes = require("./adminRoutes");
const notificationRoutes = require("./notificationRoutes");

const router = express.Router();

router.get("/health", (req, res) =>
  res.json({ success: true, data: { status: "ok", uptime: process.uptime() } }),
);

router.use("/auth", authRoutes);
router.use("/documents", documentRoutes);
router.use("/ocr", ocrRoutes);
router.use("/records", recordRoutes);
router.use("/verification", verificationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
