import mongoose from 'mongoose';

interface Favorite {
  recipe: mongoose.Types.ObjectId | any;
  createdAt: Date;
  user: mongoose.Types.ObjectId;
}

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'recipes',
      required: true,
    },
  },
  { timestamps: true }
);
favoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });
const FavoriteModel = mongoose.model<Favorite>('Favorite', favoriteSchema);

export default FavoriteModel;
