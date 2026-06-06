import mongoose from "mongoose";
const { Schema } = mongoose;

const WaySchema = new Schema(
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
    deliveryCompanyEn: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryCompanyAr: {
      type: String,
      required: true,
      trim: true,
    },
    region: {
      type: Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
  },
  { timestamps: true },
);

WaySchema.index({ region: 1, nameEn: 1 }, { unique: true });

const Way = mongoose.model("Way", WaySchema);
export default Way;