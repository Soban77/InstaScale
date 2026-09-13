import { api } from '../services/api.js';
import { persistSession, setState } from '../state.js';
import { el, toast } from '../utils.js';
import { navigate } from '../app.js';

export function renderLogin(container) {
  const screen = el('div', { class: 'screen auth-screen' });

  const header = el('div', { class: 'auth-header' }, [
    el('span', { class: 'aperture' }),
    el('span', { class: 'wordmark' }, 'InstaScale'),
    el('span', { class: 'auth-tagline' }, 'Every frame, developed in the open.')
  ]);

  const identifierInput = el('input', { type: 'text', placeholder: 'Username or email', autocomplete: 'username' });
  const passwordInput = el('input', {
    type: 'password',
    placeholder: 'Password',
    autocomplete: 'current-password'
  });
  const errorText = el('p', { class: 'error-text visually-hidden' });
  const submitBtn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Log in');

  const form = el(
    'form',
    {
      class: 'auth-card',
      onsubmit: async (e) => {
        e.preventDefault();
        errorText.classList.add('visually-hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in\u2026';

        try {
          const result = await api.login({
            identifier: identifierInput.value.trim(),
            password: passwordInput.value
          });

          if (result.requires2FA) {
            setState({ pendingTwoFactorUserId: result.userId });
            navigate('/2fa');
            return;
          }

          persistSession(result);
          toast('Welcome back.', 'success');
          navigate('/');
        } catch (err) {
          errorText.textContent = err.message;
          errorText.classList.remove('visually-hidden');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log in';
        }
      }
    },
    [
      el('div', { class: 'field' }, [el('label', {}, 'Username or email'), identifierInput]),
      el('div', { class: 'field' }, [el('label', {}, 'Password'), passwordInput]),
      errorText,
      submitBtn
    ]
  );

  const switchLine = el('p', { class: 'auth-switch' }, [
    "Don't have an account? ",
    el('a', { href: '#/register' }, 'Sign up')
  ]);

  screen.append(header, form, switchLine);
  container.replaceChildren(screen);
}
