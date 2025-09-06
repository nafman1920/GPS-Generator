const mongoose = require('mongoose');
const Parcel = require('./models/Parcels');  // Ensure filename is correct

// ✅ Directly use your MongoDB URI here
const MONGO_URI = "mongodb+srv://nafman192019:qA9E8RzHDIPQyxq1@cluster0.tt3gbpy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function fixMissingFields() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to DB');

    // Fix: Ensure all parcels have a route array
    const result = await Parcel.updateMany(
      { route: { $exists: false } },
      { $set: { route: [] } }
    );

    console.log(`🛠️ ${result.modifiedCount} documents updated with empty route.`);
    // Fix invalid route.status values
const corrections = {
  "Parcel received at origin facility": "Created",
  "Parcel in transit": "In Transit",
  "Parcel in customs custody": "Suspended",
  "Parcel delivered": "Delivered",
};

const parcels = await Parcel.find({ 'route.status': { $in: Object.keys(corrections) } });

for (const parcel of parcels) {
  let updated = false;
  parcel.route.forEach(step => {
    if (corrections[step.status]) {
      step.status = corrections[step.status];
      updated = true;
    }
  });

  if (updated) await parcel.save();
}

console.log(`✅ Fixed route.status for ${parcels.length} parcels.`);


    // Add more fixes here if needed

    await mongoose.disconnect();
    console.log('🔌 Disconnected from DB');
  } catch (err) {
    console.error('❌ Error fixing DB:', err);
    process.exit(1);
  }
}

fixMissingFields();
