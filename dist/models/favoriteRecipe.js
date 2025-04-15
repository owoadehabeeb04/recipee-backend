"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const favoriteSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    recipe: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'recipes',
        required: true,
    },
}, { timestamps: true });
favoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });
const FavoriteModel = mongoose_1.default.model('Favorite', favoriteSchema);
exports.default = FavoriteModel;
