let socket = null;

/**
 * Lazily connects a single shared Socket.IO client, authenticated with the
 * current access token. Safe to call repeatedly - returns the existing
 * connection if one is already open.
 */
export function getSocket() {
  if (socket && socket.connected) return socket;

  const token = localStorage.getItem('accessToken');
  if (!token || !window.io) return null;

  socket = window.io({ auth: { token } });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
