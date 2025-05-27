import { Schema, model, models } from 'mongoose';

const RecipeInteractionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'recipes',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true, 
    default: () => new Date().getTime().toString()
  },
  status: {
    type: String,
    enum: ['viewed', 'started_cooking', 'cooking_in_progress', 'completed', 'abandoned', 'didnt_cook'],
    default: 'viewed'
  },
  actions: [{
    type: {
      type: String,
      enum: [
        'viewed_recipe',
        'viewed_ingredients', 
        'viewed_instructions',
        'started_cooking',
        'completed_step',
        'marked_complete',
        'marked_abandoned',
        'marked_didnt_cook',
        'added_to_meal_plan',
        'removed_from_meal_plan'
      ]
    },
    stepNumber: {
      type: Number, 
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Schema.Types.Mixed, 
      default: {}
    }
  }],
  totalCookingTime: {
    type: Number, 
    default: 0
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  isVerifiedCook: {
    type: Boolean,
    default: false
  },
  fromMealPlan: {
    type: Boolean,
    default: false
  },
  mealPlanId: {
    type: Schema.Types.ObjectId,
    ref: 'MealPlan',
    default: null
  }
}, {
  timestamps: true
});

RecipeInteractionSchema.index({ userId: 1, recipeId: 1 });
RecipeInteractionSchema.index({ userId: 1, status: 1 });
RecipeInteractionSchema.index({ recipeId: 1, isVerifiedCook: 1 });

const RecipeInteraction = models.RecipeInteraction || model('RecipeInteraction', RecipeInteractionSchema);
export default RecipeInteraction;