import { api } from '../services/api.js';
import { getState } from '../state.js';
import { el, toast, timeAgo } from '../utils.js';
import { getSocket } from '../services/socket.js';
import { startCall } from './callOverlay.js';

export async function renderChatRoom(container, conversationId) {
  const { currentUser } = getState();
  const screen = el('div', { class: 'screen', style: 'display:flex; flex-direction:column; height:100vh;' });
  const messageList = el('div', { style: 'flex:1; overflow-y:auto; padding: 10px 0;' }, [
    el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })])
  ]);

  const textInput = el('input', { type: 'text', placeholder: 'Message\u2026' });
  const fileInput = el('input', { type: 'file', accept: 'image/*,video/*', class: 'visually-hidden' });
  const attachBtn = el('button', { class: 'icon-btn', type: 'button', title: 'Attach media' }, '\u{1F4CE}');
  attachBtn.addEventListener('click', () => fileInput.click());

  const sendForm = el(
    'form',
    { class: 'comment-compose' },
    [attachBtn, fileInput, textInput, el('button', { class: 'btn-ghost', type: 'submit' }, 'Send')]
  );

  const headerTitle = el('strong', {}, 'Chat');
  const audioCallBtn = el('button', { class: 'icon-btn', title: 'Audio call' }, '\u{1F4DE}');
  const videoCallBtn = el('button', { class: 'icon-btn', title: 'Video call' }, '\u{1F4F9}');

  screen.append(
    el('div', { class: 'topbar' }, [
      el('a', { href: '#/messages', class: 'icon-btn' }, '\u2190'),
      headerTitle,
      el('div', { class: 'topbar-actions' }, [audioCallBtn, videoCallBtn])
    ]),
    messageList,
    sendForm
  );
  container.replaceChildren(screen);

  let otherUser = null;

  try {
    const { conversation, messages } = await api.getChatHistory(conversationId);
    otherUser = conversation.isGroup ? null : conversation.participants.find((p) => p._id !== currentUser._id);
    headerTitle.textContent = conversation.isGroup ? conversation.groupName || 'Group chat' : otherUser?.username || 'Chat';

    audioCallBtn.addEventListener('click', () => (otherUser ? startCall(otherUser, false) : toast('Group calling not supported yet.', 'error')));
    videoCallBtn.addEventListener('click', () => (otherUser ? startCall(otherUser, true) : toast('Group calling not supported yet.', 'error')));

    renderMessages(messageList, messages, currentUser._id);
    await api.markConversationRead(conversationId);
  } catch (err) {
    messageList.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
    return;
  }

  // --- Realtime wiring ---
  const socket = getSocket();
  if (socket) {
    socket.emit('join-conversation', conversationId);

    const onReceive = ({ conversationId: incomingId, message }) => {
      if (incomingId !== conversationId) return;
      appendMessage(messageList, message, currentUser._id);
    };
    socket.on('receive-message', onReceive);

    let typingTimeout;
    textInput.addEventListener('input', () => {
      socket.emit('typing', { conversationId, isTyping: true });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => socket.emit('typing', { conversationId, isTyping: false }), 1500);
    });

    // Clean up listener when navigating away
    window.addEventListener(
      'hashchange',
      () => {
        socket.emit('leave-conversation', conversationId);
        socket.off('receive-message', onReceive);
      },
      { once: true }
    );
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('mediaType', file.type.startsWith('video') ? 'video' : 'image');
      const { message } = await api.sendMessage(conversationId, formData, true);
      appendMessage(messageList, message, currentUser._id);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      fileInput.value = '';
    }
  });

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    try {
      const { message } = await api.sendMessage(conversationId, { text });
      appendMessage(messageList, message, currentUser._id);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function renderMessages(container, messages, myId) {
  container.replaceChildren();
  if (messages.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' }, [el('p', {}, 'Say hello \u{1F44B}')]));
    return;
  }
  messages.forEach((m) => appendMessage(container, m, myId, false));
}

function appendMessage(container, message, myId, scroll = true) {
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const isMine = String(message.sender._id || message.sender) === String(myId);

  let content;
  if (message.mediaUrl && message.mediaType === 'video') {
    content = el('video', { src: message.mediaUrl, controls: 'true', style: 'max-width:220px; border-radius:12px;' });
  } else if (message.mediaUrl) {
    content = el('img', { src: message.mediaUrl, style: 'max-width:220px; border-radius:12px;', alt: 'Attachment' });
  } else {
    content = el(
      'span',
      {
        style: `display:inline-block; padding:8px 12px; border-radius:16px; background:${
          isMine ? 'var(--accent-gradient)' : 'var(--ink-800)'
        }; color:${isMine ? 'var(--ink-950)' : 'var(--paper-100)'};`
      },
      message.text
    );
  }

  const row = el(
    'div',
    { style: `display:flex; flex-direction:column; align-items:${isMine ? 'flex-end' : 'flex-start'}; padding:4px 14px;` },
    [content, el('span', { style: 'font-size:10px; color:var(--paper-500); margin-top:2px;' }, timeAgo(message.createdAt))]
  );
  container.appendChild(row);
  if (scroll) container.scrollTop = container.scrollHeight;
}
