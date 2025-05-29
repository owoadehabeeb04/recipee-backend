"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeInterractionRouter = void 0;
const express_1 = __importDefault(require("express"));
const recipeIntteraction_1 = require("../controllers/recipeInterractionController/recipeIntteraction");
const authMIddleware_1 = require("../middleware/authMIddleware");
const router = express_1.default.Router();
exports.recipeInterractionRouter = router;
// Start cooking a recipe
router.post('/start', authMIddleware_1.verifyToken, recipeIntteraction_1.startCooking);
// Complete cooking (Done Cooking)
router.post('/complete', authMIddleware_1.verifyToken, recipeIntteraction_1.completeCooking);
// Didn't cook / Abandon
router.post('/didnt-cook', authMIddleware_1.verifyToken, recipeIntteraction_1.didntCook);
// Get cooking status for a recipe
router.get('/status/:recipeId', authMIddleware_1.verifyToken, recipeIntteraction_1.getCookingStatus);
// Track step completion (optional)
router.post('/step', authMIddleware_1.verifyToken, recipeIntteraction_1.trackStepCompletion);
