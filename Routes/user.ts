import express, { Request } from 'express';

import { isSuperAdmin, verifyToken } from '../middleware/authMIddleware';
import {
  deleteUser,
  getAllUsers,
  getSingleUser,
  updateProfileDetails,
} from '../controllers/usersController';

const router = express.Router();

router.post('/edit-user/:id', verifyToken, updateProfileDetails);
router.get('/', verifyToken, isSuperAdmin, getAllUsers);
router.get('/:id', verifyToken, isSuperAdmin, getSingleUser);
router.delete('/delete/:id', verifyToken, isSuperAdmin, deleteUser);

export { router as UserRouter };
