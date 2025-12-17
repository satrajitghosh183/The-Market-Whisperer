import argon2 from 'argon2';
import { getSupabaseClient } from '../db/client';
import { AppError, ErrorCodes } from '../utils/errors';
import { User, UserWithPassword, CreateUserInput } from '../types';
import { walletService } from './walletService';

// Strip sensitive fields from user object
function sanitizeUser(user: UserWithPassword): User {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export const userService = {
  async create(input: CreateUserInput): Promise<User> {
    const supabase = getSupabaseClient();
    
    // Check for existing user with same email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', input.email.toLowerCase())
      .maybeSingle();
    
    if (existingUser) {
      throw new AppError(ErrorCodes.DUPLICATE_EMAIL, 'A user with this email already exists', 409);
    }
    
    // Hash password securely
    const password_hash = await argon2.hash(input.password);
    
    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: input.email.toLowerCase(),
        password_hash,
        display_name: input.display_name || null,
      })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        throw new AppError(ErrorCodes.DUPLICATE_EMAIL, 'A user with this email already exists', 409);
      }
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create user', 500);
    }
    
    // Automatically provision wallet for the new user (Module 4.1)
    try {
      await walletService.provision(user.id);
    } catch (walletError) {
      // If wallet creation fails (shouldn't happen), log but don't fail user creation
      console.error('Failed to provision wallet for user:', user.id, walletError);
    }
    
    return sanitizeUser(user);
  },
  
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to find user', 500);
    }
    
    return data;
  },
  
  async findById(id: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to find user', 500);
    }
    
    if (!data) {
      return null;
    }
    
    return sanitizeUser(data);
  },
  
  async validatePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  },
  
  async getProfile(userId: string): Promise<User> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
    }
    
    return user;
  },
};

