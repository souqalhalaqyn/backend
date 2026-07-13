import mongoose from "mongoose";
import { ENV } from "../config/env.js";

async function clean() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(ENV.MONGO_URI);
  console.log(`Connected: ${ENV.MONGO_URI}`);

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not available");

    // 1. Collect container IDs referenced by offers
    const offers = await db.collection("offers").find({}, { projection: { container: 1 } }).toArray();
    const containerIds = [...new Set(offers.map((o) => o.container).filter(Boolean))];
    console.log(`  Found ${offers.length} offers across ${containerIds.length} containers`);

    // 2. Delete all products in those containers (not just the specific product each offer references)
    if (containerIds.length > 0) {
      const productResult = await db.collection("products").deleteMany({ container: { $in: containerIds } });
      console.log(`  Deleted ${productResult.deletedCount} products from offer containers`);
    }

    // 3. Delete those containers
    const containerResult = containerIds.length > 0
      ? await db.collection("containers").deleteMany({ _id: { $in: containerIds } })
      : { deletedCount: 0 };
    console.log(`  Deleted ${containerResult.deletedCount} containers`);

    // 4. Delete all offer purchases
    const opResult = await db.collection("offerpurchases").deleteMany({});
    console.log(`  Deleted ${opResult.deletedCount} offer purchases`);

    // 5. Delete all offers
    const offerResult = await db.collection("offers").deleteMany({});
    console.log(`  Deleted ${offerResult.deletedCount} offers`);

    // 6. Delete all orders
    const orderResult = await db.collection("orders").deleteMany({});
    console.log(`  Deleted ${orderResult.deletedCount} orders`);

    // 7. Delete all ad requests
    const adResult = await db.collection("adrequests").deleteMany({});
    console.log(`  Deleted ${adResult.deletedCount} ad requests`);

    console.log("\n✅ Database cleaned!");
  } catch (err) {
    console.error("\n❌ Clean failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

clean();
