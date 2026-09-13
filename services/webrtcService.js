/**
 * WebRTC call signaling.
 *
 * The actual Socket.IO event handlers live in config/socket.js (wired
 * directly onto the `io` instance in server.js), since they need direct
 * access to the io/socket objects for room targeting. This module exists
 * as the PRD-specified home for that concern and documents the contract
 * the client (public/js/services/webrtc.js) relies on:
 *
 *   Client -> Server events:
 *     'call-user'        { userToCall, signalData, from, name, isVideo }
 *     'answer-call'       { to, signal }
 *     'reject-call'       { to }
 *     'end-call'          { to }
 *     'ice-candidate'      { to, candidate }
 *     'join-call-room'    roomId   (group calls)
 *     'leave-call-room'   roomId
 *
 *   Server -> Client events:
 *     'incoming-call'      { signal, from, name, isVideo }
 *     'call-accepted'      signal (SDP answer)
 *     'call-rejected'
 *     'call-ended'
 *     'ice-candidate'      { from, candidate }
 *     'call-peer-joined'   { userId, socketId }
 *     'call-peer-left'     { userId, socketId }
 *
 * See config/socket.js for the implementation and public/js/services/webrtc.js
 * for the browser-side RTCPeerConnection wrapper that speaks this protocol.
 */

module.exports = {};
