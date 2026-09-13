const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Tracks which userIds currently have at least one open socket connection,
// so profiles/chat headers can show accurate online presence.
const onlineUsers = new Map(); // userId -> Set(socketId)

function markOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function markOffline(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function isOnline(userId) {
  return onlineUsers.has(String(userId));
}

/**
 * Wires all Socket.IO event handlers onto the given io instance.
 * Auth: client connects with `{ auth: { token } }`; we verify the JWT once
 * up front so every event handler can trust `socket.userId`.
 */
function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found.'));
      socket.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;

    // Every user gets a personal room (their own userId) so the server can
    // target "send this to user X" regardless of how many tabs/devices
    // they have open.
    socket.join(userId);
    markOnline(userId, socket.id);
    io.emit('presence-update', { userId, online: true });

    // --- Direct messaging ---
    // Primary send path is the REST endpoint (POST /api/messages/:id), which
    // persists to Mongo and then emits 'receive-message' itself. This socket
    // event covers ephemeral, non-persisted signals like typing indicators.
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('typing', { conversationId, userId, isTyping });
    });

    socket.on('join-conversation', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // --- WebRTC signaling (audio/video calls via PeerJS-style offer/answer) ---
    socket.on('call-user', ({ userToCall, signalData, from, name, isVideo }) => {
      io.to(userToCall).emit('incoming-call', { signal: signalData, from, name, isVideo });
    });

    socket.on('answer-call', ({ to, signal }) => {
      io.to(to).emit('call-accepted', signal);
    });

    socket.on('reject-call', ({ to }) => {
      io.to(to).emit('call-rejected');
    });

    socket.on('end-call', ({ to }) => {
      io.to(to).emit('call-ended');
    });

    // ICE candidates exchanged after the initial offer/answer
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('ice-candidate', { from: userId, candidate });
    });

    // --- Group calls: participants join a named call room ---
    socket.on('join-call-room', (roomId) => {
      socket.join(`call:${roomId}`);
      socket.to(`call:${roomId}`).emit('call-peer-joined', { userId, socketId: socket.id });
    });

    socket.on('leave-call-room', (roomId) => {
      socket.leave(`call:${roomId}`);
      socket.to(`call:${roomId}`).emit('call-peer-left', { userId, socketId: socket.id });
    });

    socket.on('disconnect', () => {
      markOffline(userId, socket.id);
      io.emit('presence-update', { userId, online: isOnline(userId) });
    });
  });
}

module.exports = { initSocket, isOnline };
