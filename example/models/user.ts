import * as mongoose from "mongoose";
import { db } from "./db";

interface IUser extends mongoose.Document {
    name: string;
    heh: any;
}

type UserType = IUser & mongoose.Document;

export const User = db.model<UserType>('User', new mongoose.Schema({
    name : {type : String, required : true},
}));
