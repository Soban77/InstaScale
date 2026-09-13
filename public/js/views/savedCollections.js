import { api } from '../services/api.js';
import { el, toast } from '../utils.js';

export async function renderSaved(container) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/profile', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Saved')]), body);
  container.replaceChildren(screen);

  try {
    const { savedPosts, collections } = await api.getCollections();

    const allGrid = el(
      'div',
      { class: 'preview-grid', style: 'padding:8px;' },
      savedPosts.map((p) => el('img', { src: p.mediaUrls[0], alt: 'Saved post', style: 'border-radius:8px;' }))
    );

    const newCollectionInput = el('input', { type: 'text', placeholder: 'New collection name' });
    const createBtn = el('button', { class: 'btn btn-secondary btn-sm' }, 'Create');
    createBtn.addEventListener('click', async () => {
      const name = newCollectionInput.value.trim();
      if (!name) return;
      try {
        await api.createCollection(name);
        toast('Collection created.', 'success');
        renderSaved(container);
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    const collectionSections = collections.map((c) =>
      el('div', { style: 'padding:16px;' }, [
        el('h3', { style: 'margin-bottom:8px;' }, `${c.name} (${c.posts.length})`),
        el(
          'div',
          { class: 'preview-grid' },
          c.posts.map((p) => el('img', { src: p.mediaUrls[0], alt: c.name, style: 'border-radius:8px;' }))
        )
      ])
    );

    body.replaceWith(
      el('div', {}, [
        el('h3', { style: 'padding:16px 16px 0;' }, 'All saved'),
        savedPosts.length > 0 ? allGrid : el('div', { class: 'empty-state' }, [el('p', {}, 'Nothing saved yet.')]),
        ...collectionSections,
        el('div', { style: 'padding:16px; display:flex; gap:8px; border-top:1px solid var(--ink-800);' }, [
          newCollectionInput,
          createBtn
        ])
      ])
    );
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
