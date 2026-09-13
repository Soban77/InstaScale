import { api } from '../services/api.js';
import { getState, clearSession } from '../state.js';
import { el, toast } from '../utils.js';
import { renderBottomNav } from './nav.js';
import { navigate } from '../app.js';

export async function renderProfile(container, username) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(body, renderBottomNav('profile'));
  container.replaceChildren(screen);

  try {
    const { profile, posts, isOwner, isFollowing } = await api.getProfile(username);

    const actionBtn = isOwner
      ? el('a', { href: '#/profile/edit', class: 'btn btn-secondary btn-sm' }, 'Edit profile')
      : el(
          'button',
          { class: `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`, onclick: onToggleFollow },
          isFollowing ? 'Following' : 'Follow'
        );

    const messageBtn = isOwner
      ? null
      : el('button', { class: 'btn btn-secondary btn-sm', onclick: onMessage }, 'Message');

    async function onToggleFollow() {
      try {
        const res = await api.toggleFollow(profile._id);
        actionBtn.textContent = res.following ? 'Following' : res.requested ? 'Requested' : 'Follow';
        actionBtn.className = `btn btn-sm ${res.following ? 'btn-secondary' : 'btn-primary'}`;
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    async function onMessage() {
      try {
        const { conversation } = await api.startConversation({ recipientId: profile._id });
        navigate(`/chat/${conversation._id}`);
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    const grid = el(
      'div',
      { class: 'preview-grid', style: 'padding:0 2px;' },
      posts.map((post) => el('img', { src: post.mediaUrls[0], alt: post.caption || 'Post', loading: 'lazy' }))
    );

    body.replaceWith(
      el('div', {}, [
        el('div', { class: 'topbar' }, [el('strong', {}, profile.username)]),
        el('div', { style: 'padding:20px 16px; display:flex; gap:16px; align-items:center;' }, [
          el('img', { class: 'avatar', style: 'width:76px;height:76px;', src: profile.profilePic, alt: profile.username }),
          el('div', { style: 'flex:1;' }, [
            el('div', { style: 'display:flex; gap:20px; font-size:14px; margin-bottom:10px;' }, [
              el('div', {}, [el('strong', {}, String(posts.length)), ' posts']),
              el('a', { href: `#/profile/${profile.username}/followers`, style: 'color:inherit;' }, [
                el('strong', {}, String(profile.followersCount)),
                ' followers'
              ]),
              el('a', { href: `#/profile/${profile.username}/following`, style: 'color:inherit;' }, [
                el('strong', {}, String(profile.followingCount)),
                ' following'
              ])
            ]),
            el('div', { style: 'display:flex; gap:8px;' }, [actionBtn, messageBtn])
          ])
        ]),
        profile.fullName ? el('div', { style: 'padding:0 16px; font-weight:600;' }, profile.fullName) : null,
        profile.bio ? el('div', { style: 'padding:4px 16px 16px; color:var(--paper-300);' }, profile.bio) : null,
        isOwner ? renderOwnerMenu() : null,
        posts.length > 0 ? grid : el('div', { class: 'empty-state' }, [el('h3', {}, 'No posts yet')])
      ])
    );
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function renderOwnerMenu() {
  const { currentUser } = getState();

  const links = [
    { href: '#/saved', label: 'Saved', icon: '\u{1F516}' },
    { href: '#/archive', label: 'Archive', icon: '\u{1F5C3}' },
    { href: '#/creator/dashboard', label: 'Creator dashboard', icon: '\u{1F4CA}' },
    { href: '#/shop', label: 'Shop', icon: '\u{1F6CD}' }
  ];
  if (currentUser.isAdmin) {
    links.push({ href: '#/admin', label: 'Admin panel', icon: '\u{1F6E1}' });
  }

  async function onLogout() {
    api.logout().finally(() => {
      clearSession();
      toast('Logged out.', 'success');
      navigate('/login');
    });
  }

  const logoutBtn = el(
    'button',
    {
      style:
        'display:flex; flex-direction:column; align-items:center; gap:4px; font-size:11px; color:var(--danger); flex-shrink:0; background:none; border:none;',
      onclick: onLogout
    },
    [el('span', { style: 'font-size:20px;' }, '\u21AA'), 'Log out']
  );

  return el(
    'div',
    { style: 'display:flex; gap:16px; overflow-x:auto; padding:0 16px 16px; border-bottom:1px solid var(--ink-800);' },
    [
      ...links.map((l) =>
        el(
          'a',
          {
            href: l.href,
            style:
              'display:flex; flex-direction:column; align-items:center; gap:4px; font-size:11px; color:var(--paper-300); flex-shrink:0;'
          },
          [el('span', { style: 'font-size:20px;' }, l.icon), l.label]
        )
      ),
      logoutBtn
    ]
  );
}
