import mongoose from "mongoose";
const { Schema } = mongoose;

const SettingsSchema = new Schema(
  {
    sypExchangeRate: {
      type: Number,
      required: true,
      default: 15000,
      min: [0, "Exchange rate cannot be negative"],
    },
    sliderImages: {
      type: [{ image: String, productId: String }],
      default: [],
    },
  },
  { timestamps: true },
);

const Settings = mongoose.model("Settings", SettingsSchema);
export default Settings;
