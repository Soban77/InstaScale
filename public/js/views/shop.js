import { api } from '../services/api.js';
import { el, toast } from '../utils.js';
import { renderBottomNav } from './nav.js';

function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export async function renderShop(container) {
  const screen = el('div', { class: 'screen' });
  const grid = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);

  screen.append(
    el('div', { class: 'topbar' }, [
      el('strong', {}, 'Shop'),
      el('a', { href: '#/shop/cart', class: 'icon-btn' }, '\u{1F6D2}')
    ]),
    grid,
    renderBottomNav('shop')
  );
  container.replaceChildren(screen);

  try {
    const { products } = await api.getProducts();
    if (products.length === 0) {
      grid.replaceWith(el('div', { class: 'empty-state' }, [el('h3', {}, 'No products yet'), el('p', {}, 'Sellers can list products via the API.')]));
      return;
    }
    grid.replaceWith(
      el(
        'div',
        { class: 'preview-grid', style: 'padding:8px;' },
        products.map((p) =>
          el('a', { href: `#/shop/product/${p._id}`, style: 'position:relative; text-decoration:none;' }, [
            el('img', { src: p.images[0], alt: p.title, style: 'width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px;' }),
            el(
              'div',
              { style: 'font-size:12px; color:var(--paper-100); margin-top:4px;' },
              `${p.title} \u00b7 ${formatPrice(p.priceCents, p.currency)}`
            )
          ])
        )
      )
    );
  } catch (err) {
    grid.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

export async function renderProductDetail(container, productId) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/shop', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Product')]), body);
  container.replaceChildren(screen);

  try {
    const { product } = await api.getProduct(productId);
    const addBtn = el('button', { class: 'btn btn-primary btn-block' }, 'Add to cart');
    addBtn.addEventListener('click', async () => {
      try {
        await api.addToCart(product._id, 1);
        toast('Added to cart.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    body.replaceWith(
      el('div', {}, [
        el('img', { src: product.images[0], alt: product.title, style: 'width:100%; aspect-ratio:1; object-fit:cover;' }),
        el('div', { style: 'padding:16px;' }, [
          el('h2', {}, product.title),
          el('p', { style: 'color:var(--accent-amber); font-weight:600; margin:8px 0;' }, formatPrice(product.priceCents, product.currency)),
          el('p', { style: 'color:var(--paper-300); margin-bottom:16px;' }, product.description),
          el('p', { style: 'font-size:12px; color:var(--paper-500); margin-bottom:16px;' }, `Sold by @${product.seller.username} \u00b7 ${product.inventory} in stock`),
          addBtn
        ])
      ])
    );
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}
