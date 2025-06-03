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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TFImageAnalyzer = void 0;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const canvas_1 = require("canvas");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class TFImageAnalyzer {
    static async initialize() {
        // Load MobileNet model
        this.model = await tf.loadGraphModel('https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/5/default/1', { fromTFHub: true });
        // Load labels
        const labelsPath = path_1.default.join(__dirname, '../assets/imagenet_labels.json');
        this.labels = JSON.parse(fs_1.default.readFileSync(labelsPath, 'utf-8'));
    }
    static async analyzeImage(imagePath) {
        if (!this.model)
            await this.initialize();
        // Load and prepare image
        const image = await (0, canvas_1.loadImage)(imagePath);
        const canvas = (0, canvas_1.createCanvas)(224, 224);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, 224, 224);
        // Get image data
        const imageData = ctx.getImageData(0, 0, 224, 224);
        // Prepare tensor
        const tensor = tf.tensor3d(Uint8Array.from(imageData.data), [224, 224, 4]).slice([0, 0, 0], [224, 224, 3])
            .toFloat()
            .div(tf.scalar(127.5))
            .sub(tf.scalar(1))
            .expandDims();
        // Run prediction
        const predictions = await this.model.predict(tensor);
        const data = await predictions.data();
        // Get top 5 predictions
        const topIndices = Array.from(data)
            .map((p, i) => ({ probability: p, index: i }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5)
            .map(p => p.index);
        const topLabels = topIndices.map(idx => this.labels[idx]);
        // Determine if it's a food image
        const foodKeywords = ['food', 'dish', 'cuisine', 'meal', 'pasta', 'pizza', 'salad', 'bread', 'meat', 'fruit'];
        const isFoodImage = topLabels.some(label => foodKeywords.some(keyword => label.toLowerCase().includes(keyword)));
        return {
            tags: topLabels,
            description: topLabels[0],
            confidence: data[topIndices[0]],
            foodRecognition: {
                isDish: isFoodImage,
                dishName: isFoodImage ? this.guessDishName(topLabels) : 'Unknown',
                ingredients: isFoodImage ? this.guessIngredients(topLabels) : [],
                nutritionalInfo: {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                }
            }
        };
    }
    static guessDishName(labels) {
        return labels[0].replace(/_/g, ' ');
    }
    static guessIngredients(labels) {
        const ingredients = new Set();
        const commonIngredients = {
            // Italian dishes
            'pasta': ['flour', 'eggs', 'water', 'salt'],
            'spaghetti': ['durum wheat', 'water', 'salt'],
            'lasagna': ['pasta sheets', 'ground beef', 'tomato sauce', 'cheese', 'onion', 'garlic'],
            'pizza': ['flour', 'yeast', 'tomato sauce', 'cheese', 'olive oil'],
            'risotto': ['arborio rice', 'broth', 'butter', 'onion', 'white wine', 'parmesan cheese'],
            'carbonara': ['pasta', 'eggs', 'pecorino cheese', 'pancetta', 'black pepper'],
            // Mexican dishes
            'taco': ['tortilla', 'meat', 'lettuce', 'cheese', 'tomato', 'onion', 'cilantro'],
            'burrito': ['flour tortilla', 'rice', 'beans', 'meat', 'cheese', 'salsa'],
            'quesadilla': ['tortilla', 'cheese', 'chicken', 'vegetables'],
            'enchilada': ['corn tortilla', 'meat', 'chili sauce', 'cheese'],
            'guacamole': ['avocado', 'lime', 'onion', 'cilantro', 'tomato'],
            // Asian dishes
            'sushi': ['rice', 'fish', 'seaweed', 'vinegar', 'wasabi', 'soy sauce'],
            'ramen': ['noodles', 'broth', 'meat', 'egg', 'green onions', 'seaweed'],
            'stir_fry': ['vegetables', 'meat', 'soy sauce', 'garlic', 'ginger', 'oil'],
            'pad_thai': ['rice noodles', 'eggs', 'tofu', 'bean sprouts', 'peanuts', 'lime'],
            'curry': ['meat', 'vegetables', 'coconut milk', 'curry paste', 'rice'],
            'fried_rice': ['rice', 'eggs', 'vegetables', 'soy sauce', 'sesame oil'],
            // Breakfast items
            'pancake': ['flour', 'eggs', 'milk', 'baking powder', 'sugar', 'butter'],
            'waffle': ['flour', 'eggs', 'milk', 'baking powder', 'sugar', 'butter'],
            'omelet': ['eggs', 'milk', 'cheese', 'vegetables', 'butter'],
            'french_toast': ['bread', 'eggs', 'milk', 'cinnamon', 'vanilla', 'butter'],
            'cereal': ['grains', 'milk', 'sugar'],
            'smoothie': ['fruits', 'yogurt', 'milk', 'honey'],
            // Sandwiches and burgers
            'sandwich': ['bread', 'meat', 'cheese', 'lettuce', 'tomato', 'mayonnaise'],
            'hamburger': ['beef patty', 'bun', 'lettuce', 'tomato', 'onion', 'ketchup', 'mustard'],
            'hot_dog': ['sausage', 'bun', 'ketchup', 'mustard', 'onion'],
            'grilled_cheese': ['bread', 'cheese', 'butter'],
            'club_sandwich': ['bread', 'chicken', 'bacon', 'lettuce', 'tomato', 'mayonnaise'],
            // Salads
            'salad': ['lettuce', 'tomato', 'cucumber', 'dressing'],
            'caesar_salad': ['romaine lettuce', 'croutons', 'parmesan', 'caesar dressing'],
            'greek_salad': ['cucumber', 'tomato', 'bell pepper', 'onion', 'olives', 'feta cheese'],
            'potato_salad': ['potato', 'mayonnaise', 'egg', 'celery', 'onion'],
            'coleslaw': ['cabbage', 'carrot', 'mayonnaise', 'vinegar', 'sugar'],
            // Desserts
            'cake': ['flour', 'sugar', 'eggs', 'butter', 'baking powder', 'milk'],
            'cookie': ['flour', 'sugar', 'butter', 'eggs', 'chocolate chips'],
            'ice_cream': ['milk', 'cream', 'sugar', 'egg yolks', 'vanilla'],
            'brownie': ['chocolate', 'flour', 'sugar', 'eggs', 'butter'],
            'pie': ['flour', 'butter', 'sugar', 'fruit filling'],
            'cheesecake': ['cream cheese', 'sugar', 'eggs', 'graham cracker crust'],
            // Meat dishes
            'steak': ['beef', 'salt', 'pepper', 'butter', 'herbs'],
            'roast_chicken': ['chicken', 'herbs', 'butter', 'garlic', 'lemon'],
            'meatloaf': ['ground beef', 'onion', 'breadcrumbs', 'egg', 'ketchup'],
            'beef_stew': ['beef', 'vegetables', 'broth', 'herbs', 'flour'],
            'chicken_curry': ['chicken', 'curry powder', 'coconut milk', 'onion', 'garlic', 'ginger'],
            // Fish dishes
            'grilled_fish': ['fish fillet', 'lemon', 'herbs', 'olive oil', 'garlic'],
            'fish_and_chips': ['cod', 'flour', 'beer', 'potato', 'salt'],
            'sushi_roll': ['rice', 'fish', 'seaweed', 'vinegar', 'wasabi'],
            'shrimp_scampi': ['shrimp', 'garlic', 'butter', 'white wine', 'lemon', 'parsley'],
            'salmon': ['salmon fillet', 'lemon', 'dill', 'butter', 'salt'],
            // Vegetarian/Vegan dishes
            'veggie_burger': ['beans', 'mushrooms', 'breadcrumbs', 'onion', 'spices'],
            'tofu_stir_fry': ['tofu', 'vegetables', 'soy sauce', 'garlic', 'ginger'],
            'falafel': ['chickpeas', 'herbs', 'spices', 'garlic', 'onion'],
            'vegetable_curry': ['vegetables', 'curry paste', 'coconut milk', 'spices'],
            'hummus': ['chickpeas', 'tahini', 'lemon juice', 'garlic', 'olive oil'],
            // Soups
            'chicken_soup': ['chicken', 'vegetables', 'noodles', 'broth', 'herbs'],
            'tomato_soup': ['tomatoes', 'onion', 'broth', 'cream', 'basil'],
            'minestrone': ['vegetables', 'beans', 'pasta', 'tomatoes', 'broth'],
            'clam_chowder': ['clams', 'potato', 'onion', 'celery', 'cream'],
            'french_onion_soup': ['onions', 'beef broth', 'bread', 'cheese', 'butter'],
            // Side dishes
            'french_fries': ['potato', 'oil', 'salt'],
            'mashed_potato': ['potato', 'butter', 'milk', 'salt'],
            'rice_pilaf': ['rice', 'broth', 'onion', 'herbs', 'butter'],
            'roasted_vegetables': ['vegetables', 'olive oil', 'herbs', 'garlic', 'salt'],
            'garlic_bread': ['bread', 'butter', 'garlic', 'herbs', 'cheese'],
            // Snacks
            'nachos': ['tortilla chips', 'cheese', 'salsa', 'sour cream', 'guacamole'],
            'popcorn': ['corn kernels', 'butter', 'salt'],
            'chicken_wings': ['chicken wings', 'hot sauce', 'butter', 'spices'],
            'potato_chips': ['potato', 'oil', 'salt'],
            'pretzels': ['flour', 'yeast', 'salt', 'baking soda']
        };
        labels.forEach(label => {
            for (const [dish, ings] of Object.entries(commonIngredients)) {
                if (label.toLowerCase().includes(dish)) {
                    ings.forEach(ing => ingredients.add(ing));
                }
            }
        });
        return Array.from(ingredients);
    }
}
exports.TFImageAnalyzer = TFImageAnalyzer;
TFImageAnalyzer.model = null;
TFImageAnalyzer.labels = [];
