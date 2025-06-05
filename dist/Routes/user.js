"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRouter = void 0;
const express_1 = __importDefault(require("express"));
const authMIddleware_1 = require("../middleware/authMIddleware");
const usersController_1 = require("../controllers/usersController");
const router = express_1.default.Router();
exports.UserRouter = router;
router.post('/edit-user/:id', authMIddleware_1.verifyToken, usersController_1.updateProfileDetails);
router.get('/', authMIddleware_1.verifyToken, authMIddleware_1.isSuperAdmin, usersController_1.getAllUsers);
router.get('/:id', authMIddleware_1.verifyToken, authMIddleware_1.isSuperAdmin, usersController_1.getSingleUser);
router.delete('/delete/:id', authMIddleware_1.verifyToken, authMIddleware_1.isSuperAdmin, usersController_1.deleteUser);
router.get('/validate-token', authMIddleware_1.verifyToken, (req, res) => {
    console.log('token');
    // If middleware authenticateToken passes, token is valid
    res.status(200).json({ valid: true });
});
