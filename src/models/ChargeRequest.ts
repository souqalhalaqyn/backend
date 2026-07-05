import mongoose from "mongoose";
const { Schema } = mongoose;

const ChargeRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "Amount must be positive"],
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "done", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

ChargeRequestSchema.index({ user: 1, createdAt: -1 });
ChargeRequestSchema.index({ status: 1, createdAt: -1 });

const ChargeRequest = mongoose.model("ChargeRequest", ChargeRequestSchema);
export default ChargeRequest;
