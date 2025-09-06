const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const Parcel = require('./models/Parcels');
const History = require('./models/History');

const app = express();
const PORT = process.env.PORT || 3000;

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

// ----------------- HELPERS -----------------

// Full list of countries with capital and region
const countries = [
  // Europe
  { country: "Germany", capital: "Berlin", region: "Europe" },
  { country: "France", capital: "Paris", region: "Europe" },
  { country: "Italy", capital: "Rome", region: "Europe" },
  { country: "Sweden", capital: "Stockholm", region: "Europe" },
  { country: "Poland", capital: "Warsaw", region: "Europe" },
  { country: "Portugal", capital: "Lisbon", region: "Europe" },
  { country: "Ukraine", capital: "Kyiv", region: "Europe" },
  { country: "Netherlands", capital: "Amsterdam", region: "Europe" },
  { country: "Switzerland", capital: "Bern", region: "Europe" },
  { country: "Croatia", capital: "Zagreb", region: "Europe" },
  { country: "Ireland", capital: "Dublin", region: "Europe" },
  { country: "Czech Republic", capital: "Prague", region: "Europe" },
  { country: "Greece", capital: "Athens", region: "Europe" },
  { country: "Norway", capital: "Oslo", region: "Europe" },
  { country: "Belgium", capital: "Brussels", region: "Europe" },

  // Asia
  { country: "Japan", capital: "Tokyo", region: "Asia" },
  { country: "India", capital: "New Delhi", region: "Asia" },
  { country: "China", capital: "Beijing", region: "Asia" },
  { country: "South Korea", capital: "Seoul", region: "Asia" },
  { country: "Thailand", capital: "Bangkok", region: "Asia" },
  { country: "Indonesia", capital: "Jakarta", region: "Asia" },
  { country: "Vietnam", capital: "Hanoi", region: "Asia" },
  { country: "Philippines", capital: "Manila", region: "Asia" },
  { country: "Malaysia", capital: "Kuala Lumpur", region: "Asia" },
  { country: "Singapore", capital: "Singapore", region: "Asia" },
  { country: "Pakistan", capital: "Islamabad", region: "Asia" },
  { country: "Bangladesh", capital: "Dhaka", region: "Asia" },
  { country: "Sri Lanka", capital: "Colombo", region: "Asia" },
  { country: "Nepal", capital: "Kathmandu", region: "Asia" },
  { country: "Mongolia", capital: "Ulaanbaatar", region: "Asia" },

  // North America
  { country: "United States", capital: "Washington, D.C.", region: "North America" },
  { country: "Canada", capital: "Ottawa", region: "North America" },
  { country: "Mexico", capital: "Mexico City", region: "North America" },
  { country: "Cuba", capital: "Havana", region: "North America" },
  { country: "Jamaica", capital: "Kingston", region: "North America" },
  { country: "Costa Rica", capital: "San José", region: "North America" },
  { country: "Panama", capital: "Panama City", region: "North America" },
  { country: "Guatemala", capital: "Guatemala City", region: "North America" },
  { country: "Honduras", capital: "Tegucigalpa", region: "North America" },
  { country: "El Salvador", capital: "San Salvador", region: "North America" },
  { country: "Nicaragua", capital: "Managua", region: "North America" },
  { country: "Dominican Republic", capital: "Santo Domingo", region: "North America" },
  { country: "Haiti", capital: "Port-au-Prince", region: "North America" },
  { country: "Bahamas", capital: "Nassau", region: "North America" },
  { country: "Belize", capital: "Belmopan", region: "North America" },

  // South America
  { country: "Brazil", capital: "Brasília", region: "South America" },
  { country: "Argentina", capital: "Buenos Aires", region: "South America" },
  { country: "Chile", capital: "Santiago", region: "South America" },
  { country: "Peru", capital: "Lima", region: "South America" },
  { country: "Colombia", capital: "Bogotá", region: "South America" },
  { country: "Venezuela", capital: "Caracas", region: "South America" },
  { country: "Bolivia", capital: "Sucre", region: "South America" },
  { country: "Ecuador", capital: "Quito", region: "South America" },
  { country: "Paraguay", capital: "Asunción", region: "South America" },
  { country: "Uruguay", capital: "Montevideo", region: "South America" },
  { country: "Guyana", capital: "Georgetown", region: "South America" },
  { country: "Suriname", capital: "Paramaribo", region: "South America" },
  { country: "French Guiana", capital: "Cayenne", region: "South America" },
  { country: "Falkland Islands", capital: "Stanley", region: "South America" },
  { country: "South Georgia and the South Sandwich Islands", capital: "King Edward Point", region: "South America" },

  // Oceania
  { country: "Australia", capital: "Canberra", region: "Oceania" },
  { country: "New Zealand", capital: "Wellington", region: "Oceania" },
  { country: "Papua New Guinea", capital: "Port Moresby", region: "Oceania" },
  { country: "Fiji", capital: "Suva", region: "Oceania" },
  { country: "Solomon Islands", capital: "Honiara", region: "Oceania" },
  { country: "Vanuatu", capital: "Port Vila", region: "Oceania" },
  { country: "Samoa", capital: "Apia", region: "Oceania" },
  { country: "Tonga", capital: "Nukuʻalofa", region: "Oceania" },
];


function generateTrackingNumber() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let tracking = '1Z';
  for (let i = 0; i < 16; i++) {
    tracking += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tracking;
}

// Generate random intermediate route
function generateRoute(pickup, destination) {
  // Filter out pickup and destination
  const intermediatesPool = countries
    .map(c => c.capital + ', ' + c.country)
    .filter(loc => loc !== pickup && loc !== destination);

  // Shuffle
  const shuffled = intermediatesPool.sort(() => 0.5 - Math.random());
  const intermediates = shuffled.slice(0, 5); // 5 random intermediates
  const customs = shuffled[5] || "Customs Checkpoint";

  return [
    { location: pickup, status: "Parcel received at origin facility" },
    ...intermediates.map(c => ({ location: c, status: "Parcel in transit" })),
    { location: customs, status: "Parcel in customs custody" },
    { location: destination, status: "Parcel delivered" }
  ];
}


async function updateHistoryIfNeeded(parcel) {
  if (parcel.suspended) return; // skip if suspended

  const now = new Date();
  const lastUpdated = parcel.lastUpdated || parcel.createdAt;
  const hoursSince = (now - lastUpdated) / (1000 * 60 * 60);

  // only update every 24h
  if (hoursSince < 24) return;

  const historyCount = await History.countDocuments({ trackingNumber: parcel.trackingNumber });
  if (historyCount < parcel.route.length) {
    const nextStep = parcel.route[historyCount];
    await History.create({
      trackingNumber: parcel.trackingNumber,
      location: nextStep.location,
      status: nextStep.status,
      timestamp: new Date()
    });

    parcel.lastUpdated = now;
    await parcel.save();
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

    await updateHistoryIfNeeded(parcel);

    const history = await History.find({ trackingNumber }).sort({ timestamp: 1 });
    const currentStep = history.length - 1;
    const currentLocation = history[currentStep]?.location || "Awaiting pickup";
    const isDelivered = currentStep >= parcel.route.length - 1;

    res.render('track', {
      trackingNumber,
      currentLocation,
      history,
      isDelivered,
      currentStep,
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

// Only allow admin to access this route
app.get('/admin', ensureAdmin, async (req, res) => {
  try {
    const parcels = await Parcel.find();

    res.render('admin', { 
      parcels,
      countries // pass array to populate dropdowns
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});

// Only the admin should be able to generate a new tracking number
app.post('/admin/generate', ensureAdmin, async (req, res) => {
  const { pickupLocation, deliveredLocation } = req.body;
  const trackingNumber = generateTrackingNumber();
  const createdAt = new Date();

  try {
    const route = generateRoute(pickupLocation, deliveredLocation);
    await Parcel.create({
      trackingNumber,
      createdAt,
      pickupLocation,
      deliveredLocation,
      route,
      suspended: false,
      lastUpdated: createdAt
    });

    // Insert first history entry (pickup)
    await History.create({
      trackingNumber,
      location: pickupLocation,
      status: "Parcel received at origin facility",
      timestamp: createdAt
    });

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});
// Suspend a Parcel
app.post('/admin/suspend/:trackingNumber', ensureAdmin, async (req, res) => {
  const { trackingNumber } = req.params;

  try {
    const parcel = await Parcel.findOne({ trackingNumber });

    if (!parcel) {
      return res.status(404).send('Parcel not found.');
    }

    parcel.suspended = true;
    await parcel.save();

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error suspending parcel.');
  }
});

// Resume Parcel Movement
app.post('/admin/resume/:trackingNumber', ensureAdmin, async (req, res) => {
  const { trackingNumber } = req.params;

  try {
    const parcel = await Parcel.findOne({ trackingNumber });

    if (!parcel) {
      return res.status(404).send('Parcel not found.');
    }

    parcel.suspended = false;
    await parcel.save();

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error resuming parcel movement.');
  }
});


// ----------------- SERVER START -----------------

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
