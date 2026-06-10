import mongoose from "mongoose";

const { Schema } = mongoose;

const OfferSchema = new Schema(
  {
    container: {
      type: Schema.Types.ObjectId,
      ref: "Container",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    offerPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    unitSellPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    totalProfitDistributed: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["available", "sold", "completed"],
      default: "available",
    },
  },
  { timestamps: true },
);

OfferSchema.index({ status: 1, createdAt: -1 });
OfferSchema.index({ product: 1, status: 1 });

const Offer = mongoose.model("Offer", OfferSchema);
export default Offer;
