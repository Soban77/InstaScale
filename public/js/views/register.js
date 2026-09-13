import { api } from '../services/api.js';
import { persistSession } from '../state.js';
import { el, toast } from '../utils.js';
import { navigate } from '../app.js';

export function renderRegister(container) {
  const screen = el('div', { class: 'screen auth-screen' });

  const header = el('div', { class: 'auth-header' }, [
    el('span', { class: 'aperture' }),
    el('span', { class: 'wordmark' }, 'InstaScale'),
    el('span', { class: 'auth-tagline' }, 'Create your account.')
  ]);

  const fullNameInput = el('input', { type: 'text', placeholder: 'Full name' });
  const usernameInput = el('input', { type: 'text', placeholder: 'Username', autocomplete: 'username' });
  const emailInput = el('input', { type: 'email', placeholder: 'Email', autocomplete: 'email' });
  const passwordInput = el('input', {
    type: 'password',
    placeholder: 'Password (min. 8 characters)',
    autocomplete: 'new-password'
  });
  const errorText = el('p', { class: 'error-text visually-hidden' });
  const submitBtn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Sign up');

  const form = el(
    'form',
    {
      class: 'auth-card',
      onsubmit: async (e) => {
        e.preventDefault();
        errorText.classList.add('visually-hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account\u2026';

        try {
          const result = await api.register({
            fullName: fullNameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
          });
          persistSession(result);
          toast('Account created. Welcome to InstaScale.', 'success');
          navigate('/');
        } catch (err) {
          errorText.textContent = err.message;
          errorText.classList.remove('visually-hidden');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign up';
        }
      }
    },
    [
      el('div', { class: 'field' }, [el('label', {}, 'Full name'), fullNameInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Username'), usernameInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Email'), emailInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Password'), passwordInput]),
      errorText,
      submitBtn
    ]
  );

  const switchLine = el('p', { class: 'auth-switch' }, [
    'Already have an account? ',
    el('a', { href: '#/login' }, 'Log in')
  ]);

  screen.append(header, form, switchLine);
  container.replaceChildren(screen);
}
