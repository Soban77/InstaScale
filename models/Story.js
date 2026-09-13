const mongoose = require('mongoose');
const { Schema } = mongoose;

const storySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  mediaUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isCloseFriendsOnly: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL index: document is auto-deleted 86400s (24h) after createdAt
    expires: 86400
  }
});

module.exports = mongoose.model('Story', storySchema);
