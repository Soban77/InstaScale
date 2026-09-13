/**
 * Small utility script, not a full fixture seeder: promotes an existing
 * user to admin so you can test the Admin Panel / moderation routes,
 * which are gated by requireAdmin.
 *
 * Usage:
 *   node scripts/seed.js you@example.com
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/seed.js <email-of-user-to-promote>');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { isAdmin: true },
    { new: true }
  );

  if (!user) {
    console.error(`No user found with email ${email}. Register that account first.`);
  } else {
    console.log(`${user.username} (${user.email}) is now an admin.`);
  }

  await mongoose.disconnect();
}

main();
