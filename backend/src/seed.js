require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');
const Category = require('./models/Category');
const SubCategory = require('./models/SubCategory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dhanam-tracker';

const defaultCategories = [
  {
    name: 'Food & Dining',
    color: '#f97316',
    icon: 'utensils',
    description: 'Groceries, restaurants, and food delivery',
    subs: ['Groceries', 'Restaurant', 'Swiggy / Zomato', 'Snacks & Beverages', 'Tea & Coffee'],
  },
  {
    name: 'Transportation',
    color: '#3b82f6',
    icon: 'car',
    description: 'Fuel, cab, and public transport',
    subs: ['Fuel', 'Auto / Cab (Ola / Uber)', 'Metro / Bus', 'Vehicle Maintenance', 'Parking & Toll'],
  },
  {
    name: 'Housing',
    color: '#8b5cf6',
    icon: 'home',
    description: 'Rent, utilities, and maintenance',
    subs: ['Rent', 'DEWA', 'Gas / LPG', 'Internet & Cable', 'Home Maintenance'],
  },
  {
    name: 'Health & Medical',
    color: '#ef4444',
    icon: 'heart',
    description: 'Doctors, medicines, and wellness',
    subs: ['Doctor / Hospital', 'Medicines', 'Lab Tests', 'Gym / Fitness', 'Dental Care'],
  },
  {
    name: 'Shopping',
    color: '#ec4899',
    icon: 'shopping-bag',
    description: 'Clothing, electronics, and online shopping',
    subs: ['Clothing & Footwear', 'Electronics & Gadgets', 'Home Appliances', 'Online Shopping', 'Household Items'],
  },
  {
    name: 'Entertainment',
    color: '#f59e0b',
    icon: 'film',
    description: 'Movies, travel, and leisure',
    subs: ['Movies & OTT', 'Travel & Vacation', 'Events & Concerts', 'Games & Hobbies', 'Books & Magazines'],
  },
  {
    name: 'Education',
    color: '#06b6d4',
    icon: 'graduation-cap',
    description: 'Tuition, courses, and learning',
    subs: ['School / College Fees', 'Online Courses', 'Books & Stationery', 'Coaching / Tuition'],
  },
  {
    name: 'Personal Care',
    color: '#d946ef',
    icon: 'sparkles',
    description: 'Salon, cosmetics, and personal grooming',
    subs: ['Salon & Spa', 'Skincare & Cosmetics', 'Clothing Accessories'],
  },
  {
    name: 'Finance & Loans',
    color: '#10b981',
    icon: 'credit-card',
    description: 'EMI, insurance, and investments',
    subs: ['EMI / Loan Payment', 'Insurance Premium', 'Credit Card Bill', 'SIP / Investment', 'Tax Payment'],
  },
  {
    name: 'Gifts & Social',
    color: '#f43f5e',
    icon: 'gift',
    description: 'Gifts, donations, and social events',
    subs: ['Gifts', 'Donations & Charity', 'Religious / Pooja', 'Social Events & Parties'],
  },
  {
    name: 'Children',
    color: '#84cc16',
    icon: 'baby',
    description: 'Baby products and children expenses',
    subs: ['Baby Products', 'School Fees', 'Extracurricular Activities', 'Toys & Games'],
  },
  {
    name: 'Miscellaneous',
    color: '#94a3b8',
    icon: 'more-horizontal',
    description: 'Other expenses',
    subs: ['Office Supplies', 'Pet Care', 'Subscription Services', 'Other'],
  },
];

const defaultMembers = [
  { name: 'Padmapriya', role: 'self', color: '#6366f1' },
  { name: 'Kiran', role: 'husband', color: '#0ea5e9' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Seed members (upsert by role so re-running updates names)
  for (const m of defaultMembers) {
    await Member.findOneAndUpdate({ role: m.role }, m, { upsert: true, new: true });
    console.log(`Upserted member: ${m.name}`);
  }

  // Seed categories and subcategories
  for (const { subs, ...catData } of defaultCategories) {
    let cat = await Category.findOne({ name: catData.name });
    if (!cat) {
      cat = await Category.create(catData);
      console.log(`Created category: ${cat.name}`);
    } else {
      console.log(`Category already exists: ${cat.name}`);
    }

    for (const subName of subs) {
      const exists = await SubCategory.findOne({ name: subName, categoryId: cat._id });
      if (!exists) {
        await SubCategory.create({ name: subName, categoryId: cat._id });
        console.log(`  Created subcategory: ${subName}`);
      }
    }
  }

  console.log('\nSeed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
