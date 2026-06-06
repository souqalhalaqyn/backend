import mongoose from "mongoose";
const { Schema } = mongoose;

const RegionSchema = new Schema(
  {
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
    isDirectDelivery: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

RegionSchema.index({ state: 1, nameEn: 1 }, { unique: true });

const Region = mongoose.model("Region", RegionSchema);
export default Region;