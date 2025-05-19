"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMealPlanToCalendar = exports.updateGoogleCalendarEvents = exports.disconnectFromGoogleCalendar = exports.connectToGoogleCalendar = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const meal_planner_1 = __importDefault(require("../../../models/meal-planner"));
const mealplanner_1 = require("../mealplanner");
const recipe_1 = __importDefault(require("../../../models/recipe"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Connect meal plan to Google Calendar
 * This creates events in the user's Google Calendar for each meal in the plan
 */
const connectToGoogleCalendar = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { accessToken, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, // Better default
        mealTimes = {
            breakfast: { hour: 8, minute: 0 },
            lunch: { hour: 12, minute: 30 },
            dinner: { hour: 19, minute: 0 },
        } } = req.body;
        const userId = req.user._id;
        // Validate required parameters
        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Calendar access token is required'
            });
        }
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Find the meal plan
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        // Get all recipe IDs from the plan
        const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
        // Get detailed recipe information
        const recipes = await recipe_1.default.find({
            _id: { $in: recipeIds }
        });
        // Create a map for quick recipe lookup
        const recipeMap = recipes.reduce((acc, recipe) => {
            acc[recipe._id.toString()] = recipe;
            return acc;
        }, {});
        // Setup Google Calendar API
        const oAuth2Client = new google_auth_library_1.OAuth2Client();
        oAuth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oAuth2Client });
        // Days of the week
        const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        // Get the start date of the meal plan week
        const weekStart = new Date(mealPlan.week);
        // Track created events
        const createdEvents = [];
        const failedEvents = [];
        // Create calendar events for each meal
        for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
            const dayName = daysOfWeek[dayIndex];
            const dayPlan = mealPlan.plan[dayName];
            if (!dayPlan)
                continue;
            // Set the date for this day
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + dayIndex);
            const mealTypes = ['breakfast', 'lunch', 'dinner'];
            for (const mealType of mealTypes) {
                const meal = dayPlan[mealType];
                if (!meal || !meal.recipe)
                    continue;
                // Get recipe details
                const recipeId = typeof meal.recipe === 'object' ? meal.recipe.toString() : meal.recipe;
                const recipe = recipeMap[recipeId];
                if (!recipe)
                    continue;
                // Get time for this meal type from user preferences or defaults
                const { hour, minute } = mealTimes[mealType] ||
                    { hour: 12, minute: 0 }; // Fallback if missing
                // Set start and end time for the event
                const startDateTime = new Date(date);
                startDateTime.setHours(hour, minute, 0);
                const endDateTime = new Date(startDateTime);
                endDateTime.setMinutes(startDateTime.getMinutes() + 30); // Default 30 min events
                // Create event description with recipe details
                const description = `
        🍽️ RECIPE: ${recipe.title.toUpperCase()} 🍽️
        
        📋 DETAILS:
        • Category: ${recipe.category || 'Not specified'}
        • Cooking Time: ${recipe.cookingTime || 'Not specified'} minutes
        • Prep Time: ${recipe.prepTime || 'Not specified'} minutes
        • Total Time: ${recipe.totalTime || (recipe.prepTime && recipe.cookingTime ? recipe.prepTime + recipe.cookingTime : 'Not specified')} minutes
        • Servings: ${recipe.servings || 'Not specified'}
        • Calories: ${((_a = recipe.nutrition) === null || _a === void 0 ? void 0 : _a.calories) || 'Not specified'} kcal
        • Difficulty: ${recipe.difficulty || 'Not specified'}
        
        ${recipe.description ? `📝 DESCRIPTION:\n${recipe.description}\n` : ''}
        
        🛒 INGREDIENTS:
        ${recipe.ingredients ? recipe.ingredients.map((ingredient) => {
                    // Handle ingredient objects or strings
                    const ingredientStr = typeof ingredient === 'string'
                        ? ingredient
                        : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
                    return `• ${ingredientStr}`;
                }).join('\n') : '• No ingredients listed'}
        
        👨‍🍳 INSTRUCTIONS:
        ${recipe.steps ? recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n') : '• No instructions listed'}
        
        ${recipe.notes ? `📌 NOTES:\n${recipe.notes}` : ''}
        
        ${recipe.nutrition ? `
        🍎 NUTRITION INFORMATION:
        • Calories: ${recipe.nutrition.calories || 'N/A'}
        • Protein: ${recipe.nutrition.protein || 'N/A'}
        • Carbs: ${recipe.nutrition.carbs || 'N/A'}
        • Fat: ${recipe.nutrition.fat || 'N/A'}
        • Fiber: ${recipe.nutrition.fiber || 'N/A'}`
                    : ''}
        
        🔄 This meal plan was created and synced using Recipe Chef App
        `.trim();
                // Create the calendar event
                try {
                    const event = {
                        summary: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${recipe.title}`,
                        location: '',
                        description,
                        start: {
                            dateTime: startDateTime.toISOString(),
                            timeZone: timeZone,
                        },
                        end: {
                            dateTime: endDateTime.toISOString(),
                            timeZone: timeZone,
                        },
                        colorId: mealType === 'breakfast' ? '1' : mealType === 'lunch' ? '2' : mealType === 'dinner' ? '3' : '4',
                        reminders: {
                            useDefault: false,
                            overrides: [
                                { method: 'popup', minutes: 60 },
                            ],
                        },
                    };
                    const response = await calendar.events.insert({
                        calendarId: 'primary',
                        requestBody: event,
                    });
                    createdEvents.push({
                        day: dayName,
                        mealType,
                        recipeTitle: recipe.title,
                        eventId: response.data.id,
                        eventLink: response.data.htmlLink
                    });
                }
                catch (eventError) {
                    console.error(`Error creating calendar event for ${dayName} ${mealType}:`, eventError);
                    failedEvents.push({
                        day: dayName,
                        mealType,
                        recipeTitle: recipe.title,
                        error: eventError.message || 'Unknown error'
                    });
                }
            }
        }
        // Update meal plan with calendar connection status
        mealPlan.connectedToCalendar = true;
        mealPlan.calendarConnectionDate = new Date();
        mealPlan.calendarEvents = createdEvents.map(event => {
            var _a;
            return ({
                eventId: event.eventId,
                day: event.day,
                mealType: event.mealType,
                recipeId: (_a = recipes.find(r => r.title === event.recipeTitle)) === null || _a === void 0 ? void 0 : _a._id
            });
        });
        await mealPlan.save();
        return res.status(200).json({
            success: true,
            message: 'Meal plan connected to Google Calendar',
            data: {
                mealPlanId: mealPlan._id,
                totalEvents: createdEvents.length,
                createdEvents,
                failedEvents: failedEvents.length > 0 ? failedEvents : undefined,
                connectedToCalendar: true,
                calendarConnectionDate: mealPlan.calendarConnectionDate
            }
        });
    }
    catch (error) {
        console.error('Error connecting meal plan to Google Calendar:', error);
        // Handle Google API specific errors
        if (error.code === 401 || error.code === 403) {
            return res.status(401).json({
                success: false,
                message: 'Google Calendar authentication failed. Please reauthorize the app.',
                error: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to connect meal plan to Google Calendar',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.connectToGoogleCalendar = connectToGoogleCalendar;
/**
 * Disconnect meal plan from Google Calendar
 * This removes the calendar events created for this meal plan
 */
const disconnectFromGoogleCalendar = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessToken } = req.body;
        const userId = req.user._id;
        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Calendar access token is required'
            });
        }
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Find the meal plan
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        // If not connected to calendar, return early
        if (!mealPlan.connectedToCalendar || !mealPlan.calendarEvents || mealPlan.calendarEvents.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'This meal plan is not connected to Google Calendar'
            });
        }
        // Setup Google Calendar API
        const oAuth2Client = new google_auth_library_1.OAuth2Client();
        oAuth2Client.setCredentials({ access_token: accessToken });
        const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oAuth2Client });
        // Track deleted events
        const deletedEvents = [];
        const failedDeletions = [];
        // Delete each calendar event
        for (const calendarEvent of mealPlan.calendarEvents) {
            if (!calendarEvent.eventId)
                continue;
            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: calendarEvent.eventId
                });
                deletedEvents.push({
                    eventId: calendarEvent.eventId,
                    day: calendarEvent.day,
                    mealType: calendarEvent.mealType
                });
            }
            catch (deleteError) {
                console.error(`Error deleting calendar event ${calendarEvent.eventId}:`, deleteError);
                failedDeletions.push({
                    eventId: calendarEvent.eventId,
                    day: calendarEvent.day,
                    mealType: calendarEvent.mealType,
                    error: deleteError.message || 'Unknown error'
                });
            }
        }
        // Update meal plan
        mealPlan.connectedToCalendar = false;
        mealPlan.calendarEvents = [];
        await mealPlan.save();
        return res.status(200).json({
            success: true,
            message: 'Meal plan disconnected from Google Calendar',
            data: {
                mealPlanId: mealPlan._id,
                deletedEvents: deletedEvents.length,
                failedDeletions: failedDeletions.length > 0 ? failedDeletions : undefined
            }
        });
    }
    catch (error) {
        console.error('Error disconnecting meal plan from Google Calendar:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to disconnect meal plan from Google Calendar',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.disconnectFromGoogleCalendar = disconnectFromGoogleCalendar;
const updateGoogleCalendarEvents = async (mealPlan, accessToken) => {
    var _a;
    // Setup Google Calendar API
    const oAuth2Client = new google_auth_library_1.OAuth2Client();
    oAuth2Client.setCredentials({ access_token: accessToken });
    const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oAuth2Client });
    // Track results
    const deletedEvents = [];
    const failedDeletions = [];
    const createdEvents = [];
    const failedCreations = [];
    // 1. Delete existing calendar events
    if (mealPlan.calendarEvents && mealPlan.calendarEvents.length > 0) {
        for (const event of mealPlan.calendarEvents) {
            if (!event.eventId)
                continue;
            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: event.eventId
                });
                deletedEvents.push({
                    eventId: event.eventId,
                    day: event.day,
                    mealType: event.mealType
                });
            }
            catch (error) {
                console.error(`Error deleting calendar event ${event.eventId}:`, error);
                failedDeletions.push({
                    eventId: event.eventId,
                    day: event.day,
                    mealType: event.mealType,
                    error: error.message || 'Unknown error'
                });
            }
        }
    }
    // 2. Get recipe details for the updated meal plan
    const recipeIds = (0, mealplanner_1.extractRecipeIds)(mealPlan.plan);
    if (recipeIds.length === 0) {
        // No recipes in the updated plan, just return deletion results
        mealPlan.calendarEvents = [];
        mealPlan.connectedToCalendar = false;
        await mealPlan.save();
        return {
            deletedEvents,
            failedDeletions,
            message: 'Calendar disconnected: no recipes in updated meal plan'
        };
    }
    const recipes = await recipe_1.default.find({ _id: { $in: recipeIds } });
    // Create a map for quick recipe lookup
    const recipeMap = recipes.reduce((acc, recipe) => {
        acc[recipe._id.toString()] = recipe;
        return acc;
    }, {});
    // 3. Create new calendar events
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    // Default meal times
    const mealTimes = {
        breakfast: { hour: 8, minute: 0 },
        lunch: { hour: 12, minute: 30 },
        dinner: { hour: 19, minute: 0 },
        snack: { hour: 16, minute: 0 }
    };
    // Get the start date of the meal plan week
    const weekStart = new Date(mealPlan.week);
    // Create new events
    for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
        const dayName = daysOfWeek[dayIndex];
        const dayPlan = mealPlan.plan[dayName];
        if (!dayPlan)
            continue;
        // Set the date for this day
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        for (const mealType of mealTypes) {
            const meal = dayPlan[mealType];
            if (!meal || !meal.recipe)
                continue;
            // Get recipe details
            const recipeId = typeof meal.recipe === 'object' ? meal.recipe.toString() : meal.recipe;
            const recipe = recipeMap[recipeId];
            if (!recipe)
                continue;
            // Get time for this meal type
            const { hour, minute } = mealTimes[mealType] || { hour: 12, minute: 0 };
            // Set start and end time for the event
            const startDateTime = new Date(date);
            startDateTime.setHours(hour, minute, 0);
            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(startDateTime.getMinutes() + 30);
            // Create event description with recipe details
            const description = `
🍽️ RECIPE: ${recipe.title.toUpperCase()} 🍽️

📋 DETAILS:
• Category: ${recipe.category || 'Not specified'}
• Cooking Time: ${recipe.cookingTime || 'Not specified'} minutes
• Prep Time: ${recipe.prepTime || 'Not specified'} minutes
• Total Time: ${recipe.totalTime || (recipe.prepTime && recipe.cookingTime ? recipe.prepTime + recipe.cookingTime : 'Not specified')} minutes
• Servings: ${recipe.servings || 'Not specified'}
• Calories: ${((_a = recipe.nutrition) === null || _a === void 0 ? void 0 : _a.calories) || 'Not specified'} kcal
• Difficulty: ${recipe.difficulty || 'Not specified'}

${recipe.description ? `📝 DESCRIPTION:\n${recipe.description}\n` : ''}

🛒 INGREDIENTS:
${recipe.ingredients ? recipe.ingredients.map((ingredient) => {
                // Handle ingredient objects or strings
                const ingredientStr = typeof ingredient === 'string'
                    ? ingredient
                    : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim();
                return `• ${ingredientStr}`;
            }).join('\n') : '• No ingredients listed'}

👨‍🍳 INSTRUCTIONS:
${recipe.steps ? recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n') : '• No instructions listed'}

${recipe.notes ? `📌 NOTES:\n${recipe.notes}` : ''}

🔄 This meal plan was created and synced using Recipe Chef App
`.trim();
            // Create the calendar event
            try {
                const event = {
                    summary: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}: ${recipe.title}`,
                    location: '',
                    description,
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: 'UTC', // Ideally use user's timezone
                    },
                    end: {
                        dateTime: endDateTime.toISOString(),
                        timeZone: 'UTC', // Ideally use user's timezone
                    },
                    colorId: mealType === 'breakfast' ? '1' : mealType === 'lunch' ? '2' : mealType === 'dinner' ? '3' : '4',
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: 60 },
                        ],
                    },
                };
                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: event,
                });
                createdEvents.push({
                    eventId: response.data.id,
                    day: dayName,
                    mealType,
                    recipeId,
                    eventLink: response.data.htmlLink
                });
            }
            catch (error) {
                console.error(`Error creating calendar event for ${dayName} ${mealType}:`, error);
                failedCreations.push({
                    day: dayName,
                    mealType,
                    recipeId,
                    error: error.message || 'Unknown error'
                });
            }
        }
    }
    // 4. Update meal plan with new calendar events
    mealPlan.calendarEvents = createdEvents.map(event => ({
        eventId: event.eventId,
        day: event.day,
        mealType: event.mealType,
        recipeId: event.recipeId
    }));
    mealPlan.connectedToCalendar = createdEvents.length > 0;
    mealPlan.calendarConnectionDate = new Date();
    await mealPlan.save();
    // Return results
    return {
        deletedEvents,
        failedDeletions,
        createdEvents,
        failedCreations
    };
};
exports.updateGoogleCalendarEvents = updateGoogleCalendarEvents;
/**
 * Sync meal plan to Google Calendar (endpoint for the sync button)
 */
const syncMealPlanToCalendar = async (req, res) => {
    try {
        const { id } = req.params; // Meal plan ID
        const { accessToken } = req.body;
        const userId = req.user._id;
        // Validate required parameters
        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Google Calendar access token is required'
            });
        }
        // Validate ObjectId
        if (!mongoose_1.default.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meal plan ID'
            });
        }
        // Find the meal plan
        const mealPlan = await meal_planner_1.default.findOne({ _id: id, user: userId });
        if (!mealPlan) {
            return res.status(404).json({
                success: false,
                message: 'Meal plan not found'
            });
        }
        // Update Google Calendar events
        const calendarResult = await (0, exports.updateGoogleCalendarEvents)(mealPlan, accessToken);
        return res.status(200).json({
            success: true,
            message: 'Meal plan successfully synced with Google Calendar',
            data: {
                mealPlanId: mealPlan._id,
                mealPlanName: mealPlan.name,
                calendarUpdate: calendarResult
            }
        });
    }
    catch (error) {
        console.error('Error syncing meal plan to Google Calendar:', error);
        // Handle Google API specific errors
        if (error.code === 401 || error.code === 403) {
            return res.status(401).json({
                success: false,
                message: 'Google Calendar authentication failed. Please reauthorize the app.',
                error: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to sync meal plan to Google Calendar',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.syncMealPlanToCalendar = syncMealPlanToCalendar;
