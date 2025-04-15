// edit/add user details
import { Express } from 'express';
import { Request, Response } from 'express';

import UserModel from '../models/user';
import { SortOrder } from 'mongoose';
import RecipeModel from '../models/recipe';

export const updateProfileDetails = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existingUser = UserModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const updateData: { [key: string]: any } = {};
    const allowedFields = [
      'username',
      'bio',
      'location',
      'website',
      'profileImage',
      'phoneNumber',
      'socialMediaLink',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    console.log(updateData, 'updateData');
    console.log('ID', id);
    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -otp');
    console.log('updated user', updatedUser);
    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// get all users
function escapeRegExp(string: string): string {
  if (!string) return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getAllUsers = async (req: any, res: any) => {
  console.log('⭐ getAllUsers endpoint called');
  console.log('Query parameters:', req.query);
  console.log('User from token:', req.user?._id, req.user?.role);

  try {
    // pagination to prevent bulky results
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // query to filter by role , search by username, email
    let query: any = {};
    const search = req.query.search as string;
    const role = req.query.role as 'admin' | 'Admin' | 'user' | 'User';
    console.log('role', role);
    const hasValidAuth = !!req.user;
    const userRole = req.user?.role;
    console.log('USER ROLE', userRole);

    // making sure only super admin can access this
    if (userRole === 'super_admin') {
      console.log('✅ User is super_admin, proceeding with query');

      let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };

      // querying the search for username and email only WITH SAFE REGEX
      if (search) {
        const safeSearch = escapeRegExp(search);
        console.log(`Search term: "${search}" -> Escaped: "${safeSearch}"`);

        query.$or = [
          { username: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      // querying the role
      if (role) {
        const roleAvailable = role.toLowerCase();
        if (roleAvailable === 'admin' || roleAvailable === 'user') {
          query.role = roleAvailable;
        }
      }

      if (req.query.sort === 'username') {
        sortOptions = { username: 1 };
      } else if (req.query.sort === 'email') {
        sortOptions = { email: 1 };
      }

      // Log the query before execution
      console.log('MongoDB query:', JSON.stringify(query));

      // getting the total number of users in the database
      const totalUsers = await UserModel.countDocuments(query);
      console.log(`Found ${totalUsers} total matching users`);

      const users = await UserModel.find(query)
        .select('-password -otp')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);
      console.log('USERS', users);

      console.log(`Returning ${users.length} users for page ${page}`);

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit),
        },
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.',
      });
    }
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// get user details

export const getSingleUser = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userToFind = await UserModel.findById(id);
    if (!userToFind) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userResponse = userToFind.toObject() as any & {
      recentRecipes?: any[];
    };

    const recipeStats = {
      totalCreated: 0,
      publishedRecipes: 0,
      unpublishedRecipes: 0,
      savedRecipes: 0,
    };
    let createdRecipes = [];

    createdRecipes = await RecipeModel.find({ adminId: id.toString() });
    console.log('created recipes', createdRecipes);
    recipeStats.totalCreated = createdRecipes.length;

    if (userToFind.role === 'admin') {
      recipeStats.publishedRecipes = createdRecipes.filter(
        (recipe) => recipe.isPublished
      ).length;
      recipeStats.unpublishedRecipes = createdRecipes.filter(
        (recipe) => !recipe.isPublished
      ).length;

      const recentAdminRecipes = await RecipeModel.find({
        adminId: id.toString(),
      })
        .sort({ createdAt: -1 })
        .limit(5);
      console.log(recentAdminRecipes, 'RECENT ADMIN RECIPE');
      userResponse.recentRecipes = recentAdminRecipes;
    } else if (userToFind.role === 'user') {
    } else {
    }

    console.log('recipe stats', recipeStats);
    userResponse.recipeStats = recipeStats;
    console.log(userResponse, 'user response');

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: userResponse,
    });
  } catch (error) {
    console.error('❌ Error in getSingleUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteUser = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const userToDelete = await UserModel.findById(id);

    if (!userToDelete) {
      return res.status(400).json({ message: 'User not found!' });
    }
    if (userToDelete.role === 'super_admin') {
      return res
        .status(400)
        .json({ message: 'You cant delete a super admin!' });
    }

    await UserModel.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: 'User deleted successfully!' });
  } catch (error) {
    console.error('❌ Error in delete user:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
