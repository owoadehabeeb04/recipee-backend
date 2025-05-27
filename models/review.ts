import { Schema, model, models } from 'mongoose';

const ReviewSchema = new Schema({
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'recipes',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  helpful: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ReviewSchema.index({ recipeId: 1, userId: 1 }, { unique: true });

ReviewSchema.index({ recipeId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });

const Review = models.Review || model('Review', ReviewSchema);
export default Review;