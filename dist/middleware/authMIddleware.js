"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUser = exports.isSuperAdmin = exports.isAdminOrUser = exports.isAdmin = exports.optionalAuth = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//function  to  verify token
const verifyToken = (req, res, next) => {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    // console.log(req.headers, 'REQqqqq');
    console.log('AUTH HEADER', authHeader);
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: No token provided',
        });
    }
    // Check if it follows the Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: Invalid token format',
        });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied: Token missing',
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};
exports.verifyToken = verifyToken;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    // If there's no Authorization header, continue without setting req.user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = undefined;
        return next();
    }
    const token = authHeader.split(' ')[1];
    // Check for basic token format
    const isValidTokenFormat = token && /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(token);
    if (!token || !isValidTokenFormat) {
        req.user = undefined;
        return next();
    }
    try {
        // Try to verify the token with better error handling
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        console.log('Decoded token:', JSON.stringify(decoded));
        req.user = decoded;
    }
    catch (error) {
        console.error('Token verification error:', error);
        console.log('Token verification failed. Error:', error.message);
        req.user = undefined;
    }
    // Always continue to the next middleware
    next();
};
exports.optionalAuth = optionalAuth;
// function to check if a user is an admin
const isAdmin = (req, res, next) => {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({ message: 'Requires admin privileges' });
    }
    next();
};
exports.isAdmin = isAdmin;
// function to check if a user is an admin or user
const isAdminOrUser = (req, res, next) => {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'user') {
        return res
            .status(403)
            .json({ message: 'Requires admin or user privileges' });
    }
    next();
};
exports.isAdminOrUser = isAdminOrUser;
// function to check if a user is a super admin
const isSuperAdmin = (req, res, next) => {
    const role = req.user.role;
    console.log('role', role);
    if (role !== 'super_admin') {
        return res.status(403).json({ message: 'Requires super admin privilege' });
    }
    next();
};
exports.isSuperAdmin = isSuperAdmin;
const isUser = (req, res, next) => {
    var _a;
    if (((_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'user') {
        return res.status(403).json({ message: 'Requires user privileges only' });
    }
    next();
};
exports.isUser = isUser;
