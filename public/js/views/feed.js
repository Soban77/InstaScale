import { api } from '../services/api.js';
import { getState } from '../state.js';
import { el, toast, timeAgo } from '../utils.js';
import { openPostCreator } from './postCreator.js';
import { openStoryViewer, openStoryCreator } from './storyViewer.js';
import { renderBottomNav } from './nav.js';

export async function renderFeed(container) {
  const { currentUser } = getState();
  const screen = el('div', { class: 'screen' });

  const topbar = el('div', { class: 'topbar' }, [
    el('span', { class: 'wordmark' }, 'InstaScale'),
    el('div', { class: 'topbar-actions' }, [
      el('a', { href: '#/shop', class: 'icon-btn', title: 'Shop' }, '\u{1F6CD}'),
      el('a', { href: '#/messages', class: 'icon-btn', title: 'Messages' }, '\u2708'),
      el('button', {
        class: 'icon-btn',
        title: 'New post',
        onclick: () => openPostCreator({ onCreated: (post) => postList.prepend(renderPostCard(post)) })
      }, '\u2795')
    ])
  ]);

  const storyBarWrap = el('div', {}, [el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })])]);
  const postList = el('div', {});
  const loadingPosts = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);

  screen.append(topbar, storyBarWrap, postList, renderBottomNav('home'));
  container.replaceChildren(screen);
  postList.replaceChildren(loadingPosts);

  // --- Load stories ---
  try {
    const { storyGroups } = await api.getStoryFeed();
    storyBarWrap.replaceChildren(renderStoryBar(storyGroups, currentUser));
  } catch (err) {
    storyBarWrap.replaceChildren();
  }

  // --- Load feed ---
  try {
    const { posts } = await api.getFeed(1);
    postList.replaceChildren();
    if (posts.length === 0) {
      postList.appendChild(
        el('div', { class: 'empty-state' }, [
          el('span', { class: 'aperture' }),
          el('h3', {}, 'Your feed is empty'),
          el('p', {}, 'Follow people to see their photos and videos here.')
        ])
      );
    } else {
      posts.forEach((post) => postList.appendChild(renderPostCard(post)));
    }
  } catch (err) {
    postList.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function renderStoryBar(storyGroups, currentUser) {
  const ownGroupIndex = storyGroups.findIndex((g) => String(g.user._id) === String(currentUser._id));

  const selfItem = el(
    'button',
    { class: 'story-item self', onclick: () => (ownGroupIndex >= 0 ? openStoryViewer(storyGroups, ownGroupIndex) : openCreator()) },
    [
      el('div', { class: 'story-ring', style: 'position:relative;' }, [
        el('img', { src: currentUser.profilePic, alt: 'Your story' }),
        el('span', { class: 'story-plus', onclick: (e) => { e.stopPropagation(); openCreator(); } }, '+')
      ]),
      el('span', {}, 'Your story')
    ]
  );

  function openCreator() {
    openStoryCreator({ onCreated: () => location.reload() });
  }

  const otherGroups = storyGroups.filter((g) => String(g.user._id) !== String(currentUser._id));

  const items = otherGroups.map((group, i) => {
    const realIndex = storyGroups.indexOf(group);
    return el(
      'button',
      { class: 'story-item', onclick: () => openStoryViewer(storyGroups, realIndex) },
      [
        el('div', { class: 'story-ring unseen' }, [el('img', { src: group.user.profilePic, alt: group.user.username })]),
        el('span', {}, group.user.username)
      ]
    );
  });

  return el('div', { class: 'story-bar' }, [selfItem, ...items]);
}

function renderPostCard(post) {
  const currentUser = getState().currentUser;
  const isLiked = post.likes?.some((id) => String(id) === String(currentUser._id) || String(id._id) === String(currentUser._id));

  const likeBtn = el('button', { class: isLiked ? 'liked' : '', onclick: onToggleLike }, isLiked ? '\u2665' : '\u2661');
  const likesCountEl = el('div', { class: 'likes-count' }, `${post.likes?.length || 0} likes`);
  const commentsLink = el('div', { class: 'post-comments-link', onclick: () => openComments(post) }, `View all ${post.commentsCount || 0} comments`);

  async function onToggleLike() {
    try {
      const { liked, likesCount } = await api.toggleLike(post._id);
      likeBtn.textContent = liked ? '\u2665' : '\u2661';
      likeBtn.classList.toggle('liked', liked);
      likesCountEl.textContent = `${likesCount} likes`;
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const mediaEls = post.mediaUrls.map((url) =>
    /\.(mp4|mov|webm)$/i.test(url)
      ? el('video', { class: 'post-media', src: url, controls: 'true', playsinline: 'true' })
      : el('img', { class: 'post-media', src: url, alt: post.caption || 'Post media' })
  );

  const card = el('article', { class: 'post-card' }, [
    el('div', { class: 'post-header' }, [
      el('img', { class: 'avatar', src: post.author.profilePic, alt: post.author.username }),
      el('div', {}, [
        el('div', { class: 'post-author' }, post.author.username),
        post.location ? el('div', { class: 'post-location' }, post.location) : null
      ])
    ]),
    mediaEls[0],
    el('div', { class: 'post-actions' }, [
      likeBtn,
      el('button', { onclick: () => openComments(post) }, '\u{1F4AC}'),
      el('button', {}, '\u27A1')
    ]),
    el('div', { class: 'post-meta' }, [
      likesCountEl,
      post.caption
        ? el('div', { class: 'post-caption' }, [el('span', { class: 'caption-author' }, post.author.username), post.caption])
        : null,
      commentsLink,
      el('div', { class: 'post-timestamp' }, timeAgo(post.createdAt))
    ])
  ]);

  return card;
}

function openComments(post) {
  const overlay = el('div', { class: 'overlay' });
  const commentList = el('div', {}, [el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })])]);
  const input = el('input', { type: 'text', placeholder: 'Add a comment\u2026' });
  const postBtn = el('button', { class: 'btn-ghost', type: 'submit' }, 'Post');

  const form = el(
    'form',
    {
      class: 'comment-compose',
      onsubmit: async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        try {
          const { comment } = await api.addComment(post._id, text);
          commentList.appendChild(renderCommentRow(comment));
          input.value = '';
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    },
    [input, postBtn]
  );

  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-header' }, [
      el('strong', {}, 'Comments'),
      el('button', { class: 'btn-ghost', onclick: () => overlay.remove() }, 'Close')
    ]),
    commentList,
    form
  ]);

  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  api
    .getComments(post._id)
    .then(({ comments }) => {
      commentList.replaceChildren();
      if (comments.length === 0) {
        commentList.appendChild(el('div', { class: 'empty-state' }, [el('p', {}, 'No comments yet.')]));
        return;
      }
      comments.forEach((c) => commentList.appendChild(renderCommentRow(c)));
    })
    .catch((err) => {
      commentList.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
    });
}

function renderCommentRow(comment) {
  return el('div', { class: 'comment-row' }, [
    el('img', { class: 'avatar', src: comment.author.profilePic, alt: comment.author.username }),
    el('div', { class: 'comment-text' }, [
      el('span', { class: 'comment-author' }, comment.author.username),
      comment.text
    ])
  ]);
}
