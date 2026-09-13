import { api } from '../services/api.js';
import { el, toast } from '../utils.js';
import { getState } from '../state.js';
import { navigate } from '../app.js';

export async function renderMessageRequests(container) {
  const screen = el('div', { class: 'screen' });
  const list = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);

  screen.append(
    el('div', { class: 'topbar' }, [
      el('a', { href: '#/messages', class: 'icon-btn' }, '\u2190'),
      el('strong', {}, 'Message requests')
    ]),
    list
  );
  container.replaceChildren(screen);

  try {
    const { requests } = await api.getConversations();
    list.replaceChildren();

    if (requests.length === 0) {
      list.appendChild(el('div', { class: 'empty-state' }, [el('h3', {}, 'No pending requests')]));
      return;
    }

    const { currentUser } = getState();
    requests.forEach((conversation) => {
      const other = conversation.participants.find((p) => p._id !== currentUser._id);
      const acceptBtn = el('button', { class: 'btn btn-primary btn-sm' }, 'Accept');
      const declineBtn = el('button', { class: 'btn btn-secondary btn-sm' }, 'Decline');

      acceptBtn.addEventListener('click', async () => {
        try {
          await api.acceptMessageRequest(conversation._id);
          navigate(`/chat/${conversation._id}`);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      declineBtn.addEventListener('click', async () => {
        try {
          await api.declineMessageRequest(conversation._id);
          row.remove();
        } catch (err) {
          toast(err.message, 'error');
        }
      });

      const row = el('div', { class: 'post-header' }, [
        el('img', { class: 'avatar', src: other?.profilePic, alt: other?.username }),
        el('div', { style: 'flex:1;' }, [el('div', { class: 'post-author' }, other?.username || 'Unknown')]),
        el('div', { style: 'display:flex; gap:8px;' }, [acceptBtn, declineBtn])
      ]);
      list.appendChild(row);
    });
  } catch (err) {
    list.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
