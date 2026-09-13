const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

async function areConnected(userAId, userBId) {
  const [a, b] = await Promise.all([User.findById(userAId), User.findById(userBId)]);
  if (!a || !b) return false;
  const aFollowsB = a.following.some((id) => String(id) === String(userBId));
  const bFollowsA = b.following.some((id) => String(id) === String(userAId));
  return aFollowsB || bFollowsA;
}

// GET /api/messages/conversations
// Returns accepted threads and (separately) pending message requests.
async function getConversations(req, res, next) {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username profilePic')
      .populate('lastMessage');

    const accepted = conversations.filter(
      (c) => !c.isRequest || String(c.requestedBy) === String(req.user._id)
    );
    const requests = conversations.filter(
      (c) => c.isRequest && String(c.requestedBy) !== String(req.user._id)
    );

    res.status(200).json({ conversations: accepted, requests });
  } catch (err) {
    next(err);
  }
}

// POST /api/messages/conversations  { recipientId }  OR  { participantIds: [], groupName }
async function startConversation(req, res, next) {
  try {
    const { recipientId, participantIds, groupName } = req.body;

    if (participantIds && participantIds.length > 1) {
      // Group chat
      const conversation = await Conversation.create({
        participants: [req.user._id, ...participantIds],
        isGroup: true,
        groupName: groupName || 'New Group',
        admins: [req.user._id]
      });
      await conversation.populate('participants', 'username profilePic');
      return res.status(201).json({ conversation });
    }

    if (!recipientId) {
      return res.status(400).json({ message: 'recipientId is required for a 1-on-1 chat.' });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, recipientId], $size: 2 }
    }).populate('participants', 'username profilePic');

    if (conversation) return res.status(200).json({ conversation });

    const connected = await areConnected(req.user._id, recipientId);

    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
      isGroup: false,
      isRequest: !connected,
      requestedBy: req.user._id
    });
    await conversation.populate('participants', 'username profilePic');

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

// GET /api/messages/:conversationId
async function getChatHistory(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePic');

    res.status(200).json({ conversation, messages });
  } catch (err) {
    next(err);
  }
}

// POST /api/messages/:conversationId  (text, or multipart media)
async function sendMessage(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const { text = '', mediaType = 'text' } = req.body;
    const mediaUrl = req.file ? `/uploads/posts/${req.file.filename}` : '';

    if (!text.trim() && !mediaUrl) {
      return res.status(400).json({ message: 'Message must have text or media.' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text.trim(),
      mediaUrl,
      mediaType: mediaUrl ? mediaType : 'text',
      isReadBy: [req.user._id]
    });
    await message.populate('sender', 'username profilePic');

    conversation.lastMessage = message._id;
    // Accepting a request: once the recipient sends a reply, it's no longer pending
    if (conversation.isRequest && String(conversation.requestedBy) !== String(req.user._id)) {
      conversation.isRequest = false;
    }
    await conversation.save();

    // The realtime emit to other participants happens in config/socket.js
    // via the io instance attached to the request (see server.js).
    if (req.app.get('io')) {
      conversation.participants.forEach((participantId) => {
        if (String(participantId) !== String(req.user._id)) {
          req.app.get('io').to(String(participantId)).emit('receive-message', {
            conversationId: conversation._id,
            message
          });
        }
      });
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// POST /api/messages/:conversationId/read
async function markRead(req, res, next) {
  try {
    await Message.updateMany(
      { conversation: req.params.conversationId, isReadBy: { $ne: req.user._id } },
      { $addToSet: { isReadBy: req.user._id } }
    );
    res.status(200).json({ message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
}

// POST /api/messages/requests/:conversationId/accept
async function acceptRequest(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    conversation.isRequest = false;
    await conversation.save();
    res.status(200).json({ message: 'Request accepted.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/messages/requests/:conversationId
async function declineRequest(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    await Message.deleteMany({ conversation: conversation._id });
    await conversation.deleteOne();
    res.status(200).json({ message: 'Request declined.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  startConversation,
  getChatHistory,
  sendMessage,
  markRead,
  acceptRequest,
  declineRequest
};
