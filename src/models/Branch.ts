import mongoose from "mongoose";
const { Schema } = mongoose;

const BranchSchema = new Schema(
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
    way: {
      type: Schema.Types.ObjectId,
      ref: "Way",
      required: true,
    },
  },
  { timestamps: true },
);

BranchSchema.index({ way: 1, nameEn: 1 }, { unique: true });

const Branch = mongoose.model("Branch", BranchSchema);
export default Branch;
