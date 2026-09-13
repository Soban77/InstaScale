const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', requireAuth, upload.array('media', 10), postController.createPost);
router.get('/feed', requireAuth, postController.getFeed);
router.get('/reels', requireAuth, postController.getReels);
router.get('/archive/mine', requireAuth, postController.getArchive);
router.get('/:id', requireAuth, postController.getPostById);
router.delete('/:id', requireAuth, postController.deletePost);
router.post('/:id/like', requireAuth, postController.toggleLike);
router.post('/:id/archive', requireAuth, postController.toggleArchive);
router.get('/:id/comments', requireAuth, postController.getComments);
router.post('/:id/comments', requireAuth, postController.addComment);

module.exports = router;
