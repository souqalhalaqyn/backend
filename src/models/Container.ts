import mongoose from "mongoose";
const { Schema } = mongoose;

const ContainerSchema = new Schema(
  {
    nameEn: {
      type: String,
      default: "",
      trim: true,
    },
    nameAr: {
      type: String,
      required: [true, "Container name (Arabic) is required"],
      trim: true,
    },
    shortDescriptionEn: { type: String, default: "" },
    shortDescriptionAr: { type: String, default: "" },
    longDescriptionEn: { type: String, default: "" },
    longDescriptionAr: { type: String, default: "" },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
      index: true,
    },
    categories: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      default: [],
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ContainerSchema.index({ isActive: 1 });
ContainerSchema.index(
  { nameEn: "text", nameAr: "text", shortDescriptionEn: "text", shortDescriptionAr: "text", longDescriptionEn: "text", longDescriptionAr: "text" },
  { name: "Container_text_index" },
);

const Container = mongoose.model("Container", ContainerSchema);
export default Container;
