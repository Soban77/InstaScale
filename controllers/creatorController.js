const Post = require('../models/Post');
const Campaign = require('../models/Campaign');

// GET /api/creator/dashboard
// Impression/reach metrics for the logged-in creator's own posts.
// "Impressions" are approximated from likes+comments*multiplier since no
// separate view-tracking pipeline exists yet - swap in real view events later.
async function getDashboard(req, res, next) {
  try {
    const posts = await Post.find({ author: req.user._id }).sort({ createdAt: -1 });

    const totals = posts.reduce(
      (acc, post) => {
        acc.likes += post.likes.length;
        acc.comments += post.commentsCount;
        acc.shares += post.sharesCount;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0 }
    );

    const estimatedReach = totals.likes * 12 + totals.comments * 6 + totals.shares * 20;

    const topPosts = [...posts]
      .sort((a, b) => b.likes.length + b.commentsCount - (a.likes.length + a.commentsCount))
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        thumbnail: p.thumbnailUrl || p.mediaUrls[0],
        likes: p.likes.length,
        comments: p.commentsCount,
        createdAt: p.createdAt
      }));

    res.status(200).json({
      postsCount: posts.length,
      totals,
      estimatedReach,
      topPosts
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creator/campaigns
async function listCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.find({ owner: req.user._id }).sort({ createdAt: -1 }).populate('post');
    res.status(200).json({ campaigns });
  } catch (err) {
    next(err);
  }
}

// POST /api/creator/campaigns
async function createCampaign(req, res, next) {
  try {
    const { name, postId, objective, dailyBudgetCents, startDate, endDate, targeting } = req.body;

    if (!name || !postId || !dailyBudgetCents || !startDate || !endDate) {
      return res.status(400).json({
        message: 'name, postId, dailyBudgetCents, startDate and endDate are required.'
      });
    }

    const post = await Post.findOne({ _id: postId, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found, or not owned by you.' });

    const campaign = await Campaign.create({
      owner: req.user._id,
      name,
      post: postId,
      objective,
      dailyBudgetCents: Number(dailyBudgetCents),
      startDate,
      endDate,
      targeting,
      status: 'draft'
    });

    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
}

// PUT /api/creator/campaigns/:id  { status }  - draft -> active -> paused -> completed
async function updateCampaignStatus(req, res, next) {
  try {
    const { status } = req.body;
    const campaign = await Campaign.findOne({ _id: req.params.id, owner: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });

    campaign.status = status;

    // Mocked metrics: once a campaign goes active, seed some plausible numbers
    // so the dashboard isn't empty. A real system would ingest ad-server events.
    if (status === 'active' && campaign.metrics.impressions === 0) {
      const days = Math.max(1, Math.round((campaign.endDate - campaign.startDate) / 86400000));
      campaign.metrics.impressions = campaign.dailyBudgetCents * days * 3;
      campaign.metrics.clicks = Math.round(campaign.metrics.impressions * 0.02);
      campaign.metrics.spendCents = campaign.dailyBudgetCents * days;
    }

    await campaign.save();
    res.status(200).json({ campaign });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, listCampaigns, createCampaign, updateCampaignStatus };
