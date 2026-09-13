import { api } from '../services/api.js';
import { el, toast } from '../utils.js';

export function openPostCreator({ onCreated }) {
  const overlay = el('div', { class: 'overlay' });
  let selectedFiles = [];

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/*,video/*',
    multiple: 'true',
    class: 'visually-hidden'
  });

  const previewGrid = el('div', { class: 'preview-grid' });
  const dropzone = el(
    'div',
    {
      class: 'dropzone',
      onclick: () => fileInput.click()
    },
    ['Tap to choose photos or videos']
  );

  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files).slice(0, 10);
    previewGrid.replaceChildren();

    if (selectedFiles.length === 0) {
      dropzone.classList.remove('has-files');
      dropzone.textContent = 'Tap to choose photos or videos';
      dropzone.appendChild(fileInput);
      return;
    }

    dropzone.classList.add('has-files');
    dropzone.replaceChildren(previewGrid, fileInput);

    selectedFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const media = file.type.startsWith('video')
        ? el('video', { src: url, muted: 'true' })
        : el('img', { src: url, alt: 'Selected media preview' });
      previewGrid.appendChild(media);
    });
  });
  dropzone.appendChild(fileInput);

  const captionInput = el('textarea', { placeholder: 'Write a caption\u2026 use #hashtags' });
  const locationInput = el('input', { type: 'text', placeholder: 'Add location (optional)' });
  const shareBtn = el('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Share');

  shareBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
      toast('Choose at least one photo or video first.', 'error');
      return;
    }

    shareBtn.disabled = true;
    shareBtn.textContent = 'Sharing\u2026';

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('media', file));
      formData.append('caption', captionInput.value.trim());
      formData.append('location', locationInput.value.trim());

      const { post } = await api.createPost(formData);
      toast('Post shared.', 'success');
      overlay.remove();
      onCreated?.(post);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      shareBtn.disabled = false;
      shareBtn.textContent = 'Share';
    }
  });

  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-header' }, [
      el('strong', {}, 'New post'),
      el('button', { class: 'btn-ghost', onclick: () => overlay.remove() }, 'Close')
    ]),
    el('div', { style: 'padding: 16px;' }, [
      dropzone,
      el('div', { class: 'field', style: 'margin-top:16px;' }, [el('label', {}, 'Caption'), captionInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Location'), locationInput]),
      shareBtn
    ])
  ]);

  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
