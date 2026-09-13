import { api } from '../services/api.js';
import { el, timeAgo, toast } from '../utils.js';
import { renderBottomNav } from './nav.js';
import { navigate } from '../app.js';
import { getState } from '../state.js';

export async function renderInbox(container) {
  const screen = el('div', { class: 'screen' });
  const list = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);

  const searchInput = el('input', { type: 'text', placeholder: 'Start a new chat: enter a username' });
  const startBtn = el('button', { class: 'btn btn-secondary btn-sm', type: 'button' }, 'Go');
  startBtn.addEventListener('click', async () => {
    const username = searchInput.value.trim();
    if (!username) return;
    try {
      const { users } = await api.searchUsers(username);
      const match = users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || users[0];
      if (!match) return toast('No user found with that username.', 'error');
      const { conversation } = await api.startConversation({ recipientId: match._id });
      navigate(`/chat/${conversation._id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  screen.append(
    el('div', { class: 'topbar' }, [el('strong', {}, 'Messages')]),
    el('div', { style: 'display:flex; gap:8px; padding:12px 16px; border-bottom:1px solid var(--ink-800);' }, [
      searchInput,
      startBtn
    ]),
    list,
    renderBottomNav('inbox')
  );
  container.replaceChildren(screen);

  try {
    const { conversations, requests } = await api.getConversations();
    list.replaceChildren();

    if (requests.length > 0) {
      list.appendChild(
        el(
          'a',
          { href: '#/messages/requests', class: 'post-header', style: 'color:var(--accent-amber); text-decoration:none;' },
          [`Message requests (${requests.length})`]
        )
      );
    }

    if (conversations.length === 0) {
      list.appendChild(
        el('div', { class: 'empty-state' }, [el('h3', {}, 'No conversations yet'), el('p', {}, 'Search a username above to start one.')])
      );
      return;
    }

    conversations.forEach((c) => list.appendChild(renderConversationRow(c)));
  } catch (err) {
    list.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function renderConversationRow(conversation) {
  const { currentUser } = getState();
  const other = conversation.isGroup
    ? null
    : conversation.participants.find((p) => p._id !== currentUser._id);

  const title = conversation.isGroup ? conversation.groupName || 'Group chat' : other?.username || 'Conversation';
  const avatar = conversation.isGroup ? '/assets/default-avatar.svg' : other?.profilePic;
  const preview = conversation.lastMessage
    ? conversation.lastMessage.text || (conversation.lastMessage.mediaType !== 'text' ? 'Sent an attachment' : '')
    : 'Say hi \u{1F44B}';

  return el('a', { href: `#/chat/${conversation._id}`, class: 'post-header', style: 'text-decoration:none;' }, [
    el('img', { class: 'avatar', src: avatar, alt: title }),
    el('div', { style: 'flex:1; min-width:0;' }, [
      el('div', { class: 'post-author' }, title),
      el('div', { class: 'post-location', style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' }, preview)
    ]),
    conversation.lastMessage
      ? el('span', { style: 'color:var(--paper-500); font-size:11px;' }, timeAgo(conversation.lastMessage.createdAt))
      : null
  ]);
}
