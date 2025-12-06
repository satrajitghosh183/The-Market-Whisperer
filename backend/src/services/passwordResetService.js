import crypto from 'crypto';
import { unifiedDataLayer as dataLayer } from '../data/unifiedDataLayer.js';
import { isMongoDBAvailable } from '../database/connection.js';
import { User } from '../database/models/index.js';

/**
 * Password Reset Service
 * Handles password reset token generation and validation
 */
export class PasswordResetService {
  /**
   * Generate a secure random token
   * @returns {string} Random token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset (forgot password)
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset token and expiration
   */
  static async requestPasswordReset(email) {
    try {
      const user = await dataLayer.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists for security
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
          // In production, always return success to prevent email enumeration
        };
      }

      // Generate reset token
      const resetToken = this.generateToken();
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // Token expires in 1 hour

      // Save token to user record
      if (isMongoDBAvailable()) {
        await User.findOneAndUpdate(
          { userId: user.userId },
          {
            $set: {
              resetPasswordToken: resetToken,
              resetPasswordExpires: resetTokenExpires
            }
          }
        );
      } else {
        // File-based storage - update through data layer
        const updatedUser = await dataLayer.updateUser(user.userId, {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpires.toISOString()
        });
        if (!updatedUser) {
          throw new Error('Failed to update user with reset token');
        }
      }

      // In production, send email here
      // For now, return token in response (development only)
      return {
        success: true,
        message: 'Password reset token generated successfully.',
        resetToken: resetToken, // Remove this in production - only for development
        expiresAt: resetTokenExpires.toISOString(),
        // In production, you would send an email with a link like:
        // `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success status
   */
  static async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      let user;
      
      // Find user by reset token
      if (isMongoDBAvailable()) {
        user = await User.findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: new Date() } // Token not expired
        });
      } else {
        // File-based storage
        const users = await dataLayer.getAllUsers();
        user = users.find(u => 
          u.resetPasswordToken === token && 
          u.resetPasswordExpires && 
          new Date(u.resetPasswordExpires) > new Date()
        );
      }

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash(newPassword, 10);

      // Update password and clear reset token
      if (isMongoDBAvailable()) {
        await User.findOneAndUpdate(
          { userId: user.userId },
          {
            $set: {
              passwordHash: hashedPassword,
              resetPasswordToken: null,
              resetPasswordExpires: null
            }
          }
        );
      } else {
        // File-based storage
        const updatedUser = await dataLayer.updateUser(user.userId, {
          passwordHash: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        });
        if (!updatedUser) {
          throw new Error('Failed to update user password');
        }
      }

      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Verify reset token is valid
   * @param {string} token - Reset token
   * @returns {Promise<boolean>} True if token is valid
   */
  static async verifyResetToken(token) {
    try {
      if (!token) {
        return false;
      }

      let user;
      
      if (isMongoDBAvailable()) {
        user = await User.findOne({
          resetPasswordToken: token,
          resetPasswordExpires: { $gt: new Date() }
        });
      } else {
        const users = await dataLayer.getAllUsers();
        user = users.find(u => 
          u.resetPasswordToken === token && 
          u.resetPasswordExpires && 
          new Date(u.resetPasswordExpires) > new Date()
        );
      }

      return !!user;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }
}

