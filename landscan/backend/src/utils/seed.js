/**
 * Seeds the demo accounts referenced by the login screen.
 * Usage: npm run seed
 */
const env = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/database");
const User = require("../models/User");
const logger = require("./logger");

const DEMO_USERS = [
  { name: "Ramesh Kulkarni", email: "op.ramesh@gov.in", role: "operator", district: "Pune" },
  { name: "Sneha Rane", email: "op.sneha@gov.in", role: "operator", district: "Nashik" },
  { name: "Vaishali Joshi", email: "vf.vaishali@gov.in", role: "verifier", district: "Pune" },
  { name: "Prakash Naik", email: "vf.prakash@gov.in", role: "verifier", district: "Solapur" },
  { name: "Meera Iyer", email: env.seed.adminEmail, role: "admin", district: "State HQ" },
];

async function seed() {
  await connectDatabase();

  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ email: demo.email });
    if (existing) {
      logger.info(`Skipping existing user ${demo.email}`);
      continue;
    }
    await User.create({ ...demo, passwordHash: env.seed.adminPassword });
    logger.info(`Created ${demo.role} ${demo.email}`);
  }

  await disconnectDatabase();
}

seed().catch(async (error) => {
  logger.error("Seeding failed", error);
  await disconnectDatabase();
  process.exit(1);
});
