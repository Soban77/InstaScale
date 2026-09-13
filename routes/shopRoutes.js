const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/products', requireAuth, shopController.listProducts);
router.post('/products', requireAuth, upload.array('images', 6), shopController.createProduct);
router.get('/products/:id', requireAuth, shopController.getProduct);

router.get('/cart', requireAuth, shopController.getCart);
router.post('/cart', requireAuth, shopController.addToCart);
router.put('/cart/:productId', requireAuth, shopController.updateCartItem);
router.delete('/cart/:productId', requireAuth, shopController.removeFromCart);

router.post('/checkout', requireAuth, shopController.checkout);
router.get('/orders', requireAuth, shopController.getMyOrders);

module.exports = router;
