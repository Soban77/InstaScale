const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', requireAuth, upload.single('media'), storyController.createStory);
router.get('/feed', requireAuth, storyController.getStoryFeed);
router.post('/:id/view', requireAuth, storyController.markViewed);
router.get('/:id/viewers', requireAuth, storyController.getViewers);
router.delete('/:id', requireAuth, storyController.deleteStory);

module.exports = router;
