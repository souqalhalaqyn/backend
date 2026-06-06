import mongoose from "mongoose";
const { Schema } = mongoose;

const BrandSchema = new Schema(
  {
    nameEn: {
      type: String,
      required: [true, "Brand name (English) is required"],
      unique: true,
      trim: true,
      minlength: [2, "Brand name must be longer than 2 characters"],
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
