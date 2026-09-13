const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/search', requireAuth, userController.searchUsers);
router.put('/profile', requireAuth, upload.single('avatar'), userController.updateProfile);
router.get('/collections', requireAuth, userController.getCollections);
router.post('/collections', requireAuth, userController.createCollection);
router.post('/:postId/save', requireAuth, userController.toggleSavePost);
router.get('/:id/followers', requireAuth, userController.getFollowers);
router.get('/:id/following', requireAuth, userController.getFollowing);
router.post('/:id/follow-request/accept', requireAuth, userController.acceptFollowRequest);
router.get('/:username', optionalAuth, userController.getProfile);
router.post('/:id/follow', requireAuth, userController.toggleFollow);
router.post('/:id/block', requireAuth, userController.toggleBlock);

module.exports = router;
