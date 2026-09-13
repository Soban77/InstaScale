import { api } from '../services/api.js';
import { getState, persistSession } from '../state.js';
import { el, toast } from '../utils.js';
import { navigate } from '../app.js';

export function renderTwoFactor(container) {
  const { pendingTwoFactorUserId } = getState();

  if (!pendingTwoFactorUserId) {
    navigate('/login');
    return;
  }

  const screen = el('div', { class: 'screen auth-screen' });

  const header = el('div', { class: 'auth-header' }, [
    el('span', { class: 'aperture' }),
    el('span', { class: 'wordmark' }, 'Verify it\u2019s you'),
    el('span', { class: 'auth-tagline' }, 'Enter the 6-digit code we sent.')
  ]);

  const otpInput = el('input', {
    type: 'text',
    inputmode: 'numeric',
    maxlength: '6',
    placeholder: '000000'
  });
  const errorText = el('p', { class: 'error-text visually-hidden' });
  const submitBtn = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Verify');

  const form = el(
    'form',
    {
      class: 'auth-card',
      onsubmit: async (e) => {
        e.preventDefault();
        errorText.classList.add('visually-hidden');
        submitBtn.disabled = true;

        try {
          const result = await api.verify2FA({
            userId: pendingTwoFactorUserId,
            otp: otpInput.value.trim()
          });
          persistSession(result);
          toast('Verified. Welcome back.', 'success');
          navigate('/');
        } catch (err) {
          errorText.textContent = err.message;
          errorText.classList.remove('visually-hidden');
        } finally {
          submitBtn.disabled = false;
        }
      }
    },
    [el('div', { class: 'field' }, [el('label', {}, 'One-time code'), otpInput]), errorText, submitBtn]
  );

  screen.append(header, form);
  container.replaceChildren(screen);
}
