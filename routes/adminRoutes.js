const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/reports', adminController.getReports);
router.put('/reports/:id', adminController.resolveReport);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);
router.get('/insights', adminController.getPlatformInsights);

module.exports = router;
