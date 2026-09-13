const Story = require('../models/Story');

// POST /api/stories  (multipart: media)
async function createStory(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Media file is required.' });

    const { caption = '', isCloseFriendsOnly = false } = req.body;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    const story = await Story.create({
      user: req.user._id,
      mediaType,
      mediaUrl: `/uploads/stories/${req.file.filename}`,
      caption,
      isCloseFriendsOnly: isCloseFriendsOnly === 'true' || isCloseFriendsOnly === true
    });

    res.status(201).json({ message: 'Story posted. Expires in 24h.', story });
  } catch (err) {
    next(err);
  }
}

// GET /api/stories/feed
// Groups active (non-expired) stories by user, for everyone the current user follows.
async function getStoryFeed(req, res, next) {
  try {
    const authorIds = [...req.user.following, req.user._id];

    const stories = await Story.find({ user: { $in: authorIds } })
      .sort({ createdAt: 1 })
      .populate('user', 'username profilePic');

    // Group by author so the client can render one avatar ring per user
    const grouped = {};
    for (const story of stories) {
      // Skip close-friends-only stories unless viewer is in that list or is the author
      if (story.isCloseFriendsOnly) {
        const authorId = String(story.user._id);
        const isAuthor = authorId === String(req.user._id);
        const isCloseFriend = req.user.closeFriends.some((cf) => String(cf) === authorId);
        if (!isAuthor && !isCloseFriend) continue;
      }

      const key = String(story.user._id);
      if (!grouped[key]) {
        grouped[key] = { user: story.user, stories: [] };
      }
      grouped[key].stories.push(story);
    }

    res.status(200).json({ storyGroups: Object.values(grouped) });
  } catch (err) {
    next(err);
  }
}

// POST /api/stories/:id/view
async function markViewed(req, res, next) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found or has expired.' });

    const alreadyViewed = story.viewers.some((v) => String(v) === String(req.user._id));
    if (!alreadyViewed) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    res.status(200).json({ viewed: true, viewersCount: story.viewers.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/stories/:id/viewers  (author-only)
async function getViewers(req, res, next) {
  try {
    const story = await Story.findById(req.params.id).populate('viewers', 'username profilePic');
    if (!story) return res.status(404).json({ message: 'Story not found or has expired.' });

    if (String(story.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the story author can view this list.' });
    }

    res.status(200).json({ viewers: story.viewers });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/stories/:id
async function deleteStory(req, res, next) {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found or has expired.' });

    if (String(story.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own stories.' });
    }

    await story.deleteOne();
    res.status(200).json({ message: 'Story deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createStory, getStoryFeed, markViewed, getViewers, deleteStory };
