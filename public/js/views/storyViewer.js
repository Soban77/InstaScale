import { api } from '../services/api.js';
import { el, toast, timeLeft } from '../utils.js';

const STORY_DURATION_MS = 5000;

export function openStoryViewer(storyGroups, startGroupIndex = 0) {
  let groupIndex = startGroupIndex;
  let storyIndex = 0;
  let timer = null;

  const overlay = el('div', { class: 'story-viewer' });
  document.body.appendChild(overlay);

  function currentGroup() {
    return storyGroups[groupIndex];
  }
  function currentStory() {
    return currentGroup()?.stories[storyIndex];
  }

  function close() {
    clearTimeout(timer);
    overlay.remove();
  }

  function goToStory(nextGroupIndex, nextStoryIndex) {
    clearTimeout(timer);

    if (nextGroupIndex < 0) return; // no-op at the very start
    if (nextGroupIndex >= storyGroups.length) {
      close();
      return;
    }

    const group = storyGroups[nextGroupIndex];
    if (nextStoryIndex >= group.stories.length) {
      goToStory(nextGroupIndex + 1, 0);
      return;
    }
    if (nextStoryIndex < 0) {
      const prevGroup = storyGroups[nextGroupIndex - 1];
      if (!prevGroup) return;
      goToStory(nextGroupIndex - 1, prevGroup.stories.length - 1);
      return;
    }

    groupIndex = nextGroupIndex;
    storyIndex = nextStoryIndex;
    render();
  }

  function render() {
    const group = currentGroup();
    const story = currentStory();
    if (!group || !story) return close();

    api.markStoryViewed(story._id).catch(() => {});

    const progressBars = group.stories.map((_, i) =>
      el('div', { class: 'bar' }, [el('div', { class: `bar-fill ${i < storyIndex ? 'complete' : ''}` })])
    );
    const activeBar = progressBars[storyIndex].firstChild;

    const media = story.mediaType === 'video'
      ? el('video', { src: story.mediaUrl, autoplay: 'true', playsinline: 'true' })
      : el('img', { src: story.mediaUrl, alt: 'Story' });

    overlay.replaceChildren(
      el('div', { class: 'story-progress' }, progressBars),
      el('div', { class: 'story-viewer-header' }, [
        el('img', { class: 'avatar', src: group.user.profilePic, alt: group.user.username }),
        el('strong', {}, group.user.username),
        el('span', { style: 'color:var(--paper-500); font-size:12px;' }, timeLeft(story.createdAt)),
        el('button', { class: 'btn-ghost', style: 'margin-left:auto;', onclick: close }, '\u2715')
      ]),
      el('div', { class: 'story-viewer-media-wrap' }, [
        media,
        el('div', { class: 'story-tap-zone left', onclick: () => goToStory(groupIndex, storyIndex - 1) }),
        el('div', { class: 'story-tap-zone right', onclick: () => goToStory(groupIndex, storyIndex + 1) })
      ])
    );

    requestAnimationFrame(() => {
      activeBar.style.transition = `width ${STORY_DURATION_MS}ms linear`;
      activeBar.style.width = '100%';
    });

    timer = setTimeout(() => goToStory(groupIndex, storyIndex + 1), STORY_DURATION_MS);
  }

  render();
}

export function openStoryCreator({ onCreated }) {
  const overlay = el('div', { class: 'overlay centered' });
  const fileInput = el('input', { type: 'file', accept: 'image/*,video/*' });
  const preview = el('div', { style: 'margin: 14px 0;' });
  const shareBtn = el('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Share to story');
  let selectedFile = null;

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files[0];
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const media = selectedFile.type.startsWith('video')
      ? el('video', { src: url, muted: 'true', style: 'width:100%;border-radius:12px;' })
      : el('img', { src: url, style: 'width:100%;border-radius:12px;', alt: 'Story preview' });
    preview.replaceChildren(media);
  });

  shareBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      toast('Choose a photo or video first.', 'error');
      return;
    }
    shareBtn.disabled = true;
    try {
      const formData = new FormData();
      formData.append('media', selectedFile);
      const { story } = await api.createStory(formData);
      toast('Story posted. It disappears in 24h.', 'success');
      overlay.remove();
      onCreated?.(story);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      shareBtn.disabled = false;
    }
  });

  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-header' }, [
      el('strong', {}, 'New story'),
      el('button', { class: 'btn-ghost', onclick: () => overlay.remove() }, 'Close')
    ]),
    el('div', { style: 'padding:16px;' }, [fileInput, preview, shareBtn])
  ]);

  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
