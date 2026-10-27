import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true, min: 1 },
  seats: { type: Number, required: true, min: 1, max: 12 },
});

const Table = mongoose.model("Table", tableSchema);

export default Table;