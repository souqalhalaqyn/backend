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
      role: "admin",
    });
    console.log(`[bootstrap] seeded admin user (${ENV.ADMIN_PHONE})`);
  }
}
