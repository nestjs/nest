import * as mongoose from "mongoose";
mongoose.connect("mongodb://localhost:27017/tracker", {
    server: {
        socketOptions: {
            socketTimeoutMS: 0,
            connectTimeoutMS: 0
        }
    }
});
export { mongoose as db };