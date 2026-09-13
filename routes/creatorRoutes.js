const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');
const { requireAuth } = require('../middleware/auth');

router.get('/dashboard', requireAuth, creatorController.getDashboard);
router.get('/campaigns', requireAuth, creatorController.listCampaigns);
router.post('/campaigns', requireAuth, creatorController.createCampaign);
router.put('/campaigns/:id', requireAuth, creatorController.updateCampaignStatus);

module.exports = router;
