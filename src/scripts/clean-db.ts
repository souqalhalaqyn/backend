import mongoose from "mongoose";
import { ENV } from "../config/env.js";

async function clean() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(ENV.MONGO_URI);
  console.log(`Connected: ${ENV.MONGO_URI}`);

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not available");

    // 1. Collect product IDs referenced by offers
    const offers = await db.collection("offers").find({}, { projection: { product: 1 } }).toArray();
    const productIds = [...new Set(offers.map((o) => o.product).filter(Boolean))];
    console.log(`  Found ${offers.length} offers, referencing ${productIds.length} products`);

    // 2. Delete offer products (products that have offers)
    const productResult = productIds.length > 0
      ? await db.collection("products").deleteMany({ _id: { $in: productIds } })
      : { deletedCount: 0 };
    console.log(`  Deleted ${productResult.deletedCount} offer products`);

    // 3. Delete all offer purchases
    const opResult = await db.collection("offerpurchases").deleteMany({});
    console.log(`  Deleted ${opResult.deletedCount} offer purchases`);

    // 4. Delete all offers
    const offerResult = await db.collection("offers").deleteMany({});
    console.log(`  Deleted ${offerResult.deletedCount} offers`);

    // 5. Delete all orders
    const orderResult = await db.collection("orders").deleteMany({});
    console.log(`  Deleted ${orderResult.deletedCount} orders`);

    // 6. Delete all ad requests
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
