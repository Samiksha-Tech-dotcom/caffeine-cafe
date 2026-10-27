import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const lineSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  qty: { type: Number, required: true, min: 1, max: 20 },
  choices: { type: [choiceSchema], default: [] },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [lineSchema], default: [] },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;