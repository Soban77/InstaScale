const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// POST /api/posts  (multipart: media[])
async function createPost(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one media file is required.' });
    }

    const { caption = '', location = '', mediaType } = req.body;
    const mediaUrls = files.map((f) => `/uploads/posts/${f.filename}`);

    const resolvedType =
      mediaType || (files.length > 1 ? 'carousel' : files[0].mimetype.startsWith('video') ? 'video' : 'image');

    const post = await Post.create({
      author: req.user._id,
      mediaType: resolvedType,
      mediaUrls,
      caption,
      location
    });

    await post.populate('author', 'username profilePic isVerified');

    res.status(201).json({ message: 'Post created.', post });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/feed?page=1&limit=10
// Feed = posts from people the user follows + their own posts, newest first.
async function getFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const authorIds = [...req.user.following, req.user._id];

    const posts = await Post.find({
      author: { $in: authorIds },
      mediaType: { $ne: 'reel' },
      _id: { $nin: req.user.archivedPosts } // hide the viewer's own archived posts
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePic isVerified');

    const total = await Post.countDocuments({ author: { $in: authorIds } });

    res.status(200).json({
      posts,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + posts.length < total
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/reels?page=1&limit=10
// Reels are discovery-driven: shows recent reels from everyone (excluding blocked users).
async function getReels(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const reels = await Post.find({
      mediaType: 'reel',
      author: { $nin: req.user.blockedUsers }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profilePic isVerified');

    res.status(200).json({ reels, page });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id
async function getPostById(req, res, next) {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username profilePic isVerified');
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    res.status(200).json({ post });
  } catch (err) {
    next(err);
  }
}

// POST /api/posts/:id/like
async function toggleLike(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const alreadyLiked = post.likes.some((id) => String(id) === String(req.user._id));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(req.user._id));
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();

    res.status(200).json({ liked: !alreadyLiked, likesCount: post.likes.length });
  } catch (err) {
    next(err);
  }
}

// POST /api/posts/:id/comments
async function addComment(req, res, next) {
  try {
    const { text, parentComment = null } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      text: text.trim(),
      parentComment
    });
    await comment.populate('author', 'username profilePic');

    post.commentsCount += 1;
    await post.save();

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id/comments
async function getComments(req, res, next) {
  try {
    const comments = await Comment.find({ post: req.params.id, parentComment: null })
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePic');

    res.status(200).json({ comments });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id
async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }

    await post.deleteOne();
    await Comment.deleteMany({ post: post._id });

    res.status(200).json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/posts/:id/archive
// Archived posts are hidden from the profile grid/feed but not deleted -
// only the owner can see them again, in the private Archive page.
async function toggleArchive(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only archive your own posts.' });
    }

    const isArchived = req.user.archivedPosts.some((id) => String(id) === String(post._id));
    if (isArchived) {
      req.user.archivedPosts = req.user.archivedPosts.filter((id) => String(id) !== String(post._id));
    } else {
      req.user.archivedPosts.push(post._id);
    }
    await req.user.save();

    res.status(200).json({ archived: !isArchived });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/archive/mine
async function getArchive(req, res, next) {
  try {
    const user = await req.user.populate('archivedPosts');
    res.status(200).json({ posts: user.archivedPosts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPost,
  getFeed,
  getReels,
  getPostById,
  toggleLike,
  addComment,
  getComments,
  deletePost,
  toggleArchive,
  getArchive
};
