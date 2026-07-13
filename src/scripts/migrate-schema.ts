import mongoose from "mongoose";
import { ENV } from "../config/env.js";

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(ENV.MONGO_URI);
  console.log(`Connected: ${ENV.MONGO_URI}`);

  try {
    const collection = mongoose.connection.collection("products");
    const docs = await collection.find({ currency: { $exists: false } }).toArray();
    console.log(`  Found ${docs.length} products missing currency field`);

    if (docs.length > 0) {
      const result = await collection.updateMany(
        { currency: { $exists: false } },
        { $set: { currency: "usd" } },
      );
      console.log(`  Updated ${result.modifiedCount} products`);
    }

    console.log("\n✅ Migration complete!");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

migrate();
