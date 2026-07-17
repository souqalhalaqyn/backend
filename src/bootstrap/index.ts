import mongoose from "mongoose";
import { ENV } from "../config/env.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";

export async function bootstrap() {
  await mongoose.connect(ENV.MONGO_URI);
  console.log(`[bootstrap] connected to MongoDB`);

  const existing = await Settings.findOne();
  if (!existing) {
    await Settings.create({});
    console.log(`[bootstrap] seeded default settings`);
  }

  const adminUser = await User.findOne({ phone: ENV.ADMIN_PHONE });
  if (!adminUser) {
    const bcrypt = await import("bcrypt");
    const hashed = await bcrypt.hash(ENV.ADMIN_PASSWORD, 10);
    await User.create({
      phone: ENV.ADMIN_PHONE,
      password: hashed,
      role: "super_admin",
    });
    console.log(`[bootstrap] seeded super admin user (${ENV.ADMIN_PHONE})`);
  } else if (adminUser.role !== "super_admin") {
    adminUser.role = "super_admin";
    await adminUser.save();
    console.log(`[bootstrap] upgraded admin to super_admin (${ENV.ADMIN_PHONE})`);
  }
}
