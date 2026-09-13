import { getState } from '../state.js';
import { el } from '../utils.js';

export function renderBottomNav(activeKey) {
  const { currentUser } = getState();

  const items = [
    { key: 'home', href: '#/', icon: '\u2302' },
    { key: 'search', href: '#/search', icon: '\u{1F50D}' },
    { key: 'reels', href: '#/reels', icon: '\u25B6' },
    { key: 'profile', href: `#/profile/${currentUser?.username || ''}`, icon: null }
  ];

  return el(
    'nav',
    { class: 'bottom-nav' },
    items.map((item) =>
      el(
        'a',
        { href: item.href, class: `nav-item ${item.key === activeKey ? 'active' : ''}` },
        item.icon || el('img', { class: 'avatar-sm', src: currentUser?.profilePic, alt: 'Profile' })
      )
    )
  );
}
