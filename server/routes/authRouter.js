import express from 'express';
import { Login, LogOut, SignUp } from '../controller/authController.js';
import isLogin from '../middleware/isLogin.js';

const router = express.Router();

router.post('/login',Login);
router.post('/signup',SignUp);
router.post('/logout',isLogin,LogOut);

export default router;