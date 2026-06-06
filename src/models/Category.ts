import mongoose from "mongoose";
const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    nameEn: {
      type: String,
      required: [true, "Category name (English) is required"],
      unique: true,
      trim: true,
      minlength: [2, "Category name must be longer than 2 characters"],
    },
    nameAr: {
      type: String,
      required: [true, "Category name (Arabic) is required"],
      trim: true,
    },
    descriptionEn: {
      type: String,
      default: "",
    },
    descriptionAr: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", CategorySchema);
export default Category;
