import * as mongoose from "mongoose";
mongoose.connect("mongodb://localhost:27017/tracker");
export { mongoose as db };