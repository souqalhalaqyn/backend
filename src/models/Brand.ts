import mongoose from "mongoose";
const { Schema } = mongoose;

const BrandSchema = new Schema(
  {
    nameEn: {
      type: String,
      default: "",
      trim: true,
    },
    nameAr: {
      type: String,
      required: [true, "Brand name (Arabic) is required"],
      trim: true,
    },
    descriptionEn: {
      type: String,
      default: "",
    },
    descriptionAr: {
      type: String,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Brand = mongoose.model("Brand", BrandSchema);
export default Brand;
