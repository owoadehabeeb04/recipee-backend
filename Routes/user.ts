import express, { Request } from 'express';

import { verifyToken } from '../middleware/authMIddleware';
import { updateProfileDetails } from '../controllers/usersController';


const router = express.Router();


router.post('/edit-user/:id', verifyToken, updateProfileDetails)



export { router as UserRouter };
