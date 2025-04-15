import express, { Request } from 'express';

import { isUser, verifyToken } from '../middleware/authMIddleware';
import {
  addToFavorites,
  checkFavoriteStatus,
  getAllFavorites,
  removeFavorite,
} from '../controllers/favoritesController';

const router = express.Router();

router.post('/', verifyToken, isUser, addToFavorites);
router.get('/', verifyToken, isUser, getAllFavorites);
router.delete('/:recipeId', verifyToken, isUser, removeFavorite);
router.get('/status/:recipeId', verifyToken, isUser, checkFavoriteStatus);

export { router as FavoriteRouter };
