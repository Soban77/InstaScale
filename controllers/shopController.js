const crypto = require('crypto');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// GET /api/shop/products?category=&q=&page=
async function listProducts(req, res, next) {
  try {
    const { category, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 24;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'username profilePic isVerified');

    res.status(200).json({ products, page });
  } catch (err) {
    next(err);
  }
}

// GET /api/shop/products/:id
async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id).populate('seller', 'username profilePic isVerified');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.status(200).json({ product });
  } catch (err) {
    next(err);
  }
}

// POST /api/shop/products  (seller creates a product; multipart images[])
async function createProduct(req, res, next) {
  try {
    const { title, description = '', priceCents, category = 'general', inventory = 0 } = req.body;
    const files = req.files || [];

    if (!title || !priceCents || files.length === 0) {
      return res.status(400).json({ message: 'title, priceCents and at least one image are required.' });
    }

    const product = await Product.create({
      seller: req.user._id,
      title,
      description,
      priceCents: Number(priceCents),
      category,
      inventory: Number(inventory),
      images: files.map((f) => `/uploads/posts/${f.filename}`)
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

// GET /api/shop/cart
async function getCart(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    const items = user.cart.filter((item) => item.product); // drop deleted products
    const totalCents = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
    res.status(200).json({ items, totalCents });
  } catch (err) {
    next(err);
  }
}

// POST /api/shop/cart  { productId, quantity }
async function addToCart(req, res, next) {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const existing = req.user.cart.find((item) => String(item.product) === String(productId));
    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      req.user.cart.push({ product: productId, quantity: Number(quantity) });
    }
    await req.user.save();

    res.status(200).json({ message: 'Added to cart.', cartSize: req.user.cart.length });
  } catch (err) {
    next(err);
  }
}

// PUT /api/shop/cart/:productId  { quantity }
async function updateCartItem(req, res, next) {
  try {
    const { quantity } = req.body;
    const item = req.user.cart.find((i) => String(i.product) === String(req.params.productId));
    if (!item) return res.status(404).json({ message: 'Item not in cart.' });

    if (Number(quantity) <= 0) {
      req.user.cart = req.user.cart.filter((i) => String(i.product) !== String(req.params.productId));
    } else {
      item.quantity = Number(quantity);
    }
    await req.user.save();

    res.status(200).json({ message: 'Cart updated.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/shop/cart/:productId
async function removeFromCart(req, res, next) {
  try {
    req.user.cart = req.user.cart.filter((i) => String(i.product) !== String(req.params.productId));
    await req.user.save();
    res.status(200).json({ message: 'Removed from cart.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/shop/checkout
// Mocked payment: no real Stripe call is made, an order is created as "paid"
// immediately with a fake payment reference, matching the PRD's "checkout mocks".
async function checkout(req, res, next) {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    const items = user.cart.filter((item) => item.product);

    if (items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const orderItems = items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      priceCentsAtPurchase: item.product.priceCents
    }));
    const totalCents = orderItems.reduce((sum, i) => sum + i.priceCentsAtPurchase * i.quantity, 0);

    const order = await Order.create({
      buyer: user._id,
      items: orderItems,
      totalCents,
      status: 'paid',
      mockPaymentRef: `mock_pi_${crypto.randomBytes(8).toString('hex')}`
    });

    user.cart = [];
    await user.save();

    res.status(201).json({ message: 'Order placed.', order });
  } catch (err) {
    next(err);
  }
}

// GET /api/shop/orders
async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product');
    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  checkout,
  getMyOrders
};
