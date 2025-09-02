const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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

// ---------------- DATABASE ----------------
const db = new sqlite3.Database('./tracking.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS parcels (
      trackingNumber TEXT PRIMARY KEY,
      createdAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trackingNumber TEXT,
      location TEXT,
      timestamp TEXT,
      FOREIGN KEY (trackingNumber) REFERENCES parcels(trackingNumber)
    )
  `);
});

// ---------------- HELPERS ----------------
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

function updateHistoryIfNeeded(trackingNumber, parcel, callback) {
  const currentStep = getCurrentStep(parcel);

  db.all(`SELECT COUNT(*) as count FROM history WHERE trackingNumber = ?`, [trackingNumber], (err, rows) => {
    if (err) return callback(err);

    const historyCount = rows[0].count;

    if (historyCount < currentStep + 1) {
      for (let i = historyCount; i <= currentStep; i++) {
        db.run(
          `INSERT INTO history (trackingNumber, location, timestamp) VALUES (?, ?, ?)`,
          [trackingNumber, locations[i], new Date().toLocaleString()]
        );
      }
    }
    callback();
  });
}

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// ---------------- PUBLIC ROUTES ----------------
app.get('/', (req, res) => {
  res.render('index'); 
});

app.post('/track', (req, res) => {
  const trackingNumber = req.body.trackingNumber.trim();
  res.redirect(`/track/${trackingNumber}`);
});

app.get('/track/:trackingNumber', (req, res) => {
  const { trackingNumber } = req.params;

  db.get(`SELECT * FROM parcels WHERE trackingNumber = ?`, [trackingNumber], (err, parcel) => {
    if (err || !parcel) return res.status(404).send("Tracking number not found.");

    updateHistoryIfNeeded(trackingNumber, parcel, () => {
      const currentStep = getCurrentStep(parcel);
      const currentLocation = locations[currentStep] || "Delivered";
      const isDelivered = currentStep >= locations.length - 1;

      db.all(`SELECT * FROM history WHERE trackingNumber = ? ORDER BY id ASC`, [trackingNumber], (err, history) => {
        if (err) return res.status(500).send("Database error");

        res.render('track', {
       trackingNumber,
       currentLocation,
       history,
       isDelivered,
        currentStep,
         locations,
         parcel   // ✅ add parcel so we can show createdAt in track.ejs
       });

      });
    });
  });
});

// ---------------- ADMIN ROUTES ----------------
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

app.get('/admin', ensureAdmin, (req, res) => {
  db.all(`SELECT * FROM parcels`, (err, parcels) => {
    if (err) return res.status(500).send("DB error");

    // Enrich parcels with current location and last updated
    const enrichedParcels = parcels.map(parcel => {
      const currentStep = getCurrentStep(parcel);
      const currentLocation = locations[currentStep] || "Delivered";

      return {
        tracking_number: parcel.trackingNumber,
        created_at: parcel.createdAt,
        current_location: currentLocation,
        last_updated: new Date(parcel.createdAt).toLocaleString()
      };
    });

    res.render("admin", { parcels: enrichedParcels });
  });
});


app.post('/admin/generate', ensureAdmin, (req, res) => {
  const trackingNumber = generateTrackingNumber();
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO parcels (trackingNumber, createdAt) VALUES (?, ?)`,
    [trackingNumber, createdAt],
    (err) => {
      if (err) return res.status(500).send("DB error");
      res.redirect('/admin');
    }
  );
});

// ---------------- SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
