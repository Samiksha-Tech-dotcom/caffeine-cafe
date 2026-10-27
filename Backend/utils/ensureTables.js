import Table from "../models/Table.js";

const TABLES = [
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

// Server start hote hi tables bana deta hai (jo pehle se hain unhe nahi chhedta)
export const ensureTables = async () => {
  await Table.bulkWrite(
    TABLES.map((t) => ({
      updateOne: {
        filter: { number: t.number },
        update: { $setOnInsert: t },
        upsert: true,
      },
    }))
  );
  console.log(`Tables ready (${TABLES.length})`);
};