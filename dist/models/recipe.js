"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const recipeSchema = new mongoose_1.default.Schema({
    admin: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.roleCreated === 'admin';
        },
    },
    adminDetails: {
        name: { type: String },
        email: { type: String },
        role: { type: String },
    },
    adminId: {
        type: String,
        required: function () {
            return this.roleCreated === 'admin';
        },
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.roleCreated === 'user';
        },
    },
    userDetails: {
        name: { type: String },
        email: { type: String },
        role: { type: String },
    },
    title: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'beverage'],
    },
    cookingTime: { type: Number, required: true },
    description: { type: String, required: true },
    difficulty: {
        type: String,
        required: true,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
    },
    featuredImage: { type: String, default: '' },
    ingredients: {
        type: [
            {
                name: { type: String, required: true },
                quantity: { type: String, required: true },
                unit: { type: String, required: true },
            },
        ],
        required: true,
        _id: false,
    },
    servings: { type: Number, required: true },
    steps: { type: [String], required: true },
    tips: { type: [String], required: true },
    isPublished: { type: Boolean, default: false },
    nutrition: {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
        sugar: { type: Number, default: 0 },
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    roleCreated: {
        type: String,
        enum: ['admin', 'user'],
        required: true,
    },
    // ratings: [
    //   {
    //     userId: { type: String },
    //     rating: { type: Number, min: 1, max: 5 },
    //     comment: { type: String },
    //   },
    // ],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    ratingDistribution: {
        5: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        1: { type: Number, default: 0 },
    },
}, { timestamps: true });
// adding searching performance using .index
recipeSchema.index({
    title: 'text',
    description: 'text',
    'ingredients.name': 'text',
});
// // calculating average rate
// recipeSchema.virtual('calculatedRating').get(function () {
//   if (this.ratings.length === 0) {
//     return 0;
//   }
//   const sumRating = this.ratings.reduce(
//     (total, current) => total + (current.rating ?? 0),
//     0
//   );
//   return sumRating / this.ratings.length;
// });
// // Pre-save hook to update average rating
// recipeSchema.pre('save', function (next) {
//   if (this.ratings && this.ratings.length > 0) {
//     const sum = this.ratings.reduce(
//       (total, current) => total + (current.rating ?? 0),
//       0
//     );
//     this.averageRating = sum / this.ratings.length;
//   }
//   next();
// });
const RecipeModel = mongoose_1.default.model('recipes', recipeSchema);
exports.default = RecipeModel;
