import { api } from '../services/api.js';
import { el, toast } from '../utils.js';
import { navigate } from '../app.js';

function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export async function renderCart(container) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/shop', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Your cart')]), body);
  container.replaceChildren(screen);

  async function load() {
    try {
      const { items, totalCents } = await api.getCart();

      if (items.length === 0) {
        body.replaceChildren(el('div', { class: 'empty-state' }, [el('h3', {}, 'Your cart is empty')]));
        return;
      }

      const rows = items.map((item) => {
        const removeBtn = el('button', { class: 'btn-ghost', style: 'color:var(--danger);' }, 'Remove');
        removeBtn.addEventListener('click', async () => {
          await api.removeFromCart(item.product._id);
          load();
        });
        return el('div', { class: 'post-header' }, [
          el('img', { class: 'avatar', style: 'border-radius:6px;', src: item.product.images[0], alt: item.product.title }),
          el('div', { style: 'flex:1;' }, [
            el('div', { class: 'post-author' }, item.product.title),
            el('div', { class: 'post-location' }, `Qty ${item.quantity} \u00b7 ${formatPrice(item.product.priceCents, item.product.currency)}`)
          ]),
          removeBtn
        ]);
      });

      const checkoutBtn = el('button', { class: 'btn btn-primary btn-block' }, `Checkout \u00b7 ${formatPrice(totalCents)}`);
      checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing\u2026';
        try {
          const { order } = await api.checkout();
          toast('Order placed! (payment mocked)', 'success');
          navigate('/shop');
        } catch (err) {
          toast(err.message, 'error');
          checkoutBtn.disabled = false;
        }
      });

      body.replaceChildren(el('div', {}, rows), el('div', { style: 'padding:16px;' }, [checkoutBtn]));
    } catch (err) {
      body.replaceChildren(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
    }
  }

  load();
}
