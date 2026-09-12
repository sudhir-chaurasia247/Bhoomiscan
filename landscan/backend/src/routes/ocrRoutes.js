const express = require("express");
const ocrController = require("../controllers/ocrController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/:documentId", ocrController.getOcrResult);
router.post("/:documentId/rerun", authorize("operator", "verifier", "admin"), ocrController.rerunOcr);

module.exports = router;
