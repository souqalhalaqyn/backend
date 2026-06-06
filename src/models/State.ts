import mongoose from "mongoose";
const { Schema } = mongoose;

const StateSchema = new Schema(
  {
    nameEn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const State = mongoose.model("State", StateSchema);
export default State;