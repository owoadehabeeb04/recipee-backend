import mongoose, {Document} from "mongoose";
interface IUser extends Document {
email: string;
username: string;
password: string;
}
// schema for user table in mongo db
const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    username: {type: String, required: true, unique: true },
    password: {type: String, required: true}

})

const UserModel = mongoose.model<IUser>("users", userSchema);

export default UserModel;