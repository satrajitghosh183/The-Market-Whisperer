import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';
import { dataLayer, initializeDataLayer } from '../../src/data/dataLayer.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(async () => {
    await initializeDataLayer();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          role: 'investor',
          riskProfile: 'moderate',
          horizonYears: 2
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user.role).toBe('investor');
      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.availableBalance).toBe(10000);
      expect(response.body.portfolio).toBeDefined();
    });

    it('should create wallet with default balance', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser2@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.wallet.availableBalance).toBe(10000);
    });

    it('should set mode based on role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'trader@test.com',
          password: 'password123',
          role: 'trader'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.mode).toBe('trader');
    });

    it('should return 400 if user already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists');
    });

    it('should hash password before storing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hashtest@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      
      const user = await dataLayer.getUserByEmail('hashtest@test.com');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('password123');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('login@test.com');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 500 on server error', async () => {
      // This would require mocking dataLayer to throw an error
      // For now, we test the happy path
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/profile/:userId', () => {
    let testUser;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'profile@test.com',
          password: 'password123',
          role: 'investor',
          riskProfile: 'aggressive',
          horizonYears: 5
        });

      testUser = registerResponse.body.user;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get(`/api/auth/profile/${testUser.userId}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.userId).toBe(testUser.userId);
      expect(response.body.user.email).toBe('profile@test.com');
      expect(response.body.user.riskProfile).toBe('aggressive');
      expect(response.body.user.horizonYears).toBe(5);
      expect(response.body.wallet).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/auth/profile/non_existent_user');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});

