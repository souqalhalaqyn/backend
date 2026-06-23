import mongoose from "mongoose";

const { Schema } = mongoose;

const AdProductSchema = new Schema({
  nameEn: { type: String, required: true },
  nameAr: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0 },
  images: { type: [String], default: [] },
  shortDescriptionEn: { type: String, default: "" },
  shortDescriptionAr: { type: String, default: "" },
  longDescriptionEn: { type: String, default: "" },
  longDescriptionAr: { type: String, default: "" },
  tagsEn: { type: [String], default: [] },
  tagsAr: { type: [String], default: [] },
  aliasesEn: { type: [String], default: [] },
  aliasesAr: { type: [String], default: [] },
  notesEn: { type: [String], default: [] },
  notesAr: { type: [String], default: [] },
}, { _id: true });

const AdContainerSchema = new Schema({
  nameEn: { type: String, required: true },
  nameAr: { type: String, required: true },
  shortDescriptionEn: { type: String, default: "" },
  shortDescriptionAr: { type: String, default: "" },
  longDescriptionEn: { type: String, default: "" },
  longDescriptionAr: { type: String, default: "" },
}, { _id: true });

const AdRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  container: { type: AdContainerSchema, required: true },
  products: { type: [AdProductSchema], required: true, validate: [(v: any[]) => v.length > 0, "At least one product required"] },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },
  rejectionReason: { type: String, default: "" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

AdRequestSchema.index({ status: 1, createdAt: -1 });
AdRequestSchema.index({ user: 1, status: 1 });

const AdRequest = mongoose.model("AdRequest", AdRequestSchema);
export default AdRequest;
