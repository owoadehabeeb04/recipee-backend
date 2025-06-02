import mongoose from 'mongoose';
import { Chat, Message } from '../../models/aiChatMessage';


export const searchChats = async (req: any, res: any) => {
  try {
    const userId = req.user._id;
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    const matchingChats = await Chat.find({
      user: userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        // We'll also search within the lastMessage field
        { lastMessage: { $regex: query, $options: 'i' } }
      ]
    }).sort({ updatedAt: -1 });
    
    const matchingMessages = await Message.aggregate([
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
          'chatInfo.user': mongoose.Types.ObjectId.createFromHexString(userId.toString())
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
      data: matchingChats
    });
  } catch (error) {
    console.error("Error searching chats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search chats",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};