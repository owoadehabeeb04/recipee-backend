"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePublishStatus = exports.getAdminRecipes = exports.editRecipe = exports.deleteRecipe = void 0;
const recipe_1 = __importDefault(require("../../models/recipe"));
const mongoose_1 = __importDefault(require("mongoose"));
// Delete A RECIPE
const deleteRecipe = async (req, res) => {
    var _a, _b;
    const { id } = req.params;
    try {
        const recipe = await recipe_1.default.findById(id);
        if (!recipe) {
            return res.status(400).json({ message: 'Recipe not found!' });
        }
        const adminRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const adminId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        if (recipe.adminId.toString() !== adminId) {
            return res
                .status(401)
                .json({ message: 'You are not authorized to delete this recipe' });
        }
        await recipe_1.default.findByIdAndDelete(id);
        return res
            .status(200)
            .json({ success: true, message: 'Recipe deleted successfully!' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete recipe',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.deleteRecipe = deleteRecipe;
// edit  a recipe
const editRecipe = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { id } = req.params;
        // Check if ID is valid MongoDB ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipe ID format',
            });
        }
        // Check if recipe exists
        const recipe = await recipe_1.default.findById(id);
        console.log('RECIPE', recipe);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        if (recipe.adminId.toString() !== ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id.toString())) {
            return res.status(401).json({
                success: false,
                message: 'You are not authorized to edit this recipe',
            });
        }
        const updateData = {};
        const allowedFields = [
            'title',
            'description',
            'category',
            'cookingTime',
            'difficulty',
            'servings',
            'ingredients',
            'steps',
            'tips',
            'featuredImage',
            'isPublished',
            'nutrition',
            'isPrivate',
        ];
        // Handle regular fields
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });
        // Special handling for nutrition field
        if (req.body.nutrition) {
            console.log('Updating nutrition field:', req.body.nutrition);
            console.log(updateData);
            // Process nutrition data with proper type conversion
            updateData.nutrition = {
                calories: Number(((_b = req.body.nutrition) === null || _b === void 0 ? void 0 : _b.calories) || 0),
                protein: Number(((_c = req.body.nutrition) === null || _c === void 0 ? void 0 : _c.protein) || 0),
                carbs: Number(((_d = req.body.nutrition) === null || _d === void 0 ? void 0 : _d.carbs) || 0),
                fat: Number(((_e = req.body.nutrition) === null || _e === void 0 ? void 0 : _e.fat) || 0),
                fiber: Number(((_f = req.body.nutrition) === null || _f === void 0 ? void 0 : _f.fiber) || 0),
                sugar: Number(((_g = req.body.nutrition) === null || _g === void 0 ? void 0 : _g.sugar) || 0),
            };
        }
        console.log('Update data:', updateData);
        const updatedRecipe = await recipe_1.default.findByIdAndUpdate(id, updateData, {
            new: true, // Return updated document
            runValidators: true, // Run schema validation
            lean: true, // Return plain JS object instead of Mongoose document
        });
        console.log('Updated recipe nutrition:', updatedRecipe === null || updatedRecipe === void 0 ? void 0 : updatedRecipe.nutrition);
        return res.status(200).json({
            success: true,
            message: 'Recipe updated successfully',
            data: updatedRecipe,
        });
    }
    catch (error) {
        console.error('Error updating recipe:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update recipe',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.editRecipe = editRecipe;
// GET ADMIN RECIPES
const getAdminRecipes = async (req, res) => {
    var _a;
    console.log('here gotten');
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const category = req.query.category;
        const sort = req.query.sort;
        const search = req.query.search;
        console.log('REACH HERRRERR');
        const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        console.log('THE ADMIN ID I AM LOOKING FOR let us see id', adminId);
        const query = {};
        if (adminId) {
            const validObjectId = mongoose_1.default.Types.ObjectId.isValid(adminId)
                ? new mongoose_1.default.Types.ObjectId(adminId)
                : adminId;
            query.adminId = adminId;
        }
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        const total = await recipe_1.default.countDocuments(query);
        let sortOptions = {};
        switch (sort) {
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'title':
                sortOptions = { title: 1 };
                break;
            case 'rating':
                sortOptions = { averageRating: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 }; // newest by default
        }
        const recipes = await recipe_1.default.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
        return res.status(200).json({
            success: true,
            message: 'Admin recipes retrieved successfully',
            data: recipes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error getting admin recipes:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin recipes',
            error: error instanceof Error ? error.message : 'Server error',
        });
    }
};
exports.getAdminRecipes = getAdminRecipes;
const togglePublishStatus = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('id from endpoint', id);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recipe ID format',
            });
        }
        const recipeToToggle = await recipe_1.default.findById(id);
        console.log(recipeToToggle);
        if (!recipeToToggle) {
            return res.status(404).json({
                success: false,
                message: 'Recipe not found',
            });
        }
        if (recipeToToggle.roleCreated === 'user' &&
            recipeToToggle.isPrivate === true) {
            return res.status(403).json({
                success: false,
                message: 'Cannot publish private user recipes',
            });
        }
        const newPublishStatus = !recipeToToggle.isPublished;
        const updatedRecipe = await recipe_1.default.findByIdAndUpdate(id, { isPublished: newPublishStatus }, { new: true });
        return res.status(200).json({
            success: true,
            message: `Recipe is now ${newPublishStatus ? 'published' : 'in draft mode'}`,
            data: {
                recipeId: id,
                isPublished: newPublishStatus,
            },
        });
    }
    catch (error) {
        console.error('Error getting admin recipes:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to Publish recipe',
            error: error instanceof Error ? error.message : 'Server error',
        });
    }
};
exports.togglePublishStatus = togglePublishStatus;
// get recent created recipes
// //
//     return res.status(200).json({
//       success: true,
//       data: {
//         totalRecipes,
//         publishedRecipes,
//         unpublishedRecipes,
//         categories: categoryCounts,
//         difficulties: difficultyCounts,
//         avgCookingTime,
//         topRecipes,
//         recentRecipes
//       }
//     });
