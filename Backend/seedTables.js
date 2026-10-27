import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Table from "./models/Table.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const tables = [
  { number: 1, seats: 2 },
  { number: 2, seats: 2 },
  { number: 3, seats: 2 },
  { number: 4, seats: 2 },
  { number: 5, seats: 4 },
  { number: 6, seats: 4 },
  { number: 7, seats: 4 },
  { number: 8, seats: 6 },
  { number: 9, seats: 6 },
  { number: 10, seats: 8 },
];

const run = async () => {
  await connectDB();
  await Table.bulkWrite(
    tables.map((t) => ({
      updateOne: { filter: { number: t.number }, update: { $set: t }, upsert: true },
    }))
  );
  console.log(`Added ${tables.length} tables`);
  await mongoose.disconnect();
};

run();