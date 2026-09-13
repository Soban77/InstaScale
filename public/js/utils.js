export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  });
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export function toast(message, type = 'default', duration = 3000) {
  const root = document.getElementById('toast-root');
  const node = el('div', { class: `toast ${type}` }, message);
  root.appendChild(node);
  setTimeout(() => node.remove(), duration);
}

export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  const units = [
    ['y', 31536000],
    ['w', 604800],
    ['d', 86400],
    ['h', 3600],
    ['m', 60]
  ];
  for (const [label, secs] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return 'just now';
}

export function timeLeft(createdAt, ttlSeconds = 86400) {
  const expiresAt = new Date(createdAt).getTime() + ttlSeconds * 1000;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 'expired';
  const hours = Math.floor(remainingMs / 3600000);
  return `${hours}h left`;
}
