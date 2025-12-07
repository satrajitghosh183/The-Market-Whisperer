const authController = require('../controllers/authController');
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');

describe('Auth Controller', () => {

    describe('registerUser', () => {
        it('should create a user and wallet if email is new', async () => {
            const req = mockRequest({
                email: 'test@example.com',
                password: 'password123'
            });
            const res = mockResponse();

            // 1. Mock User.findOne to return null (user does not exist)
            spyOn(User, 'findOne').and.returnValue(Promise.resolve(null));

            // 2. Mock User.prototype.save to return a fake user
            spyOn(User.prototype, 'save').and.returnValue(Promise.resolve({
                _id: '123',
                email: 'test@example.com',
                role: 'Investor'
            }));

            // 3. Mock Wallet.prototype.save
            spyOn(Wallet.prototype, 'save').and.returnValue(Promise.resolve({}));

            // 4. Run the function
            await authController.registerUser(req, res);

            // 5. Expectations
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(jasmine.objectContaining({
                email: 'test@example.com',
                token: jasmine.any(String) // Ensure a token was generated
            }));
        });

        it('should return 400 if user already exists', async () => {
            const req = mockRequest({ email: 'test@example.com', password: '123' });
            const res = mockResponse();

            // Mock User.findOne to return an existing user object
            spyOn(User, 'findOne').and.returnValue(Promise.resolve({ email: 'test@example.com' }));

            await authController.registerUser(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
        });
    });
});