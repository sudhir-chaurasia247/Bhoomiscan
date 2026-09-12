const express = require("express");
const { z } = require("zod");
const verificationController = require("../controllers/verificationController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const router = express.Router();

const queueSchema = z.object({
  q: z.string().optional(),
  priority: z.enum(["all", "high", "medium", "low"]).optional(),
  confidence: z.enum(["all", "high", "medium", "low"]).optional(),
  district: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const decisionSchema = z.object({ comments: z.string().max(2000).optional().default("") });

router.use(authenticate, authorize("verifier", "admin"));

router.get("/queue", validate(queueSchema, "query"), verificationController.getQueue);
router.get("/:recordId", verificationController.getRecord);
router.get("/:recordId/history", verificationController.getHistory);
router.post("/:recordId/approve", validate(decisionSchema), verificationController.approve);
router.post("/:recordId/reject", validate(decisionSchema), verificationController.reject);
router.post("/:recordId/reprocess", validate(decisionSchema), verificationController.requestReprocess);

module.exports = router;
