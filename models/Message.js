const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'disappearing'],
      default: 'text'
    },
    // For "disappearing" media: once every recipient has opened it, it's cleared
    openedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isReadBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
