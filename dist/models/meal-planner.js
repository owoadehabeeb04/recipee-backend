"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CalendarEventSchema = new mongoose_1.default.Schema({
    eventId: String,
    day: String,
    mealType: String,
    recipeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Recipe'
    }
}, { _id: false });
// Create the schema with a well-defined structure
const MealPlanSchema = new mongoose_1.Schema({
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
                recipe: { type: mongoose_1.Schema.Types.ObjectId, ref: 'recipes' },
                recipeDetails: {
                    title: String,
                    featuredImage: String,
                    category: String,
                    cookingTime: Number,
                    difficulty: String,
                    servings: Number,
                    steps: [String], // Array of step instructions
                    tips: [String], // Array of cooking tips
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDuplicate: {
        type: Boolean,
        default: false
    },
    checkedItems: {
        type: [String],
        default: []
    },
    lastShoppingListUpdate: {
        type: Date
    },
    connectedToCalendar: {
        type: Boolean,
        default: false
    },
    calendarConnectionDate: Date,
    calendarEvents: [CalendarEventSchema]
}, { timestamps: true });
// Add helpful indexes
MealPlanSchema.index({ user: 1, week: 1 }, { unique: true });
MealPlanSchema.index({ user: 1, isActive: 1 });
const MealPlan = mongoose_1.default.models.MealPlan || mongoose_1.default.model('MealPlan', MealPlanSchema);
exports.default = MealPlan;
