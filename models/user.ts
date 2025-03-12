import mongoose, { Document } from 'mongoose';
interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  otp?: OTP;
  role: string;
}
// category
// : 
// "lunch"
// cookingTime
// : 
// "30"
// description
// : 
// "lovely shiot mani love it "
// difficulty
// : 
// "hard"
// featuredImage
// : 
// ""
// ingredients
// : 
// (2) [{…}, {…}]
// servings
// : 
// "1"
// steps
// : 
// (2) ['mehn nivce step', 'okauy lovely step']
// title
// : 
// "nice recipe"
interface OTP {
  code: string;
  expiresAt: string | Date;
}
enum userRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
// schema for user table in mongo db
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: userRole,
    default: userRole.USER,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
});

const UserModel = mongoose.model<IUser>('users', userSchema);

export default UserModel;
