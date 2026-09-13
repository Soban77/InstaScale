import { api } from '../services/api.js';
import { getState, setState } from '../state.js';
import { el, toast } from '../utils.js';
import { navigate } from '../app.js';

export function renderEditProfile(container) {
  const { currentUser } = getState();
  const screen = el('div', { class: 'screen' });

  const avatarPreview = el('img', { class: 'avatar', style: 'width:76px; height:76px;', src: currentUser.profilePic, alt: 'Avatar' });
  const avatarInput = el('input', { type: 'file', accept: 'image/*', class: 'visually-hidden' });
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (file) avatarPreview.src = URL.createObjectURL(file);
  });

  const fullNameInput = el('input', { type: 'text', value: currentUser.fullName || '' });
  const bioInput = el('textarea', {}, currentUser.bio || '');
  const privateToggle = el('input', { type: 'checkbox', ...(currentUser.isPrivate ? { checked: 'true' } : {}) });
  const businessToggle = el('input', { type: 'checkbox', ...(currentUser.isBusiness ? { checked: 'true' } : {}) });

  const saveBtn = el('button', { class: 'btn btn-primary btn-block' }, 'Save changes');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving\u2026';
    try {
      const formData = new FormData();
      formData.append('fullName', fullNameInput.value.trim());
      formData.append('bio', bioInput.value.trim());
      formData.append('isPrivate', privateToggle.checked);
      formData.append('isBusiness', businessToggle.checked);
      if (avatarInput.files[0]) formData.append('avatar', avatarInput.files[0]);

      const { user } = await api.updateProfile(formData);
      setState({ currentUser: user });
      toast('Profile updated.', 'success');
      navigate(`/profile/${user.username}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  screen.append(
    el('div', { class: 'topbar' }, [
      el('a', { href: `#/profile/${currentUser.username}`, class: 'icon-btn' }, '\u2190'),
      el('strong', {}, 'Edit profile')
    ]),
    el('div', { style: 'padding:20px 16px;' }, [
      el('div', { style: 'display:flex; align-items:center; gap:16px; margin-bottom:20px;', onclick: () => avatarInput.click() }, [
        avatarPreview,
        el('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => avatarInput.click() }, 'Change photo'),
        avatarInput
      ]),
      el('div', { class: 'field' }, [el('label', {}, 'Full name'), fullNameInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Bio'), bioInput]),
      el('div', { class: 'field', style: 'flex-direction:row; align-items:center; gap:10px;' }, [privateToggle, el('label', {}, 'Private account')]),
      el('div', { class: 'field', style: 'flex-direction:row; align-items:center; gap:10px;' }, [businessToggle, el('label', {}, 'Business account')]),
      saveBtn
    ])
  );

  container.replaceChildren(screen);
}
