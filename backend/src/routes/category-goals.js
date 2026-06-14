const express = require('express');
const router = express.Router();
const CategoryGoal = require('../models/CategoryGoal');

// GET /api/category-goals — returns { [categoryId]: goal } map
router.get('/', async (req, res) => {
  try {
    const goals = await CategoryGoal.find();
    const map = {};
    goals.forEach((g) => { map[g.categoryId.toString()] = g.goal; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/category-goals/:categoryId — upsert goal for a category
router.put('/:categoryId', async (req, res) => {
  try {
    const { goal } = req.body;
    const parsed = parseFloat(goal);
    if (!goal || isNaN(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'Goal must be a number greater than 0' });
    }
    const doc = await CategoryGoal.findOneAndUpdate(
      { categoryId: req.params.categoryId },
      { goal: parsed },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ categoryId: doc.categoryId, goal: doc.goal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
