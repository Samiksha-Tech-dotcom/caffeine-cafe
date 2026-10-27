import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // chhota badge text, jaise "20% OFF" ya "Buy 1 Get 1"
    tag: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // optional: is date ke baad offer apne aap customers ko dikhna band ho jayega
    expiresAt: {
      type: Date,
      default: null,
    },

    // ----- Coupon (optional, code na ho to offer sirf banner hai) -----
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      default: "percent",
    },
    discountValue: {
      type: Number,
      min: [0, "Discount cannot be negative"],
      default: 0,
    },
    minOrder: {
      type: Number,
      min: [0, "Minimum order cannot be negative"],
      default: 0,
    },
  },
  { timestamps: true }
);

// Ek code sirf ek offer pe (jin offers mein code nahi hai unpe ye rule lagu nahi hota)
offerSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;