import { Response, NextFunction } from 'express';
import { findOrCreateUser, getUserById, GoogleUserInfo } from '../services/authService.js';
import { generateAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

export const googleAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError('ID token is required', 400);
    }

    // In a real implementation, you would verify the ID token with Google
    // For now, we'll accept the token and extract user info
    // Note: In production, you should verify the token server-side
    // Using Google's tokeninfo endpoint or a library like google-auth-library
    
    // For now, we expect the frontend to send user info after verifying the token
    // This is a simplified approach - in production, verify the token server-side
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      throw new AppError('Invalid Google user info', 400);
    }

    const googleUser: GoogleUserInfo = {
      id: googleId,
      email,
      name: name || '',
      picture: picture || '',
    };

    const result = await findOrCreateUser(googleUser);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
    });

    res.json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  // In a production app, you might want to blacklist the token
  // For now, we'll just return success
  res.json({
    status: 'success',
    message: 'Logged out successfully',
  });
};

export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await getUserById(req.user.userId);

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

