import mongoose from "mongoose";
import { ENV } from "../config/env.js";

const MONGO_URI = ENV.MONGO_URI;

function pickTruthy<T>(...values: (T | undefined | null | false)[]): T | undefined {
  for (const v of values) {
    if (v) return v as T;
  }
  return undefined;
}

async function migrateProducts() {
  console.log("\n--- Migrating Products ---");
  const collection = mongoose.connection.collection("products");
  const docs = await collection.find({
    $or: [
      { shortDescriptionEn: { $exists: true } },
      { shortDescriptionAr: { $exists: true } },
      { longDescriptionEn: { $exists: true } },
      { longDescriptionAr: { $exists: true } },
      { descriptionEn: { $exists: false } },
      { descriptionAr: { $exists: false } },
    ],
  }).toArray();
  console.log(`  Found ${docs.length} products to migrate`);

  let updated = 0;
  for (const doc of docs) {
    const sdEn = doc.shortDescriptionEn as string | undefined;
    const sdAr = doc.shortDescriptionAr as string | undefined;
    const ldEn = doc.longDescriptionEn as string | undefined;
    const ldAr = doc.longDescriptionAr as string | undefined;
    const existingDescEn = doc.descriptionEn as string | undefined;
    const existingDescAr = doc.descriptionAr as string | undefined;

    const descEn = existingDescEn || pickTruthy(ldEn, sdEn) || "";
    const descAr = existingDescAr || pickTruthy(ldAr, sdAr) || "";

    if (!descEn && !descAr && !sdEn && !sdAr && !ldEn && !ldAr) continue;

    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { descriptionEn: descEn, descriptionAr: descAr },
        $unset: {
          shortDescriptionEn: "",
          shortDescriptionAr: "",
          longDescriptionEn: "",
          longDescriptionAr: "",
          shortDescription: "",
          longDescription: "",
        },
      },
    );
    updated++;
  }
  console.log(`  Updated ${updated} products`);
}

async function migrateContainers() {
  console.log("\n--- Migrating Containers ---");
  const collection = mongoose.connection.collection("containers");
  const docs = await collection.find({
    $or: [
      { shortDescriptionEn: { $exists: true } },
      { shortDescriptionAr: { $exists: true } },
      { longDescriptionEn: { $exists: true } },
      { longDescriptionAr: { $exists: true } },
      { descriptionEn: { $exists: false } },
      { descriptionAr: { $exists: false } },
    ],
  }).toArray();
  console.log(`  Found ${docs.length} containers to migrate`);

  let updated = 0;
  for (const doc of docs) {
    const sdEn = doc.shortDescriptionEn as string | undefined;
    const sdAr = doc.shortDescriptionAr as string | undefined;
    const ldEn = doc.longDescriptionEn as string | undefined;
    const ldAr = doc.longDescriptionAr as string | undefined;
    const existingDescEn = doc.descriptionEn as string | undefined;
    const existingDescAr = doc.descriptionAr as string | undefined;

    const descEn = existingDescEn || pickTruthy(ldEn, sdEn) || "";
    const descAr = existingDescAr || pickTruthy(ldAr, sdAr) || "";

    if (!descEn && !descAr && !sdEn && !sdAr && !ldEn && !ldAr) continue;

    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { descriptionEn: descEn, descriptionAr: descAr },
        $unset: {
          shortDescriptionEn: "",
          shortDescriptionAr: "",
          longDescriptionEn: "",
          longDescriptionAr: "",
          shortDescription: "",
          longDescription: "",
        },
      },
    );
    updated++;
  }
  console.log(`  Updated ${updated} containers`);
}

async function migrateAdRequests() {
  console.log("\n--- Migrating AdRequests ---");
  const collection = mongoose.connection.collection("adrequests");
  const docs = await collection.find({
    $or: [
      { "container.shortDescriptionEn": { $exists: true } },
      { "container.shortDescriptionAr": { $exists: true } },
      { "container.longDescriptionEn": { $exists: true } },
      { "container.longDescriptionAr": { $exists: true } },
    ],
  }).toArray();
  console.log(`  Found ${docs.length} ad requests to migrate`);

  let updated = 0;
  for (const doc of docs) {
    const container = doc.container as Record<string, any> | undefined;
    const products = doc.products as Record<string, any>[] | undefined;

    const updateFields: Record<string, any> = {};
    const unsetFields: Record<string, string> = {};

    if (container) {
      const sdEn = container.shortDescriptionEn as string | undefined;
      const sdAr = container.shortDescriptionAr as string | undefined;
      const ldEn = container.longDescriptionEn as string | undefined;
      const ldAr = container.longDescriptionAr as string | undefined;

      if (sdEn || sdAr || ldEn || ldAr) {
        updateFields["container.descriptionEn"] = container.descriptionEn || ldEn || sdEn || "";
        updateFields["container.descriptionAr"] = container.descriptionAr || ldAr || sdAr || "";
        unsetFields["container.shortDescriptionEn"] = "";
        unsetFields["container.shortDescriptionAr"] = "";
        unsetFields["container.longDescriptionEn"] = "";
        unsetFields["container.longDescriptionAr"] = "";
      }
    }

    for (let i = 0; i < (products ?? []).length; i++) {
      const p = products![i]!;
      const sdEn = p.shortDescriptionEn as string | undefined;
      const sdAr = p.shortDescriptionAr as string | undefined;
      const ldEn = p.longDescriptionEn as string | undefined;
      const ldAr = p.longDescriptionAr as string | undefined;

      if (sdEn || sdAr || ldEn || ldAr) {
        updateFields[`products.${i}.descriptionEn`] = p.descriptionEn || ldEn || sdEn || "";
        updateFields[`products.${i}.descriptionAr`] = p.descriptionAr || ldAr || sdAr || "";
        unsetFields[`products.${i}.shortDescriptionEn`] = "";
        unsetFields[`products.${i}.shortDescriptionAr`] = "";
        unsetFields[`products.${i}.longDescriptionEn`] = "";
        unsetFields[`products.${i}.longDescriptionAr`] = "";
      }
    }

    if (Object.keys(updateFields).length === 0) continue;

    await collection.updateOne(
      { _id: doc._id },
      { $set: updateFields, $unset: unsetFields },
    );
    updated++;
  }
  console.log(`  Updated ${updated} ad requests`);
}

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log(`Connected: ${MONGO_URI}`);

  try {
    await migrateProducts();
    await migrateContainers();
    await migrateAdRequests();
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
