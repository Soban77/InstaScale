import { api } from '../services/api.js';
import { el } from '../utils.js';

export async function renderFollowList(container, userId, kind) {
  const screen = el('div', { class: 'screen' });
  const list = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);

  screen.append(
    el('div', { class: 'topbar' }, [
      el('button', { class: 'icon-btn', onclick: () => window.history.back() }, '\u2190'),
      el('strong', {}, kind === 'followers' ? 'Followers' : 'Following')
    ]),
    list
  );
  container.replaceChildren(screen);

  try {
    const data = kind === 'followers' ? await api.getFollowers(userId) : await api.getFollowing(userId);
    const users = kind === 'followers' ? data.followers : data.following;

    if (users.length === 0) {
      list.replaceChildren(el('div', { class: 'empty-state' }, [el('h3', {}, `No ${kind} yet`)]));
      return;
    }

    list.replaceChildren(
      ...users.map((u) =>
        el('a', { href: `#/profile/${u.username}`, class: 'post-header', style: 'text-decoration:none;' }, [
          el('img', { class: 'avatar', src: u.profilePic, alt: u.username }),
          el('div', {}, [el('div', { class: 'post-author' }, u.username), el('div', { class: 'post-location' }, u.fullName || '')])
        ])
      )
    );
  } catch (err) {
    list.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
