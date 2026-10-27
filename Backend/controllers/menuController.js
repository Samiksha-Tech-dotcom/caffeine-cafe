import MenuItem from "../models/MenuItem.js";
import { cloudinary } from "../config/cloudinary.js";
import Order from "../models/Order.js";

// Add one menu item
export const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      isVeg,
      customizations,
      isAvailable,
    } = req.body;

    // FormData se customizations text (string) banke aata hai, isliye parse karna padta hai
    let parsedCustomizations = [];
    if (customizations) {
      parsedCustomizations =
        typeof customizations === "string"
          ? JSON.parse(customizations)
          : customizations;
    }

    const item = await MenuItem.create({
      name,
      description,
      price,
      category,
      isVeg,
      image: req.file ? req.file.path : "",
      imagePublicId: req.file ? req.file.filename : "",
      customizations: parsedCustomizations,
      isAvailable,
    });

    return res.status(201).json({
      success: true,
      item,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0].message,
      });
    }

    if (err instanceof SyntaxError) {
      return res.status(400).json({
        success: false,
        message: "Invalid customizations format",
      });
    }

    console.error("Create menu item error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get menu items with optional filters
export const getMenuItems = async (req, res) => {
  try {
    const { category, veg, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (veg === "true") filter.isVeg = true;
    if (veg === "false") filter.isVeg = false;

    if (search) {
      const safe = String(search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      filter.name = { $regex: safe, $options: "i" };
    }

    const items = await MenuItem.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("Get menu error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get one menu item
export const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Edit a menu item
export const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "price",
      "category",
      "isVeg",
      "customizations",
      "isAvailable",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        item[field] =
          field === "customizations" && typeof req.body[field] === "string"
            ? JSON.parse(req.body[field])
            : req.body[field];
      }
    }

    // Nayi image aayi hai to purani Cloudinary se hata do
    if (req.file) {
      if (item.imagePublicId) {
        await cloudinary.uploader.destroy(item.imagePublicId);
      }
      item.image = req.file.path;
      item.imagePublicId = req.file.filename;
    }

    await item.save();

    return res.status(200).json({
      success: true,
      item,
    });
  } catch (err) {
    if (
      err.name === "ValidationError" ||
      err.name === "CastError" ||
      err instanceof SyntaxError
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item data or ID",
      });
    }

    console.error("Update menu item error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete a menu item
export const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Pehle Cloudinary se image hatao, phir database se item
    if (item.imagePublicId) {
      await cloudinary.uploader.destroy(item.imagePublicId);
    }
    await item.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /api/menu/popular : pichle 30 din mein sabse zyada order hue items (public)
export const getPopularItems = async (req, res) => {
  try {
    const limit = 6;

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const top = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $nin: ["cancelled", "awaiting_payment"] },
        },
      },
      { $unwind: "$items" },
      { $group: { _id: "$items.menuItem", qty: { $sum: "$items.qty" } } },
      { $sort: { qty: -1 } },
      { $limit: limit * 2 },
    ]);

    // Sirf wahi items jo abhi available hain
    const found = await MenuItem.find({
      _id: { $in: top.map((t) => t._id) },
      isAvailable: true,
    });
    const byId = new Map(found.map((m) => [String(m._id), m]));

    let items = top
      .map((t) => byId.get(String(t._id)))
      .filter(Boolean)
      .slice(0, limit);

    // Orders kam hon to baaki jagah naye available items se bharo
    if (items.length < limit) {
      const extra = await MenuItem.find({
        isAvailable: true,
        _id: { $nin: items.map((i) => i._id) },
      })
        .sort({ createdAt: -1 })
        .limit(limit - items.length);
      items = [...items, ...extra];
    }

    return res.status(200).json({ success: true, items });
  } catch (err) {
    console.error("Get popular items error:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};