import express, { Router } from 'express';
import { Request, Response } from 'express';
import UserModel from '../models/user';
import bcrypt from "bcrypt";

const router: Router = express.Router();

router.post('/register', async (req: any, res: any) => {
    try {
        const { username, email, password } = req.body;
        console.log('Received registration request:', { username, email }); // Log request

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(401).json({ message: 'User already exists' });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new UserModel({
            username,
            email,
            password: hashPassword
        });
        await newUser.save();

        return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error details:', error); // Detailed error
        return res.status(500).json({ 
            message: 'Server error', 
            error: error instanceof Error ? error.message : String(error) 
        });
    }
});


router.post('/login', async (res: any, req: any)=> {
    try{

    } catch(error){
     console.error('Login error details:' error);
     return res.status(500).json({
        message: 'Server error',
        
     }) 
    }
})

export { router as userRouter };