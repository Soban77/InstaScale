const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'carousel', 'reel'],
      required: true
    },
    mediaUrls: [{ type: String, required: true }],
    thumbnailUrl: { type: String },
    caption: { type: String, default: '', maxlength: 2200 },
    hashtags: [{ type: String, index: true, lowercase: true }],
    location: { type: String, default: '' },

    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },

    audioTrack: { type: String, default: '' }
  },
  { timestamps: true }
);

// Newest-first feed queries are the hot path
postSchema.index({ createdAt: -1 });

// Auto-extract #hashtags from the caption before saving
postSchema.pre('save', function extractHashtags(next) {
  if (this.isModified('caption')) {
    const matches = this.caption.match(/#[\w]+/g) || [];
    this.hashtags = [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
