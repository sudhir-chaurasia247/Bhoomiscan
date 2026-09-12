const express = require("express");
const { z } = require("zod");
const recordController = require("../controllers/recordController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { FIELD_KEYS } = require("../models/LandRecord");

const router = express.Router();

const searchSchema = z.object({
  owner: z.string().optional(),
  khasra: z.string().optional(),
  survey: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  status: z.enum(["all", "pending", "approved", "rejected", "processing"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateSchema = z.object({
  fields: z
    .array(z.object({ key: z.enum(FIELD_KEYS), value: z.string() }))
    .min(1, "At least one field is required"),
});

router.use(authenticate);

router.get("/search", validate(searchSchema, "query"), recordController.searchRecords);
router.get("/:id", recordController.getRecord);
router.patch("/:id", validate(updateSchema), recordController.updateRecord);
router.post("/:id/submit", recordController.submitForVerification);
router.post("/:id/extract", recordController.reExtract);
router.get("/:id/report", recordController.downloadReport);

module.exports = router;
