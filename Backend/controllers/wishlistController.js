import mongoose from "mongoose";
import User from "../models/User.js";
import MenuItem from "../models/MenuItem.js";

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    const items = user.wishlist;
    res.status(200).json({
      success: true,
      ids: items.map((i) => String(i._id)),
      items,
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid item" });
    }
    if (!(await MenuItem.exists({ _id: itemId }))) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // $addToSet se same dish do baar save nahi hoti
    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: itemId } });
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid item" });
    }

    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: itemId } });
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};