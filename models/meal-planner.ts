import mongoose, { Schema, Types } from 'mongoose';

// Define a meal type for better structure
interface Meal {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipe: Types.ObjectId;
  recipeDetails?: RecipeDetails;
}

// Define recipe details structure to be embedded
interface RecipeDetails {
  title: string;
  featuredImage: string;
  category: string;
  cookingTime: number;
  difficulty: string;
  servings: number;
  steps: string[];
  tips: string[];
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Create the schema with a well-defined structure
const MealPlanSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  week: {
    type: Date,
    required: true
  },
  plan: {
    // Define a clear structure for the plan
    monday: {
      breakfast: { 
        mealType: { type: String, enum: ['breakfast'] },
        recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
        recipeDetails: {
          title: String,
          featuredImage: String,
          category: String,
          cookingTime: Number,
          difficulty: String,
          servings: Number,
          steps: [String],        // Array of step instructions
          tips: [String],         // Array of cooking tips
          nutrition: {
            calories: Number,
            protein: Number,
            carbs: Number,
            fat: Number
          }
        }
      },
      lunch: { 
        mealType: { type: String, enum: ['lunch'] },
        recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
        recipeDetails: {
          title: String,
          featuredImage: String,
          category: String,
          cookingTime: Number,
          difficulty: String,
          servings: Number,
          steps: [String],        // Array of step instructions
          tips: [String],         // Array of cooking tips
          nutrition: {
            calories: Number,
            protein: Number,
            carbs: Number,
            fat: Number
          }
        }
      },
      dinner: { 
        mealType: { type: String, enum: ['dinner'] },
        recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
        recipeDetails: {
          title: String,
          featuredImage: String,
          category: String,
          cookingTime: Number,
          difficulty: String,
          servings: Number,
          steps: [String],        // Array of step instructions
          tips: [String],         // Array of cooking tips
          nutrition: {
            calories: Number,
            protein: Number,
            carbs: Number,
            fat: Number
          }
        }
      }
    },
    tuesday: {
        breakfast: { 
          mealType: { type: String, enum: ['breakfast'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        },
        lunch: { 
          mealType: { type: String, enum: ['lunch'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        },
        dinner: { 
          mealType: { type: String, enum: ['dinner'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        }
      },
      wednesday: {
        breakfast: { 
          mealType: { type: String, enum: ['breakfast'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        },
        lunch: { 
          mealType: { type: String, enum: ['lunch'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        },
        dinner: { 
          mealType: { type: String, enum: ['dinner'] },
          recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
          recipeDetails: {
            title: String,
            featuredImage: String,
            category: String,
            cookingTime: Number,
            difficulty: String,
            servings: Number,
            steps: [String],        // Array of step instructions
            tips: [String],         // Array of cooking tips
            nutrition: {
              calories: Number,
              protein: Number,
              carbs: Number,
              fat: Number
            }
          }
        }
      },
      thursday: {
          breakfast: { 
            mealType: { type: String, enum: ['breakfast'] },
            recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
            recipeDetails: {
              title: String,
              featuredImage: String,
              category: String,
              cookingTime: Number,
              difficulty: String,
              servings: Number,
              steps: [String],        // Array of step instructions
              tips: [String],         // Array of cooking tips
              nutrition: {
                calories: Number,
                protein: Number,
                carbs: Number,
                fat: Number
              }
            }
          },
          lunch: { 
            mealType: { type: String, enum: ['lunch'] },
            recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
            recipeDetails: {
              title: String,
              featuredImage: String,
              category: String,
              cookingTime: Number,
              difficulty: String,
              servings: Number,
              steps: [String],        // Array of step instructions
              tips: [String],         // Array of cooking tips
              nutrition: {
                calories: Number,
                protein: Number,
                carbs: Number,
                fat: Number
              }
            }
          },
          dinner: { 
            mealType: { type: String, enum: ['dinner'] },
            recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
            recipeDetails: {
              title: String,
              featuredImage: String,
              category: String,
              cookingTime: Number,
              difficulty: String,
              servings: Number,
              steps: [String],        // Array of step instructions
              tips: [String],         // Array of cooking tips
              nutrition: {
                calories: Number,
                protein: Number,
                carbs: Number,
                fat: Number
              }
            }
          }
        },
        friday: {
            breakfast: { 
              mealType: { type: String, enum: ['breakfast'] },
              recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
              recipeDetails: {
                title: String,
                featuredImage: String,
                category: String,
                cookingTime: Number,
                difficulty: String,
                servings: Number,
                steps: [String],        // Array of step instructions
                tips: [String],         // Array of cooking tips
                nutrition: {
                  calories: Number,
                  protein: Number,
                  carbs: Number,
                  fat: Number
                }
              }
            },
            lunch: { 
              mealType: { type: String, enum: ['lunch'] },
              recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
              recipeDetails: {
                title: String,
                featuredImage: String,
                category: String,
                cookingTime: Number,
                difficulty: String,
                servings: Number,
                steps: [String],        // Array of step instructions
                tips: [String],         // Array of cooking tips
                nutrition: {
                  calories: Number,
                  protein: Number,
                  carbs: Number,
                  fat: Number
                }
              }
            },
            dinner: { 
              mealType: { type: String, enum: ['dinner'] },
              recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
              recipeDetails: {
                title: String,
                featuredImage: String,
                category: String,
                cookingTime: Number,
                difficulty: String,
                servings: Number,
                steps: [String],        // Array of step instructions
                tips: [String],         // Array of cooking tips
                nutrition: {
                  calories: Number,
                  protein: Number,
                  carbs: Number,
                  fat: Number
                }
              }
            }
          },
          saturday: {
              breakfast: { 
                mealType: { type: String, enum: ['breakfast'] },
                recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                  title: String,
                  featuredImage: String,
                  category: String,
                  cookingTime: Number,
                  difficulty: String,
                  servings: Number,
                  steps: [String],        // Array of step instructions
                  tips: [String],         // Array of cooking tips
                  nutrition: {
                    calories: Number,
                    protein: Number,
                    carbs: Number,
                    fat: Number
                  }
                }
              },
              lunch: { 
                mealType: { type: String, enum: ['lunch'] },
                recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                  title: String,
                  featuredImage: String,
                  category: String,
                  cookingTime: Number,
                  difficulty: String,
                  servings: Number,
                  steps: [String],        // Array of step instructions
                  tips: [String],         // Array of cooking tips
                  nutrition: {
                    calories: Number,
                    protein: Number,
                    carbs: Number,
                    fat: Number
                  }
                }
              },
              dinner: { 
                mealType: { type: String, enum: ['dinner'] },
                recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                  title: String,
                  featuredImage: String,
                  category: String,
                  cookingTime: Number,
                  difficulty: String,
                  servings: Number,
                  steps: [String],        // Array of step instructions
                  tips: [String],         // Array of cooking tips
                  nutrition: {
                    calories: Number,
                    protein: Number,
                    carbs: Number,
                    fat: Number
                  }
                }
              }
            },

            sunday: {
                breakfast: { 
                  mealType: { type: String, enum: ['breakfast'] },
                  recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                  recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String],        // Array of step instructions
                    tips: [String],         // Array of cooking tips
                    nutrition: {
                      calories: Number,
                      protein: Number,
                      carbs: Number,
                      fat: Number
                    }
                  }
                },
                lunch: { 
                  mealType: { type: String, enum: ['lunch'] },
                  recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                  recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String],        // Array of step instructions
                    tips: [String],         // Array of cooking tips
                    nutrition: {
                      calories: Number,
                      protein: Number,
                      carbs: Number,
                      fat: Number
                    }
                  }
                },
                dinner: { 
                  mealType: { type: String, enum: ['dinner'] },
                  recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },
                  recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String],        // Array of step instructions
                    tips: [String],         // Array of cooking tips
                    nutrition: {
                      calories: Number,
                      protein: Number,
                      carbs: Number,
                      fat: Number
                    }
                  }
                }
              },
             
  },
  notes: {
    type: String,
    trim: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Add helpful indexes
MealPlanSchema.index({ user: 1, week: 1 }, { unique: true });
MealPlanSchema.index({ user: 1, isActive: 1 });

const MealPlan = mongoose.models.MealPlan || mongoose.model('MealPlan', MealPlanSchema);
export default MealPlan;