const User = require('../models/User');
const Post = require('../models/Post');

// GET /api/users/:username
async function getProfile(req, res, next) {
  try {
    const profile = await User.findOne({ username: req.params.username })
      .populate('followers', 'username profilePic')
      .populate('following', 'username profilePic');

    if (!profile) return res.status(404).json({ message: 'User not found.' });

    const isOwner = req.user && String(req.user._id) === String(profile._id);
    const isFollowing = req.user
      ? profile.followers.some((f) => String(f._id) === String(req.user._id))
      : false;

    // Private accounts hide posts from non-followers
    const canViewPosts = isOwner || !profile.isPrivate || isFollowing;
    const posts = canViewPosts
      ? await Post.find({ author: profile._id, _id: { $nin: profile.archivedPosts } })
          .sort({ createdAt: -1 })
          .limit(60)
      : [];

    res.status(200).json({
      profile: {
        ...profile.toPublicJSON(),
        followersCount: profile.followers.length,
        followingCount: profile.following.length
      },
      posts,
      postsCount: posts.length,
      isFollowing,
      isOwner,
      canViewPosts
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/profile
async function updateProfile(req, res, next) {
  try {
    const allowedFields = ['fullName', 'bio', 'isPrivate', 'isBusiness'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) {
      updates.profilePic = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ message: 'Profile updated.', user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/follow
async function toggleFollow(req, res, next) {
  try {
    const targetId = req.params.id;

    if (String(targetId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't follow yourself." });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const alreadyFollowing = target.followers.some((f) => String(f) === String(req.user._id));

    if (alreadyFollowing) {
      target.followers = target.followers.filter((f) => String(f) !== String(req.user._id));
      req.user.following = req.user.following.filter((f) => String(f) !== String(targetId));
      await target.save();
      await req.user.save();
      return res.status(200).json({ message: 'Unfollowed.', following: false });
    }

    if (target.isPrivate) {
      if (!target.followRequests.some((f) => String(f) === String(req.user._id))) {
        target.followRequests.push(req.user._id);
        await target.save();
      }
      return res.status(200).json({ message: 'Follow request sent.', requested: true });
    }

    target.followers.push(req.user._id);
    req.user.following.push(targetId);
    await target.save();
    await req.user.save();

    res.status(200).json({ message: 'Followed.', following: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/search?q=
async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(200).json({ users: [] });

    const users = await User.find({
      $or: [{ username: new RegExp(q, 'i') }, { fullName: new RegExp(q, 'i') }]
    })
      .select('username fullName profilePic isVerified')
      .limit(20);

    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/block
async function toggleBlock(req, res, next) {
  try {
    const targetId = req.params.id;
    const isBlocked = req.user.blockedUsers.some((b) => String(b) === String(targetId));

    if (isBlocked) {
      req.user.blockedUsers = req.user.blockedUsers.filter((b) => String(b) !== String(targetId));
    } else {
      req.user.blockedUsers.push(targetId);
    }
    await req.user.save();

    res.status(200).json({ blocked: !isBlocked });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/followers
async function getFollowers(req, res, next) {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username fullName profilePic isVerified');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json({ followers: user.followers });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/following
async function getFollowing(req, res, next) {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username fullName profilePic isVerified');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json({ following: user.following });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/follow-request/accept  (private accounts approving a follower)
async function acceptFollowRequest(req, res, next) {
  try {
    const requesterId = req.params.id;
    if (!req.user.followRequests.some((id) => String(id) === String(requesterId))) {
      return res.status(400).json({ message: 'No pending request from this user.' });
    }

    req.user.followRequests = req.user.followRequests.filter((id) => String(id) !== String(requesterId));
    req.user.followers.push(requesterId);
    await req.user.save();

    await User.findByIdAndUpdate(requesterId, { $addToSet: { following: req.user._id } });

    res.status(200).json({ message: 'Follow request accepted.' });
  } catch (err) {
    next(err);
  }
}

// --- Saved collections ---

// POST /api/users/collections  { name }
async function createCollection(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Collection name is required.' });

    req.user.collections.push({ name: name.trim(), posts: [] });
    await req.user.save();
    res.status(201).json({ collections: req.user.collections });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/collections
async function getCollections(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedPosts')
      .populate('collections.posts');
    res.status(200).json({ savedPosts: user.savedPosts, collections: user.collections });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:postId/save  { collectionName? }
// Toggles a post in/out of savedPosts, and optionally a named collection folder.
async function toggleSavePost(req, res, next) {
  try {
    const { postId } = req.params;
    const { collectionName } = req.body;

    const alreadySaved = req.user.savedPosts.some((id) => String(id) === String(postId));

    if (alreadySaved) {
      req.user.savedPosts = req.user.savedPosts.filter((id) => String(id) !== String(postId));
      req.user.collections.forEach((c) => {
        c.posts = c.posts.filter((id) => String(id) !== String(postId));
      });
    } else {
      req.user.savedPosts.push(postId);
      if (collectionName) {
        let collection = req.user.collections.find((c) => c.name === collectionName);
        if (!collection) {
          req.user.collections.push({ name: collectionName, posts: [postId] });
        } else if (!collection.posts.some((id) => String(id) === String(postId))) {
          collection.posts.push(postId);
        }
      }
    }

    await req.user.save();
    res.status(200).json({ saved: !alreadySaved });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  toggleFollow,
  searchUsers,
  toggleBlock,
  getFollowers,
  getFollowing,
  acceptFollowRequest,
  createCollection,
  getCollections,
  toggleSavePost
};
