const express = require("express");
const { z } = require("zod");
const authController = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["operator", "verifier", "admin"]),
  district: z.string().min(1).default("State HQ"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["operator", "verifier", "admin"]).optional(),
});

const refreshSchema = z.object({ refreshToken: z.string().optional() });

router.post("/register", authenticate, authorize("admin"), validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.get("/me", authenticate, authController.me);
router.post("/logout", validate(refreshSchema), authController.logout);

module.exports = router;
