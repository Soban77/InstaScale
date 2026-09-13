import { api } from '../services/api.js';
import { el, toast } from '../utils.js';

export async function renderArchive(container) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/profile', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Archive')]), body);
  container.replaceChildren(screen);

  try {
    const { posts } = await api.getArchive();

    if (posts.length === 0) {
      body.replaceWith(el('div', { class: 'empty-state' }, [el('h3', {}, 'Nothing archived'), el('p', {}, 'Posts you archive from your profile show up here, hidden from everyone else.')]));
      return;
    }

    const grid = el(
      'div',
      { class: 'preview-grid', style: 'padding:8px;' },
      posts.map((p) => {
        const unarchiveBtn = el('button', { class: 'btn-sm btn-secondary', style: 'position:absolute; bottom:4px; right:4px; font-size:10px;' }, 'Restore');
        unarchiveBtn.addEventListener('click', async () => {
          try {
            await api.toggleArchivePost(p._id);
            toast('Post restored to your profile.', 'success');
            renderArchive(container);
          } catch (err) {
            toast(err.message, 'error');
          }
        });
        return el('div', { style: 'position:relative;' }, [
          el('img', { src: p.mediaUrls[0], alt: 'Archived post', style: 'width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px;' }),
          unarchiveBtn
        ]);
      })
    );

    body.replaceWith(grid);
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
