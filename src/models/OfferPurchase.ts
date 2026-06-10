import mongoose from "mongoose";

const { Schema } = mongoose;

const OfferPurchaseSchema = new Schema(
  {
    offer: {
      type: Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    retailBuyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitSellPrice: {
      type: Number,
      required: true,
    },
    commissionPercent: {
      type: Number,
      required: true,
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    buyerProfit: {
      type: Number,
      required: true,
    },
    totalProfitAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

OfferPurchaseSchema.index({ offer: 1, createdAt: -1 });
OfferPurchaseSchema.index({ order: 1 });

const OfferPurchase = mongoose.model("OfferPurchase", OfferPurchaseSchema);
export default OfferPurchase;
