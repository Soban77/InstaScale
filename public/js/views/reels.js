import { api } from '../services/api.js';
import { el } from '../utils.js';
import { renderBottomNav } from './nav.js';

export async function renderReels(container) {
  const screen = el('div', { class: 'screen' });
  const list = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('strong', {}, 'Reels')]), list, renderBottomNav('reels'));
  container.replaceChildren(screen);

  try {
    const { reels } = await api.getReels(1);
    if (reels.length === 0) {
      list.replaceWith(
        el('div', { class: 'empty-state' }, [
          el('h3', {}, 'No reels yet'),
          el('p', {}, 'Reels posted with mediaType "reel" will show up here.')
        ])
      );
      return;
    }
    list.replaceWith(
      el(
        'div',
        {},
        reels.map((reel) =>
          el('div', { style: 'border-bottom:1px solid var(--ink-800);' }, [
            el('video', {
              src: reel.mediaUrls[0],
              controls: 'true',
              playsinline: 'true',
              style: 'width:100%; aspect-ratio:9/16; object-fit:cover;'
            }),
            el('div', { class: 'post-meta' }, [
              el('span', { class: 'caption-author' }, reel.author.username),
              reel.caption || ''
            ])
          ])
        )
      )
    );
  } catch (err) {
    list.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
