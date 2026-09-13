/**
 * Minimal observable store. Views subscribe to the keys they care
 * about; setState notifies subscribers after merging changes in.
 */
const listeners = new Set();

const state = {
  currentUser: null,
  accessToken: localStorage.getItem('accessToken') || null,
  pendingTwoFactorUserId: null
};

export function getState() {
  return state;
}

export function setState(partial) {
  Object.assign(state, partial);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isAuthenticated() {
  return Boolean(state.accessToken && state.currentUser);
}

export function persistSession({ user, accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  setState({ currentUser: user, accessToken: accessToken || state.accessToken });
}

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  setState({ currentUser: null, accessToken: null });
}
