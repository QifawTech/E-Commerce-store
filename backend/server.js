const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const connectDB = require('./config/db');
const Merchant = require('./models/Merchant');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Helpers ----------
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'store';
}

// ---------- Health check ----------
app.get('/', (req, res) => res.send('SmartStore API running'));

// ---------- Merchant Register ----------
app.post('/merchant/register', async (req, res) => {
  try {
    const { businessName, brandName, category, email, phone, username, password } = req.body;

    if (!businessName || !brandName || !category || !email || !phone || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const exists = await Merchant.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(400).json({ message: 'User already exists! Try different username/email.' });
    }

    // Unique slug: asmi, asmi-2, asmi-3...
    const base = slugify(brandName);
    let storeSlug = base, i = 2;
    while (await Merchant.findOne({ storeSlug })) {
      storeSlug = base + '-' + i++;
    }

    const hashed = await bcrypt.hash(password, 10);

    const merchant = await Merchant.create({
      businessName, brandName, category, email, phone, username,
      password: hashed,
      role: 'merchant',
      storeSlug
    });

    res.status(201).json({
      ok: true,
      storeSlug,
      user: {
        id: merchant._id,
        username: merchant.username,
        brandName: merchant.brandName,
        category: merchant.category,
        storeSlug: merchant.storeSlug,
        role: merchant.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Merchant Login ----------
app.post('/merchant/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const merchant = await Merchant.findOne({ $or: [{ username }, { email: username }] });
    if (!merchant) return res.status(401).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, merchant.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { id: merchant._id, role: merchant.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: merchant._id,
        username: merchant.username,
        brandName: merchant.brandName,
        category: merchant.category,
        storeSlug: merchant.storeSlug,
        role: merchant.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- Store data (theme-selection.html-ku) ----------
app.get('/api/store/:slug', async (req, res) => {
  try {
    const store = await Merchant.findOne({ storeSlug: req.params.slug })
      .select('brandName category storeSlug -_id');
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));