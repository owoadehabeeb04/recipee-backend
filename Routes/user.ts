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
router.get('/validate-token', verifyToken, (req, res) => {
  console.log('token')
  // If middleware authenticateToken passes, token is valid
  res.status(200).json({ valid: true });
});
export { router as UserRouter };
