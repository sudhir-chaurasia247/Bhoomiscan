const express = require("express");
const { z } = require("zod");
const documentController = require("../controllers/documentController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload");

const router = express.Router();

const uploadSchema = z.object({
  district: z.string().min(1),
  taluka: z.string().optional().default(""),
  village: z.string().min(1),
  year: z.string().regex(/^\d{4}$/, "Year must be a four digit value"),
});

const listSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["all", "processing", "pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.use(authenticate);

router.post(
  "/upload",
  authorize("operator", "admin"),
  upload.array("files", 10),
  validate(uploadSchema),
  documentController.uploadDocuments,
);
router.get("/", validate(listSchema, "query"), documentController.listDocuments);
router.get("/:id", documentController.getDocument);
router.get("/:id/status", documentController.getStatus);
router.get("/:id/file", documentController.streamFile);
router.post("/:id/process", authorize("operator", "admin"), documentController.processDocument);
router.delete("/:id", authorize("operator", "admin"), documentController.deleteDocument);

module.exports = router;
