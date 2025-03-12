import { NextFunction } from 'express';
import jwt from 'jsonwebtoken';

//function  to  verify token
export const verifyToken = (
  req: { headers: { authorization: string }; user: any },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: { (arg0: { message: string }): void; new (): any };
    };
  },
  next: NextFunction
) => {
  const token = req.headers.authorization.split(' ')[1];

  // if tehre is no token return 401
  if (!token) {
    res.status(401).json({ message: 'Access denied no token found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: 'invalid token' });
  }
};

// function to check if a user is an admin
export const isAdmin = (req: any, res: any) => {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({ message: 'Requires admin privileges' });
  }
};

// function to check if a user is a super admin
export const isSuperAdmin = (req: any, res: any) => {
  const role = req.user.role;
  if (role !== 'super admin') {
    return res.status(403).json({ message: 'Requires super admin privilege' });
  }
};
