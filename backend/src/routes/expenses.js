import express from "express";
import Expense from "../models/Expense.js";

const router = express.Router();

const allowedCategories = ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Travel", "Other"];

function buildDateRange(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.spentAt = {};
    if (query.from) filter.spentAt.$gte = new Date(query.from);
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      filter.spentAt.$lte = toDate;
    }
  }
  return filter;
}

router.get("/", async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = buildDateRange(req.query);

    if (category && category !== "All") filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };

    const expenses = await Expense.find(filter).sort({ spentAt: -1, createdAt: -1 });
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const filter = buildDateRange(req.query);

    const [totalResult, categoryResult, recentExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.find(filter).sort({ spentAt: -1 }).limit(5)
    ]);

    res.json({
      success: true,
      data: {
        total: totalResult[0]?.total || 0,
        count: totalResult[0]?.count || 0,
        byCategory: categoryResult,
        recent: recentExpenses
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, amount, category, note, spentAt } = req.body;

    if (!title || amount === undefined || !category) {
      return res.status(400).json({ success: false, message: "title, amount, and category are required" });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    const expense = await Expense.create({
      title,
      amount: Number(amount),
      category,
      note,
      spentAt: spentAt ? new Date(spentAt) : new Date()
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.amount !== undefined) update.amount = Number(update.amount);
    if (update.spentAt) update.spentAt = new Date(update.spentAt);

    const expense = await Expense.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
});

router.post("/seed", async (req, res, next) => {
  try {
    const count = await Expense.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: "Seed skipped because data already exists" });
    }

    const now = new Date();
    const demoData = [
      { title: "Team lunch", amount: 42, category: "Food", note: "Docker class day", spentAt: now },
      { title: "AWS EC2 lab", amount: 18, category: "Education", note: "Cloud practice", spentAt: now },
      { title: "Metro ride", amount: 7, category: "Transport", note: "Commute", spentAt: now },
      { title: "Internet bill", amount: 32, category: "Bills", note: "Monthly bill", spentAt: now }
    ];

    await Expense.insertMany(demoData);
    res.status(201).json({ success: true, message: "Demo expenses seeded" });
  } catch (error) {
    next(error);
  }
});

export default router;
