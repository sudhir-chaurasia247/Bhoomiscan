const express = require("express");
const { z } = require("zod");
const adminController = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const roles = z.enum(["operator", "verifier", "admin"]);

const listUsersSchema = z.object({
  q: z.string().optional(),
  role: z.union([roles, z.literal("all")]).optional(),
  status: z.enum(["all", "active", "disabled"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: roles,
  district: z.string().min(1),
  password: z.string().min(8).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: roles.optional(),
  district: z.string().min(1).optional(),
  office: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(8).optional(),
});

const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });

router.use(authenticate, authorize("admin"));

router.get("/analytics", adminController.getAnalytics);
router.get("/users", validate(listUsersSchema, "query"), adminController.listUsers);
router.post("/users", validate(createUserSchema), adminController.createUser);
router.patch("/users/:id", validate(updateUserSchema), adminController.updateUser);
router.patch("/users/:id/status", validate(statusSchema), adminController.toggleUserStatus);

module.exports = router;
