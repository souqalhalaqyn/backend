import mongoose from "mongoose";
const { Schema } = mongoose;

const ArchivedProductSchema = new Schema(
  {
    originalId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    nameEn: { type: String, default: "" },
    nameAr: { type: String, required: true },
    descriptionEn: { type: String, default: "" },
    descriptionAr: { type: String, default: "" },
    price: { type: Number, required: true },
    currency: { type: String, enum: ["usd", "syp"], default: "usd" },
    container: { type: Schema.Types.ObjectId, ref: "Container" },
    productIndex: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    tagsEn: { type: [String], default: [] },
    tagsAr: { type: [String], default: [] },
    aliasesEn: { type: [String], default: [] },
    aliasesAr: { type: [String], default: [] },
    notesEn: { type: [String], default: [] },
    notesAr: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ArchivedProduct = mongoose.model("ArchivedProduct", ArchivedProductSchema);
export default ArchivedProduct;
