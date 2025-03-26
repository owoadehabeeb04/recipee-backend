// edit/add user details
import { Express } from 'express';
import { Request, Response } from 'express';

import UserModel from '../models/user';

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
    console.log(updateData, 'updateData')
    console.log('ID', id)
    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -otp');
    console.log('updated user', updatedUser)
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
