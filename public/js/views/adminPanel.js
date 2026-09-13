import { api } from '../services/api.js';
import { el, toast } from '../utils.js';

export async function renderAdminPanel(container) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/profile', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Admin panel')]), body);
  container.replaceChildren(screen);

  try {
    const [insights, { reports }] = await Promise.all([api.getPlatformInsights(), api.getAdminReports('open')]);

    const statCard = (label, value) =>
      el('div', { style: 'background:var(--ink-900); border:1px solid var(--ink-800); border-radius:12px; padding:14px; flex:1;' }, [
        el('div', { style: 'font-size:20px; font-weight:700; font-family:var(--font-display);' }, String(value)),
        el('div', { style: 'font-size:11px; color:var(--paper-500); text-transform:uppercase;' }, label)
      ]);

    const stats = el('div', { style: 'display:flex; flex-wrap:wrap; gap:10px; padding:16px;' }, [
      statCard('Users', insights.totalUsers),
      statCard('Posts', insights.totalPosts),
      statCard('Open reports', insights.openReports),
      statCard('Banned', insights.bannedUsers),
      statCard('Signups (7d)', insights.signupsLast7d)
    ]);

    const reportList = el(
      'div',
      {},
      reports.length === 0
        ? [el('div', { class: 'empty-state' }, [el('h3', {}, 'Queue is clear')])]
        : reports.map(renderReportRow)
    );

    body.replaceWith(el('div', {}, [stats, el('h3', { style: 'padding:0 16px 8px;' }, 'Open reports'), reportList]));
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function renderReportRow(report) {
  const removeBtn = el('button', { class: 'btn btn-sm btn-secondary' }, 'Remove content');
  const banBtn = el('button', { class: 'btn btn-sm', style: 'background:var(--danger); color:#fff;' }, 'Ban user');
  const dismissBtn = el('button', { class: 'btn-ghost btn-sm' }, 'Dismiss');

  async function resolve(action, status) {
    try {
      await api.resolveReport(report._id, { action, status });
      toast('Report resolved.', 'success');
      row.remove();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  removeBtn.addEventListener('click', () => resolve('remove_content', 'actioned'));
  banBtn.addEventListener('click', () => resolve('ban_user', 'actioned'));
  dismissBtn.addEventListener('click', () => resolve('dismiss', 'dismissed'));

  const row = el('div', { style: 'padding:12px 16px; border-bottom:1px solid var(--ink-800);' }, [
    el('div', { style: 'font-size:13px; margin-bottom:4px;' }, [
      el('strong', {}, report.targetType),
      ` reported for `,
      el('strong', {}, report.reason.replace('_', ' ')),
      ` by @${report.reporter.username}`
    ]),
    report.details ? el('div', { style: 'font-size:12px; color:var(--paper-500); margin-bottom:8px;' }, report.details) : null,
    el('div', { style: 'display:flex; gap:8px;' }, [removeBtn, banBtn, dismissBtn])
  ]);
  return row;
}
