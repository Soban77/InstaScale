import { api } from '../services/api.js';
import { el } from '../utils.js';
import { renderBottomNav } from './nav.js';

export function renderSearch(container) {
  const screen = el('div', { class: 'screen' });
  const input = el('input', { type: 'text', placeholder: 'Search accounts', style: 'width:100%;' });
  const results = el('div', {});
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const q = input.value.trim();
      if (!q) {
        results.replaceChildren();
        return;
      }
      const { users } = await api.searchUsers(q);
      results.replaceChildren(
        ...users.map((u) =>
          el('a', { href: `#/profile/${u.username}`, class: 'post-header', style: 'text-decoration:none;' }, [
            el('img', { class: 'avatar', src: u.profilePic, alt: u.username }),
            el('div', {}, [
              el('div', { class: 'post-author' }, u.username),
              el('div', { class: 'post-location' }, u.fullName || '')
            ])
          ])
        )
      );
      if (users.length === 0) {
        results.replaceChildren(el('div', { class: 'empty-state' }, [el('p', {}, 'No accounts found.')]));
      }
    }, 300);
  });

  screen.append(
    el('div', { class: 'topbar' }, [el('div', { class: 'field', style: 'margin:0; width:100%;' }, [input])]),
    results,
    renderBottomNav('search')
  );
  container.replaceChildren(screen);
}
