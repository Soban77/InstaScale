const Report = require('../models/Report');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// GET /api/admin/reports?status=open
async function getReports(req, res, next) {
  try {
    const status = req.query.status || 'open';
    const reports = await Report.find({ status })
      .sort({ createdAt: -1 })
      .populate('reporter', 'username profilePic')
      .limit(100);
    res.status(200).json({ reports });
  } catch (err) {
    next(err);
  }
}

// POST /api/reports  (any authenticated user files a report - not admin-only)
async function fileReport(req, res, next) {
  try {
    const { targetType, targetId, reason, details = '' } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'targetType, targetId and reason are required.' });
    }
    const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason, details });
    res.status(201).json({ message: 'Report submitted. Our team will review it.', report });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/reports/:id  { status, resolutionNote, action }
// action: 'remove_content' | 'ban_user' | 'dismiss'
async function resolveReport(req, res, next) {
  try {
    const { status = 'actioned', resolutionNote = '', action } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (action === 'remove_content') {
      if (report.targetType === 'post') await Post.findByIdAndDelete(report.targetId);
      if (report.targetType === 'comment') await Comment.findByIdAndDelete(report.targetId);
    }
    if (action === 'ban_user') {
      const targetUserId = report.targetType === 'user' ? report.targetId : null;
      if (targetUserId) await User.findByIdAndUpdate(targetUserId, { isBanned: true });
    }

    report.status = status;
    report.resolutionNote = resolutionNote;
    report.resolvedBy = req.user._id;
    await report.save();

    res.status(200).json({ message: 'Report resolved.', report });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/ban
async function banUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json({ message: `${user.username} has been banned.` });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/unban
async function unbanUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.status(200).json({ message: `${user.username} has been unbanned.` });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/insights
async function getPlatformInsights(req, res, next) {
  try {
    const [userCount, postCount, openReportCount, bannedCount] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Report.countDocuments({ status: 'open' }),
      User.countDocuments({ isBanned: true })
    ]);

    const signupsLast7d = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      totalUsers: userCount,
      totalPosts: postCount,
      openReports: openReportCount,
      bannedUsers: bannedCount,
      signupsLast7d
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getReports, fileReport, resolveReport, banUser, unbanUser, getPlatformInsights };
