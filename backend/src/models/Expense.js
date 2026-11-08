import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"]
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Travel", "Other"],
      default: "Other"
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    spentAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

expenseSchema.index({ spentAt: -1 });
expenseSchema.index({ category: 1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
