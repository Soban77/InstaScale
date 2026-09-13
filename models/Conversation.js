const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: '' },
    groupAvatar: { type: String, default: '' },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }], // group admins
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    // A conversation is a "request" (pending) until the recipient replies,
    // if the sender doesn't follow / isn't followed by the recipient.
    isRequest: { type: Boolean, default: false },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
