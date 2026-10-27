import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import MenuItem from "./models/MenuItem.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const opt = (label, priceDelta = 0) => ({ label, priceDelta });

const SUGAR = {
  name: "Sugar level",
  selection: "single",
  isRequired: true,
  options: [opt("Regular"), opt("Less sugar"), opt("No sugar"), opt("Extra sweet")],
};
const MILK = {
  name: "Milk",
  selection: "single",
  isRequired: true,
  options: [
    opt("Regular milk"),
    opt("Lactose-free milk", 30),
    opt("Oat milk", 50),
    opt("Almond milk", 50),
  ],
};
const COFFEE_EXTRAS = {
  name: "Extras",
  selection: "multi",
  isRequired: false,
  options: [opt("Extra espresso shot", 40), opt("Whipped cream", 30)],
};
const CRUST = {
  name: "Crust",
  selection: "single",
  isRequired: true,
  options: [opt("Regular crust"), opt("Cheese burst", 80)],
};
const SPICE = {
  name: "Spice level",
  selection: "single",
  isRequired: true,
  options: [opt("Mild"), opt("Medium"), opt("Spicy")],
};
const EXTRA_CHEESE = {
  name: "Extras",
  selection: "multi",
  isRequired: false,
  options: [opt("Extra cheese", 40)],
};
const DESSERT_EXTRAS = {
  name: "Extras",
  selection: "multi",
  isRequired: false,
  options: [opt("Vanilla ice cream scoop", 60), opt("Chocolate drizzle", 30)],
};

// Pehle category ke hisaab se, phir kuch items ke liye alag (neeche wale override karte hain)
const updates = [
  [{ category: "coffee" }, [SUGAR, MILK, COFFEE_EXTRAS]],
  [{ category: "cold-drinks" }, [SUGAR, MILK]],
  [{ category: "snacks" }, [EXTRA_CHEESE]],
  [{ category: "desserts" }, [DESSERT_EXTRAS]],
  [{ category: "mains", name: /pizza/i }, [CRUST, EXTRA_CHEESE]],
  [{ category: "mains", name: { $not: /pizza/i } }, [SPICE, EXTRA_CHEESE]],
  [{ name: "Americano" }, [SUGAR, COFFEE_EXTRAS]],
  [{ name: "Iced Tea" }, [SUGAR]],
];

const run = async () => {
  await connectDB();
  for (const [filter, customizations] of updates) {
    const result = await MenuItem.updateMany(filter, { $set: { customizations } });
    console.log(`Matched ${result.matchedCount} items`);
  }
  await mongoose.disconnect();
  console.log("Done");
};

run();