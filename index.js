const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const Parcel = require('./models/Parcels');
const History = require('./models/History');

const app = express();
const PORT = process.env.PORT || 3000;

console.log("MONGODB_URI:", process.env.MONGODB_URI); // ✅ debugging line

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ----------------- MIDDLEWARE -----------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallbacksecret',
  resave: false,
  saveUninitialized: true
}));

// Dummy locations
const locations = [
  'Dortmund, Germany (Pickup)',
  'Berlin, Germany (Sorting)',
  'Frankfurt, Germany (In Transit)',
  'Paris, France (Customs)',
  'Amsterdam, Netherlands (On Delivery)',
  'New York, USA (In Transit)',
  'London, United Kingdom (Customs)',
  'London, United Kingdom (Delivered)'
];

// ----------------- HELPERS -----------------
function generateTrackingNumber() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let tracking = '1Z';
  for (let i = 0; i < 16; i++) {
    tracking += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tracking;
}

function getCurrentStep(parcel) {
  const created = new Date(parcel.createdAt);
  const now = new Date();
  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  return Math.min(diffDays, locations.length - 1);
}

async function updateHistoryIfNeeded(trackingNumber, parcel) {
  const currentStep = getCurrentStep(parcel);
  const historyCount = await History.countDocuments({ trackingNumber });

  if (historyCount < currentStep + 1) {
    const newEntries = [];
    for (let i = historyCount; i <= currentStep; i++) {
      newEntries.push({
        trackingNumber,
        location: locations[i],
        timestamp: new Date()
      });
    }
    await History.insertMany(newEntries);
  }
}

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// ----------------- PUBLIC ROUTES -----------------

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/track', (req, res) => {
  const trackingNumber = req.body.trackingNumber.trim();
  res.redirect(`/track/${trackingNumber}`);
});

app.get('/track/:trackingNumber', async (req, res) => {
  const { trackingNumber } = req.params;

  try {
    const parcel = await Parcel.findOne({ trackingNumber });
    if (!parcel) return res.status(404).send("Tracking number not found.");

    await updateHistoryIfNeeded(trackingNumber, parcel);

    const currentStep = getCurrentStep(parcel);
    const currentLocation = locations[currentStep] || "Delivered";
    const isDelivered = currentStep >= locations.length - 1;

    const history = await History.find({ trackingNumber }).sort({ timestamp: 1 });

    res.render('track', {
      trackingNumber,
      currentLocation,
      history,
      isDelivered,
      currentStep,
      locations,
      parcel
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

// ----------------- ADMIN ROUTES -----------------

app.get('/admin/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.render('login', { error: "Invalid credentials" });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Updated admin route with camelCase keys matching admin.ejs:
app.get('/admin', ensureAdmin, async (req, res) => {
  try {
    const parcels = await Parcel.find();

    const enrichedParcels = parcels.map(parcel => {
      const currentStep = getCurrentStep(parcel);
      const currentLocation = locations[currentStep] || "Delivered";

      return {
        trackingNumber: parcel.trackingNumber,
        createdAt: parcel.createdAt,
        currentLocation: currentLocation,
      };
    });

    res.render('admin', { parcels: enrichedParcels });
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});

app.post('/admin/generate', ensureAdmin, async (req, res) => {
  const trackingNumber = generateTrackingNumber();
  const createdAt = new Date();

  try {
    await Parcel.create({ trackingNumber, createdAt });
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});

// ----------------- SERVER START -----------------

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
