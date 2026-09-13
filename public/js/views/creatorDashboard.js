import { api } from '../services/api.js';
import { el, toast } from '../utils.js';

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export async function renderCreatorDashboard(container) {
  const screen = el('div', { class: 'screen' });
  const body = el('div', { class: 'loading-screen' }, [el('span', { class: 'aperture spin' })]);
  screen.append(el('div', { class: 'topbar' }, [el('a', { href: '#/profile', class: 'icon-btn' }, '\u2190'), el('strong', {}, 'Creator dashboard')]), body);
  container.replaceChildren(screen);

  try {
    const [{ postsCount, totals, estimatedReach, topPosts }, { campaigns }] = await Promise.all([
      api.getCreatorDashboard(),
      api.getCampaigns()
    ]);

    const statCard = (label, value) =>
      el('div', { style: 'background:var(--ink-900); border:1px solid var(--ink-800); border-radius:12px; padding:14px; flex:1;' }, [
        el('div', { style: 'font-size:20px; font-weight:700; font-family:var(--font-display);' }, String(value)),
        el('div', { style: 'font-size:11px; color:var(--paper-500); text-transform:uppercase;' }, label)
      ]);

    const stats = el('div', { style: 'display:flex; gap:10px; padding:16px;' }, [
      statCard('Posts', postsCount),
      statCard('Likes', totals.likes),
      statCard('Comments', totals.comments),
      statCard('Est. reach', estimatedReach)
    ]);

    const topPostsGrid = el(
      'div',
      { class: 'preview-grid', style: 'padding:0 16px 16px;' },
      topPosts.map((p) => el('img', { src: p.thumbnail, alt: 'Post', style: 'border-radius:8px;' }))
    );

    const campaignSection = renderCampaignBuilder(campaigns);

    body.replaceWith(
      el('div', {}, [
        el('h3', { style: 'padding:16px 16px 0;' }, 'Performance'),
        stats,
        topPosts.length > 0 ? topPostsGrid : null,
        campaignSection
      ])
    );
  } catch (err) {
    body.replaceWith(el('div', { class: 'empty-state' }, [el('p', { class: 'error-text' }, err.message)]));
  }
}

function renderCampaignBuilder(initialCampaigns) {
  const list = el('div', {}, initialCampaigns.map(renderCampaignRow));

  const nameInput = el('input', { type: 'text', placeholder: 'Campaign name' });
  const postIdInput = el('input', { type: 'text', placeholder: 'Post ID to promote' });
  const budgetInput = el('input', { type: 'number', placeholder: 'Daily budget (USD)', min: '1', step: '1' });
  const startInput = el('input', { type: 'date' });
  const endInput = el('input', { type: 'date' });
  const createBtn = el('button', { class: 'btn btn-primary btn-block' }, 'Create campaign (draft)');

  createBtn.addEventListener('click', async () => {
    try {
      const { campaign } = await api.createCampaign({
        name: nameInput.value.trim(),
        postId: postIdInput.value.trim(),
        objective: 'awareness',
        dailyBudgetCents: Math.round(Number(budgetInput.value) * 100),
        startDate: startInput.value,
        endDate: endInput.value
      });
      toast('Campaign created as a draft.', 'success');
      list.prepend(renderCampaignRow(campaign));
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  return el('div', { style: 'padding:16px; border-top:1px solid var(--ink-800);' }, [
    el('h3', { style: 'margin-bottom:12px;' }, 'Ad campaigns'),
    list,
    el('div', { class: 'field', style: 'margin-top:16px;' }, [el('label', {}, 'New campaign'), nameInput]),
    el('div', { class: 'field' }, [postIdInput]),
    el('div', { style: 'display:flex; gap:8px;' }, [
      el('div', { class: 'field', style: 'flex:1;' }, [el('label', {}, 'Daily budget'), budgetInput]),
      el('div', { class: 'field', style: 'flex:1;' }, [el('label', {}, 'Start'), startInput]),
      el('div', { class: 'field', style: 'flex:1;' }, [el('label', {}, 'End'), endInput])
    ]),
    createBtn
  ]);
}

function renderCampaignRow(campaign) {
  const statusBtn = el('button', { class: 'btn btn-sm btn-secondary' }, campaign.status === 'active' ? 'Pause' : 'Activate');

  statusBtn.addEventListener('click', async () => {
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const { campaign: updated } = await api.updateCampaignStatus(campaign._id, nextStatus);
      campaign.status = updated.status;
      campaign.metrics = updated.metrics;
      row.replaceWith(renderCampaignRow(campaign));
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  const row = el('div', { class: 'post-header' }, [
    el('div', { style: 'flex:1;' }, [
      el('div', { class: 'post-author' }, campaign.name),
      el(
        'div',
        { class: 'post-location' },
        `${campaign.status} \u00b7 ${formatMoney(campaign.dailyBudgetCents)}/day \u00b7 ${campaign.metrics.impressions} impressions`
      )
    ]),
    statusBtn
  ]);
  return row;
}
