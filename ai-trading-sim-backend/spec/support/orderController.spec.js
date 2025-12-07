const orderController = require('../controllers/orderController');
const Wallet = require('../models/walletModel');
const Position = require('../models/positionModel');
const Order = require('../models/orderModel');
const Ledger = require('../models/ledgerModel');

describe('Order Controller', () => {

    describe('buyOrder', () => {
        let req, res, mockWallet;

        beforeEach(() => {
            // Setup a fake logged-in user
            req = mockRequest(
                { ticker: 'AAPL', quantity: '10', price: '150.00' }, // Body
                { _id: 'user123' } // User from token
            );
            res = mockResponse();

            // Setup a fake wallet with $5000
            mockWallet = {
                _id: 'wallet123',
                available_balance: '5000.00',
                save: jasmine.createSpy('save')
            };
        });

        it('should execute trade if funds are sufficient', async () => {
            // 1. Mock Wallet finding
            spyOn(Wallet, 'findOne').and.returnValue(Promise.resolve(mockWallet));

            // 2. Mock Position finding (return null means new position)
            const mockPosition = {
                shares: '0',
                avg_cost: '0',
                save: jasmine.createSpy('save')
            };
            spyOn(Position, 'findOne').and.returnValue(Promise.resolve(mockPosition));
            // Mock creating new position if not found involves spying on constructor or just assuming findOne returns object for simplicity in this unit test style
            // Ideally we mock the Position constructor, but here we'll assume findOne returns an editable object

            // 3. Mock Ledger and Order saves
            spyOn(Ledger.prototype, 'save').and.returnValue(Promise.resolve());
            spyOn(Order.prototype, 'save').and.returnValue(Promise.resolve({ _id: 'order123' }));

            // 4. Execute
            await orderController.buyOrder(req, res);

            // 5. Expectations
            // Cost = 10 * 150 = 1500. Balance 5000 - 1500 = 3500.
            expect(mockWallet.available_balance).toBe('3500');
            expect(mockWallet.save).toHaveBeenCalled();

            // Shares should go from 0 to 10
            expect(mockPosition.shares).toBe('10');
            expect(mockPosition.save).toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should fail if funds are insufficient', async () => {
            // Wallet only has $100
            mockWallet.available_balance = '100.00';
            spyOn(Wallet, 'findOne').and.returnValue(Promise.resolve(mockWallet));

            await orderController.buyOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(jasmine.objectContaining({
                message: 'Insufficient funds'
            }));

            // Wallet should NOT be saved/changed
            expect(mockWallet.save).not.toHaveBeenCalled();
        });
    });
});