"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteRouter = void 0;
const express_1 = __importDefault(require("express"));
const authMIddleware_1 = require("../middleware/authMIddleware");
const favoritesController_1 = require("../controllers/favoritesController");
const router = express_1.default.Router();
exports.FavoriteRouter = router;
router.post('/', authMIddleware_1.verifyToken, authMIddleware_1.isUser, favoritesController_1.addToFavorites);
router.get('/', authMIddleware_1.verifyToken, authMIddleware_1.isUser, favoritesController_1.getAllFavorites);
router.delete('/:recipeId', authMIddleware_1.verifyToken, authMIddleware_1.isUser, favoritesController_1.removeFavorite);
router.get('/status/:recipeId', authMIddleware_1.verifyToken, authMIddleware_1.isUser, favoritesController_1.checkFavoriteStatus);
