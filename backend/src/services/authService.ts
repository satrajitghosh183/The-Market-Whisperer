import { userService } from './userService';
import { generateToken } from '../middleware/auth';
import { AppError, ErrorCodes } from '../utils/errors';
import { User, AuthTokens, CreateUserInput, LoginInput } from '../types';
import { config } from '../config';

export const authService = {
  /**
   * Module 1: User Registration
   * 1.1: Create user with secure password hashing (argon2)
   * 1.2: Reject duplicate emails deterministically (409)
   * 1.3: Do not expose sensitive fields
   */
  async register(input: CreateUserInput): Promise<{ user: User; tokens: AuthTokens }> {
    // userService.create handles password hashing and duplicate checking
    const user = await userService.create(input);
    
    // Generate JWT token
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
    });
    
    return {
      user,
      tokens: {
        accessToken,
        expiresIn: config.jwt.expiresIn,
      },
    };
  },
  
  /**
   * Module 2: User Login Validation
   * 2.1: Validate credentials securely
   * 2.2: Issue JWT token
   * 2.3: Protect authenticated routes and preserve privacy
   */
  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user by email
    const userWithPassword = await userService.findByEmail(input.email);
    
    if (!userWithPassword) {
      // Use generic error to prevent email enumeration
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401);
    }
    
    // Validate password securely
    const isValid = await userService.validatePassword(input.password, userWithPassword.password_hash);
    
    if (!isValid) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid email or password', 401);
    }
    
    // Strip sensitive fields
    const { password_hash, ...user } = userWithPassword;
    
    // Generate JWT token
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
    });
    
    return {
      user,
      tokens: {
        accessToken,
        expiresIn: config.jwt.expiresIn,
      },
    };
  },
  
  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<User> {
    return userService.getProfile(userId);
  },
};

