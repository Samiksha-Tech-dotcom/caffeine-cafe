import Offer from "../models/offer.js";

// Code check karke discount nikalta hai.
// Galat ho to { error: "..." }, sahi ho to { code, discount }
export const applyCoupon = async (rawCode, subtotal) => {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { code: "", discount: 0 };

  const offer = await Offer.findOne({
    code,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (!offer) return { error: "This coupon code is not valid or has expired" };

  if (subtotal < offer.minOrder) {
    return { error: `Add items worth ₹${offer.minOrder} or more to use ${code}` };
  }

  let discount =
    offer.discountType === "percent"
      ? Math.floor((subtotal * offer.discountValue) / 100)
      : offer.discountValue;

  // Discount kabhi subtotal se zyada nahi ho sakta
  discount = Math.min(discount, subtotal);

  return { code, discount };
};