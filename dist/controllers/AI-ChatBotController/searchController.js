"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchChats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const aiChatMessage_1 = require("../../models/aiChatMessage");
const searchChats = async (req, res) => {
    try {
        const userId = req.user._id;
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }
        const matchingChats = await aiChatMessage_1.Chat.find({
            user: userId,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                // We'll also search within the lastMessage field
                { lastMessage: { $regex: query, $options: 'i' } }
            ]
        }).sort({ updatedAt: -1 });
        const matchingMessages = await aiChatMessage_1.Message.aggregate([
            {
                $match: {
                    content: { $regex: query, $options: 'i' }
                }
            },
            {
                $lookup: {
                    from: 'chats',
                    localField: 'chat',
                    foreignField: '_id',
                    as: 'chatInfo'
                }
            },
            {
                $unwind: '$chatInfo'
            },
            {
                $match: {
                    'chatInfo.user': mongoose_1.default.Types.ObjectId.createFromHexString(userId.toString())
                }
            },
            {
                $group: {
                    _id: '$chat',
                    matches: { $push: { content: '$content', role: '$role', createdAt: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'chats',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'chatDetails'
                }
            },
            {
                $unwind: '$chatDetails'
            },
            {
                $project: {
                    _id: 1,
                    chatTitle: '$chatDetails.title',
                    matches: { $slice: ['$matches', 3] },
                    matchCount: '$count'
                }
            }
        ]);
        return res.status(200).json({
            success: true,
            message: "Search results retrieved successfully",
            data: {
                chats: matchingChats,
                messageMatches: matchingMessages
            }
        });
    }
    catch (error) {
        console.error("Error searching chats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to search chats",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.searchChats = searchChats;
