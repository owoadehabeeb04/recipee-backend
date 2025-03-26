import { NextFunction } from 'express';
import jwt from 'jsonwebtoken';

//function  to  verify token
export const verifyToken = (req: any, res: any, next: NextFunction) => {
  // Check if Authorization header exists
  const authHeader = req.headers.authorization;

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as jwt.JwtPayload & { role?: string };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
export const optionalAuth = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log('Raw Authorization header:', authHeader);

  // If there's no Authorization header, continue without setting req.user
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // Check for basic token format
  const isValidTokenFormat =
    token && /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/.test(token);

  if (!token || !isValidTokenFormat) {
    req.user = undefined;
    return next();
  }

  try {
    // Try to verify the token with better error handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('Decoded token:', JSON.stringify(decoded));

    req.user = decoded;
  } catch (error: any) {
    console.error('Token verification error:', error);
    console.log('Token verification failed. Error:', error.message);
    req.user = undefined;
  }

  // Always continue to the next middleware
  next();
};
// function to check if a user is an admin
export const isAdmin = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'super admin') {
    return res.status(403).json({ message: 'Requires admin privileges' });
  }
  next();
};

// function to check if a user is a super admin
export const isSuperAdmin = (req: any, res: any, next: any) => {
  const role = req.user.role;
  if (role !== 'super admin') {
    return res.status(403).json({ message: 'Requires super admin privilege' });
  }
  next();
};
