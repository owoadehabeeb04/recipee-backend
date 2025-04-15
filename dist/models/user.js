"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
var userRole;
(function (userRole) {
    userRole["USER"] = "user";
    userRole["ADMIN"] = "admin";
    userRole["SUPER_ADMIN"] = "super_admin";
})(userRole || (userRole = {}));
// schema for user table in mongo db
const userSchema = new mongoose_1.default.Schema({
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
            validator: function (v) {
                if (!v)
                    return true; // Optional field
                // Validate phone format - adjust regex as needed
                return /^[\d\s\+\-\(\)]{7,20}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid phone number format`,
        },
    },
}, {
    timestamps: true,
});
const UserModel = mongoose_1.default.model('users', userSchema);
exports.default = UserModel;
