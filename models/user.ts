import mongoose, { Document } from 'mongoose';
interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  otp?: OTP;
  role: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  phoneNumber?: string | number;
  socialMediaLinks?: socialMediaLink;
  createdAt: Date;
  updatedAt: Date;
}
interface OTP {
  code: string;
  expiresAt: string | Date;
}
interface socialMediaLink {
  name?: string;
  link?: string;
}
enum userRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}
// schema for user table in mongo db
const userSchema = new mongoose.Schema(
  {
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
    bio: { type: String, required: false },
    socialMediaLink: {
      name: String,
      link: String,
    },
    location: { type: String, required: false },
    profileImage: { type: String, required: false },
    website: { type: String, required: false },
    phoneNumber: {
      type: String,
      required: false,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Optional field
          // Validate phone format - adjust regex as needed
          return /^[\d\s\+\-\(\)]{7,20}$/.test(v);
        },
        message: (props: { value: any }) =>
          `${props.value} is not a valid phone number format`,
      },
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model<IUser>('users', userSchema);

export default UserModel;
