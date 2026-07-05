import mongoose from "mongoose";
import { ENV } from "../config/env.js";
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    nameEn: {
      type: String,
      default: "",
      trim: true,
    },
    nameAr: {
      type: String,
      required: [true, "Product name (Arabic) is required"],
      trim: true,
    },
    descriptionEn: {
      type: String,
      default: "",
    },
    descriptionAr: {
      type: String,
      required: [true, "Description (Arabic) is required"],
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

ProductSchema.index({ container: 1, productIndex: 1 });
ProductSchema.index(
  { nameEn: "text", nameAr: "text", tagsEn: "text", tagsAr: "text", aliasesEn: "text", aliasesAr: "text" },
  { name: "Product_text_index" },
);

const Product = mongoose.model("Product", ProductSchema);
export default Product;
