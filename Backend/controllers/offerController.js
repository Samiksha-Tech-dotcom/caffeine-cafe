import Offer from "../models/offer.js";
import { applyCoupon } from "../utils/coupon.js";

const bad = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

// Coupon wali fields ko saaf karke check karta hai.
// Galat ho to error ka message return karta hai, sahi ho to null.
const checkCoupon = (data) => {
  if (!data.code) return null; // code nahi hai to offer sirf banner hai

  if (!/^[A-Z0-9]{3,20}$/.test(data.code)) {
    return "Code must be 3 to 20 letters or numbers, with no spaces";
  }
  if (!["percent", "flat"].includes(data.discountType)) {
    return "Choose percent or flat discount";
  }
  if (!(data.discountValue > 0)) {
    return "Discount value must be more than 0";
  }
  if (data.discountType === "percent" && data.discountValue > 100) {
    return "Percent discount cannot be more than 100";
  }
  return null;
};

// Form se aaye numbers aur code ko saaf karo
const cleanCouponFields = (body) => ({
  code: body.code ? String(body.code).trim().toUpperCase() : "",
  discountType: body.discountType || "percent",
  discountValue: Number(body.discountValue) || 0,
  minOrder: Number(body.minOrder) || 0,
});

// Customers ke liye: sirf active aur expire na hue offers
export const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (err) {
    console.error("Get active offers error:", err.message);
    return bad(res, "Server error", 500);
  }
};

// Admin ke liye: saare offers
export const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (err) {
    console.error("Get all offers error:", err.message);
    return bad(res, "Server error", 500);
  }
};

// Naya offer banao
export const createOffer = async (req, res) => {
  try {
    const { title, description, tag, isActive, expiresAt } = req.body;
    const coupon = cleanCouponFields(req.body);

    const problem = checkCoupon(coupon);
    if (problem) return bad(res, problem);

    const data = {
      title,
      description,
      tag,
      isActive,
      expiresAt: expiresAt || null,
    };

    if (coupon.code) {
      data.code = coupon.code;
      data.discountType = coupon.discountType;
      data.discountValue = coupon.discountValue;
      data.minOrder = coupon.minOrder;
    }

    const offer = await Offer.create(data);

    return res.status(201).json({ success: true, offer });
  } catch (err) {
    if (err.code === 11000) {
      return bad(res, "This code is already used by another offer", 409);
    }

    if (err.name === "ValidationError") {
      return bad(res, Object.values(err.errors)[0].message);
    }

    console.error("Create offer error:", err.message);
    return bad(res, "Server error", 500);
  }
};

// Offer edit karo
export const updateOffer = async (req, res) => {
  try {
    const set = {};
    const unset = {};

    for (const field of ["title", "description", "tag", "isActive"]) {
      if (req.body[field] !== undefined) set[field] = req.body[field];
    }

    if (req.body.expiresAt !== undefined) {
      set.expiresAt = req.body.expiresAt || null;
    }

    // Coupon wali fields sirf tab badlo jab form ne bheji hon
    if (req.body.code !== undefined) {
      const coupon = cleanCouponFields(req.body);

      const problem = checkCoupon(coupon);
      if (problem) return bad(res, problem);

      if (coupon.code) {
        set.code = coupon.code;
        set.discountType = coupon.discountType;
        set.discountValue = coupon.discountValue;
        set.minOrder = coupon.minOrder;
      } else {
        // Code khaali chhoda to coupon hata do, offer wapas sirf banner ban jayega
        unset.code = "";
        set.discountType = "percent";
        set.discountValue = 0;
        set.minOrder = 0;
      }
    }

    const update = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const offer = await Offer.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!offer) return bad(res, "Offer not found", 404);

    return res.status(200).json({ success: true, offer });
  } catch (err) {
    if (err.code === 11000) {
      return bad(res, "This code is already used by another offer", 409);
    }

    if (err.name === "ValidationError" || err.name === "CastError") {
      return bad(res, "Invalid offer data or ID");
    }

    console.error("Update offer error:", err.message);
    return bad(res, "Server error", 500);
  }
};

// Offer delete karo
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) return bad(res, "Offer not found", 404);

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (err) {
    if (err.name === "CastError") return bad(res, "Invalid offer ID");

    return bad(res, "Server error", 500);
  }
};
// Customer checkout pe code check karne ke liye (sirf preview, asli discount order banate waqt dobara lagta hai)
export const validateCoupon = async (req, res) => {
  try {
    const subtotal = Number(req.body.subtotal);
    if (!(subtotal >= 0)) return bad(res, "Invalid order amount");

    const result = await applyCoupon(req.body.code, subtotal);
    if (result.error) return bad(res, result.error);
    if (!result.code) return bad(res, "Enter a coupon code");

    return res.status(200).json({
      success: true,
      code: result.code,
      discount: result.discount,
    });
  } catch (err) {
    console.error("Validate coupon error:", err.message);
    return bad(res, "Server error", 500);
  }
};