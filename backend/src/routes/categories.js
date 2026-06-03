const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// Categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const categoriesWithSubs = await Promise.all(
      categories.map(async (cat) => {
        const subCategories = await SubCategory.find({ categoryId: cat._id, isActive: true }).sort({ name: 1 });
        return { ...cat.toObject(), subCategories };
      })
    );
    res.json(categoriesWithSubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({ ...category.toObject(), subCategories: [] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    await SubCategory.updateMany({ categoryId: req.params.id }, { isActive: false });
    res.json({ message: 'Category deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SubCategories
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const subs = await SubCategory.find({ categoryId: req.params.categoryId, isActive: true }).sort({ name: 1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:categoryId/subcategories', async (req, res) => {
  try {
    const sub = new SubCategory({ ...req.body, categoryId: req.params.categoryId });
    await sub.save();
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/subcategories/:id', async (req, res) => {
  try {
    const sub = await SubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sub) return res.status(404).json({ error: 'SubCategory not found' });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/subcategories/:id', async (req, res) => {
  try {
    await SubCategory.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'SubCategory deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
