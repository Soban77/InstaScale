import { api } from './services/api.js';
import { getState, setState, isAuthenticated, clearSession } from './state.js';
import { getSocket, disconnectSocket } from './services/socket.js';
import { el } from './utils.js';

import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderTwoFactor } from './views/twoFactor.js';
import { renderFeed } from './views/feed.js';
import { renderProfile } from './views/profile.js';
import { renderEditProfile } from './views/editProfile.js';
import { renderFollowList } from './views/followList.js';
import { renderSaved } from './views/savedCollections.js';
import { renderArchive } from './views/archive.js';
import { renderSearch } from './views/search.js';
import { renderReels } from './views/reels.js';
import { renderInbox } from './views/inbox.js';
import { renderMessageRequests } from './views/messageRequests.js';
import { renderChatRoom } from './views/chatRoom.js';
import { renderShop, renderProductDetail } from './views/shop.js';
import { renderCart } from './views/cart.js';
import { renderCreatorDashboard } from './views/creatorDashboard.js';
import { renderAdminPanel } from './views/adminPanel.js';
import { handleIncomingCall } from './views/callOverlay.js';

const container = document.getElementById('app');

const PUBLIC_ROUTES = new Set(['/login', '/register', '/2fa']);

export function navigate(path) {
  window.location.hash = `#${path}`;
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, ...rest] = hash.split('/').filter(Boolean);
  return { path: `/${path || ''}`, segments: rest };
}

async function router() {
  const { path, segments } = parseHash();

  if (!PUBLIC_ROUTES.has(path) && !isAuthenticated()) {
    navigate('/login');
    return;
  }
  if (PUBLIC_ROUTES.has(path) && isAuthenticated() && path !== '/2fa') {
    navigate('/');
    return;
  }

  switch (path) {
    case '/login':
      renderLogin(container);
      break;
    case '/register':
      renderRegister(container);
      break;
    case '/2fa':
      renderTwoFactor(container);
      break;
    case '/search':
      renderSearch(container);
      break;
    case '/reels':
      renderReels(container);
      break;

    case '/profile': {
      if (segments[0] === 'edit') {
        renderEditProfile(container);
      } else if (segments[1] === 'followers') {
        renderFollowersOrFollowing(segments[0], 'followers');
      } else if (segments[1] === 'following') {
        renderFollowersOrFollowing(segments[0], 'following');
      } else {
        const username = segments[0] || getState().currentUser?.username;
        renderProfile(container, username);
      }
      break;
    }

    case '/saved':
      renderSaved(container);
      break;
    case '/archive':
      renderArchive(container);
      break;

    case '/messages': {
      if (segments[0] === 'requests') renderMessageRequests(container);
      else renderInbox(container);
      break;
    }
    case '/chat':
      renderChatRoom(container, segments[0]);
      break;

    case '/shop': {
      if (segments[0] === 'product') renderProductDetail(container, segments[1]);
      else if (segments[0] === 'cart') renderCart(container);
      else renderShop(container);
      break;
    }

    case '/creator':
      renderCreatorDashboard(container);
      break;
    case '/admin':
      renderAdminPanel(container);
      break;

    case '/':
    default:
      renderFeed(container);
      break;
  }
}

// Resolves a username into its user id (needed by the follow-list API,
// which is keyed by id) before rendering.
async function renderFollowersOrFollowing(username, kind) {
  try {
    const { profile } = await api.getProfile(username);
    renderFollowList(container, profile._id, kind);
  } catch (err) {
    container.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function wireGlobalSocketListeners() {
  const socket = getSocket();
  if (!socket) return;
  socket.off('incoming-call');
  socket.on('incoming-call', (payload) => handleIncomingCall(payload, socket));
}

async function bootstrap() {
  container.replaceChildren(el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]));

  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      const { user } = await api.getCurrentUser();
      setState({ currentUser: user, accessToken: token });
      wireGlobalSocketListeners();
    } catch (err) {
      clearSession();
      disconnectSocket();
    }
  }

  window.addEventListener('hashchange', () => {
    // Re-arm socket listeners after login/logout transitions
    if (isAuthenticated()) wireGlobalSocketListeners();
    router();
  });
  router();
}

bootstrap();
