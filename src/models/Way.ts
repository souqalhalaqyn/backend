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
    state: {
      type: Schema.Types.ObjectId,
      ref: "State",
      required: true,
    },
  },
  { timestamps: true },
);

WaySchema.index({ state: 1, nameEn: 1 }, { unique: true });

const Way = mongoose.model("Way", WaySchema);
export default Way;