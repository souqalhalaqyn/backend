import mongoose from "mongoose";
const { Schema } = mongoose;

const OrderItemSchema = new Schema(
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
    productIndex: { type: Number, required: true },
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" },
  },
  { _id: false },
);

const StatusEntrySchema = new Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [OrderItemSchema],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    statusHistory: [StatusEntrySchema],
    location: { type: String, default: "" },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", OrderSchema);
export default Order;
