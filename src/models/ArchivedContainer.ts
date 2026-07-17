import mongoose from "mongoose";
const { Schema } = mongoose;

const ArchivedContainerSchema = new Schema(
  {
    originalId: { type: Schema.Types.ObjectId, ref: "Container", required: true },
    nameEn: { type: String, default: "" },
    nameAr: { type: String, required: true },
    descriptionEn: { type: String, default: "" },
    descriptionAr: { type: String, default: "" },
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ArchivedContainer = mongoose.model("ArchivedContainer", ArchivedContainerSchema);
export default ArchivedContainer;
