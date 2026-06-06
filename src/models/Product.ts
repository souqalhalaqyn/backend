import mongoose from "mongoose";
import { ENV } from "../config/env.js";
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    nameEn: {
      type: String,
      required: [true, "Product name (English) is required"],
      unique: true,
      trim: true,
      minlength: [3, "Product name must be longer than 3 characters"],
    },
    nameAr: {
      type: String,
      required: [true, "Product name (Arabic) is required"],
      trim: true,
    },
    shortDescriptionEn: {
      type: String,
      required: [true, "Short description (English) is required"],
      maxlength: [150, "Short description should be concise (max 150 chars)"],
    },
    shortDescriptionAr: {
      type: String,
      required: [true, "Short description (Arabic) is required"],
    },
    longDescriptionEn: {
      type: String,
      required: [true, "Long description (English) is required"],
    },
    longDescriptionAr: {
      type: String,
      required: [true, "Long description (Arabic) is required"],
    },
    price: {
      type: Number,
      required: [true, "Price in USD is required"],
      min: [0, "Price cannot be negative"],
    },
    container: {
      type: Schema.Types.ObjectId,
      ref: "Container",
      required: [true, "Container is required"],
      index: true,
    },
    productIndex: {
      type: Number,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    tagsEn: {
      type: [String],
      index: true,
      default: [],
    },
    tagsAr: {
      type: [String],
      default: [],
    },
    aliasesEn: {
      type: [String],
      index: true,
      default: [],
    },
    aliasesAr: {
      type: [String],
      default: [],
    },
    notesEn: {
      type: [String],
      default: [],
    },
    notesAr: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  },
);

ProductSchema.virtual("imageUrls").get(function () {
  if (!this.images || this.images.length === 0) return [];
  return this.images.map(
    (img) => `${ENV.PROTOCOL}://${ENV.HOST}:${ENV.PORT}/uploads/${img}`,
  );
});

const Product = mongoose.model("Product", ProductSchema);
export default Product;
