import mongoose from "mongoose";
const { Schema } = mongoose;

const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    state: { type: Schema.Types.ObjectId, ref: "State" },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    way: { type: Schema.Types.ObjectId, ref: "Way" },
    address: { type: String, default: "" },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    name: {
      type: String,
      trim: true,
    },
    locations: {
      type: [LocationSchema],
      default: [],
    },
    defaultLocation: {
      type: String,
      default: "",
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);
export default User;
