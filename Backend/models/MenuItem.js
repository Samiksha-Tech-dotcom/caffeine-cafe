import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
    {
        label: { type: String, required: true, trim: true },
        priceDelta: { type: Number, default: 0 }, // extra paisa, jaise lactose-free pe +30
    },
    { _id: false }
);

const customizationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // jaise "Milk", "Crust"
        selection: { type: String, enum: ["single", "multi"], default: "single" },
        isRequired: { type: Boolean, default: false },
        options: { type: [optionSchema], default: [] },
    },
    { _id: false }
);

const menuItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: ["coffee", "cold-drinks", "snacks", "desserts", "mains"],
        },
        isVeg: {
            type: Boolean,
            default: true,
        },
        image: {
            type: String,
            default: "",
        },
        imagePublicId: {
            type: String,
            default: "",
        },
        customizations: {
            type: [customizationSchema],
            default: [],
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;
