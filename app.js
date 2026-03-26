/* ==========================================
   Budget Tracker — app.js
   ========================================== */

// ── Storage keys ──────────────────────────
const KEYS = {
  transactions: 'bt_transactions',
  budgets:      'bt_budgets',
  settings:     'bt_settings',
};

// ── Category map (FA icon + colour) ───────
const CATEGORIES = {
  salary:       { label: 'Salary',        icon: 'fa-solid fa-briefcase',      color: '#22c55e' },
  freelance:    { label: 'Freelance',     icon: 'fa-solid fa-laptop-code',    color: '#a3e635' },
  investment:   { label: 'Investment',    icon: 'fa-solid fa-chart-line',     color: '#34d399' },
  gift:         { label: 'Gift',          icon: 'fa-solid fa-gift',           color: '#f472b6' },
  other_income: { label: 'Other Income',  icon: 'fa-solid fa-coins',          color: '#94a3b8' },
  food:         { label: 'Food',          icon: 'fa-solid fa-utensils',       color: '#f97316' },
  transport:    { label: 'Transport',     icon: 'fa-solid fa-car',            color: '#3b82f6' },
  housing:      { label: 'Housing',       icon: 'fa-solid fa-house',          color: '#8b5cf6' },
  utilities:    { label: 'Utilities',     icon: 'fa-solid fa-bolt',           color: '#f59e0b' },
  health:       { label: 'Health',        icon: 'fa-solid fa-heart-pulse',    color: '#ef4444' },
  entertainment:{ label: 'Entertainment', icon: 'fa-solid fa-film',           color: '#ec4899' },
  shopping:     { label: 'Shopping',      icon: 'fa-solid fa-bag-shopping',   color: '#6366f1' },
  education:    { label: 'Education',     icon: 'fa-solid fa-graduation-cap', color: '#06b6d4' },
  savings:      { label: 'Savings',       icon: 'fa-solid fa-piggy-bank',     color: '#10b981' },
  other_expense:{ label: 'Other Expense', icon: 'fa-solid fa-box',            color: '#94a3b8' },
};

const INCOME_CATS  = ['salary','freelance','investment','gift','other_income'];
const EXPENSE_CATS = ['food','transport','housing','utilities','health','entertainment','shopping','education','savings','other_expense'];

// ── Currency → locale map ──────────────────
const LOCALE_BY_CURRENCY = {
  USD:'en-US', EUR:'de-DE', GBP:'en-GB', JPY:'ja-JP', CAD:'en-CA',
  AUD:'en-AU', INR:'en-IN', BRL:'pt-BR', CNY:'zh-CN', MXN:'es-MX',
  CHF:'de-CH', KRW:'ko-KR', SGD:'en-SG', HKD:'zh-HK',
  ZAR:'en-ZA', SEK:'sv-SE', NOK:'nb-NO', DKK:'da-DK',
  PLN:'pl-PL', TRY:'tr-TR',
};

// ── State ──────────────────────────────────
let transactions = [];
let budgets      = {};
let settings     = { currency: 'USD', locale: 'en-US' };

let editingId    = null;
let txType       = 'expense';
let filterType   = 'all';
let searchQuery  = '';
let sortField    = 'date';

// ── Persistent storage helpers ─────────────
const load = () => {
  try {
    transactions = JSON.parse(localStorage.getItem(KEYS.transactions)) || [];
    budgets      = JSON.parse(localStorage.getItem(KEYS.budgets))      || {};
    const s      = JSON.parse(localStorage.getItem(KEYS.settings));
    if (s) settings = { ...settings, ...s };
  } catch {
    transactions = []; budgets = {}; settings = { currency: 'USD', locale: 'en-US' };
  }
};

const save = () => {
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
  localStorage.setItem(KEYS.budgets,      JSON.stringify(budgets));
  localStorage.setItem(KEYS.settings,     JSON.stringify(settings));
};

// ── Formatting helpers ─────────────────────
const fmt = (n) => new Intl.NumberFormat(settings.locale, {
  style: 'currency', currency: settings.currency, minimumFractionDigits: 2,
}).format(n);

const fmtCurrency = (n, currency) => new Intl.NumberFormat(
  LOCALE_BY_CURRENCY[currency] || 'en-US',
  { style: 'currency', currency, minimumFractionDigits: 2 }
).format(n);

const fmtDate = (iso) => new Date(iso).toLocaleDateString(settings.locale, {
  month: 'short', day: 'numeric', year: 'numeric',
});

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
};

const txMonth = (tx) => tx.date.slice(0, 7);

// ── Derived totals ─────────────────────────
const totals = (list = transactions) => {
  const income  = list.filter(t => t.type === 'income' ).reduce((a,t) => a + t.amount, 0);
  const expense = list.filter(t => t.type === 'expense').reduce((a,t) => a + t.amount, 0);
  return { income, expense, balance: income - expense };
};

const monthTotals = (month = currentMonth()) => {
  return totals(transactions.filter(t => txMonth(t) === month));
};

const monthBudget = (month = currentMonth()) => budgets[month] ?? 0;

// ── UUID ───────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ── Toast ──────────────────────────────────
const toast = (msg, type = 'info') => {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// ── Render helpers ─────────────────────────
const setSummary = () => {
  const all = totals();
  const mo  = monthTotals();
  const bgt = monthBudget();

  document.getElementById('total-balance').textContent = fmt(all.balance);
  document.getElementById('total-income').textContent  = fmt(all.income);
  document.getElementById('total-expense').textContent = fmt(all.expense);

  document.getElementById('month-income').textContent  = fmt(mo.income);
  document.getElementById('month-expense').textContent = fmt(mo.expense);

  const bar    = document.getElementById('budget-bar-fill');
  const barLbl = document.getElementById('budget-bar-label');
  const barSub = document.getElementById('budget-bar-sub');
  const bgtCard= document.getElementById('budget-amount');

  if (bgt > 0) {
    const pct = Math.min((mo.expense / bgt) * 100, 100);
    bar.style.width = pct + '%';
    bar.className   = 'budget-bar-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
    barLbl.textContent = `${pct.toFixed(1)}% used`;
    barSub.textContent = `${fmt(bgt - mo.expense)} remaining of ${fmt(bgt)} budget`;
    bgtCard.textContent = fmt(bgt);
  } else {
    bar.style.width = '0%';
    barLbl.textContent = 'No budget set';
    barSub.textContent = 'Click "Set Budget" to add a monthly limit';
    bgtCard.textContent = '—';
  }
};

const filteredTx = () => {
  const q = searchQuery.toLowerCase();
  return transactions
    .filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (q && !t.description.toLowerCase().includes(q) &&
               !CATEGORIES[t.category]?.label.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'date')   return new Date(b.date) - new Date(a.date);
      if (sortField === 'amount') return b.amount - a.amount;
      return a.description.localeCompare(b.description);
    });
};

const renderTxList = () => {
  const list = filteredTx();
  const el   = document.getElementById('tx-list');

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-building-columns empty-icon"></i>
        <p>No transactions found.<br>Add one using the form.</p>
      </div>`;
    return;
  }

  el.innerHTML = list.map(t => {
    const cat  = CATEGORIES[t.category] || CATEGORIES.other_expense;
    const sign = t.type === 'income' ? '+' : '−';
    return `
      <div class="tx-item" data-id="${t.id}">
        <div class="tx-icon ${t.type}"><i class="${cat.icon}"></i></div>
        <div class="tx-body">
          <div class="tx-desc" title="${escHtml(t.description)}">${escHtml(t.description)}</div>
          <div class="tx-meta">
            <span class="cat-chip"><i class="${cat.icon}"></i> ${cat.label}</span>
            <span>${fmtDate(t.date)}</span>
            ${t.note ? `<span title="${escHtml(t.note)}"><i class="fa-solid fa-note-sticky"></i> ${escHtml(t.note.slice(0,30))}${t.note.length>30?'…':''}</span>` : ''}
          </div>
        </div>
        <span class="tx-amount ${t.type}">${sign}${fmt(t.amount)}</span>
        <div class="tx-actions">
          <button class="btn btn-outline btn-sm" onclick="startEdit('${t.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm"  onclick="deleteTx('${t.id}')"  title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
};

const escHtml = (str) => String(str)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');

const renderCategoryOptions = () => {
  const sel  = document.getElementById('tx-category');
  const cats = txType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  sel.innerHTML = cats.map(k =>
    `<option value="${k}">${CATEGORIES[k].label}</option>`
  ).join('');
};

const renderCharts = () => {
  const mo   = currentMonth();
  const moTx = transactions.filter(t => txMonth(t) === mo && t.type === 'expense');
  const byCategory = {};
  moTx.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
  drawDonut('chart-category', byCategory);
  drawMonthlyBar('chart-monthly');
};

// ── Simple canvas charts (no dependencies) ─
const drawDonut = (canvasId, byCategory) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width  = canvas.offsetWidth  || 220;
  const H   = canvas.height = canvas.offsetHeight || 220;
  ctx.clearRect(0, 0, W, H);

  const entries = Object.entries(byCategory).filter(([,v]) => v > 0);
  if (entries.length === 0) {
    ctx.fillStyle = '#334155';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data this month', W/2, H/2);
    return;
  }

  const total = entries.reduce((a,[,v]) => a + v, 0);
  const cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 20, r = R * .55;
  let angle = -Math.PI/2;

  entries.forEach(([cat, val]) => {
    const slice = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = CATEGORIES[cat]?.color || '#6366f1';
    ctx.fill();
    angle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 15px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total), cx, cy);
};

// ── Canvas rounded rect polyfill ──────────
const canvasRoundRect = (ctx, x, y, w, h, radii) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radii);
  } else {
    const r  = Array.isArray(radii) ? radii[0] : (radii || 0);
    const cR = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + cR, y);
    ctx.lineTo(x + w - cR, y);
    ctx.arcTo(x + w, y, x + w, y + cR, cR);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + cR);
    ctx.arcTo(x, y, x + cR, y, cR);
    ctx.closePath();
  }
};

const drawMonthlyBar = (canvasId) => {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width  = canvas.offsetWidth  || 400;
  const H   = canvas.height = canvas.offsetHeight || 220;
  ctx.clearRect(0, 0, W, H);

  const months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}`);
  }

  const data = months.map(m => {
    const t = monthTotals(m);
    return { month: m, income: t.income, expense: t.expense };
  });

  const maxVal   = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const pad      = { l: 10, r: 10, t: 20, b: 28 };
  const chartH   = H - pad.t - pad.b;
  const barGroup = (W - pad.l - pad.r) / months.length;
  const barW     = Math.max(barGroup * .28, 4);

  data.forEach((d, i) => {
    const x  = pad.l + i * barGroup + barGroup / 2;
    const iH = (d.income  / maxVal) * chartH;
    const eH = (d.expense / maxVal) * chartH;

    ctx.fillStyle = 'rgba(34,197,94,.75)';
    ctx.beginPath();
    canvasRoundRect(ctx, x - barW - 2, H - pad.b - iH, barW, iH, [3,3,0,0]);
    ctx.fill();

    ctx.fillStyle = 'rgba(239,68,68,.75)';
    ctx.beginPath();
    canvasRoundRect(ctx, x + 2, H - pad.b - eH, barW, eH, [3,3,0,0]);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(d.month.slice(5), x, H - pad.b + 4);
  });

  const drawLegend = (lx, ly, color, label) => {
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly, 10, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, lx + 14, ly);
  };
  drawLegend(pad.l, 4, 'rgba(34,197,94,.75)', 'Income');
  drawLegend(pad.l + 70, 4, 'rgba(239,68,68,.75)', 'Expenses');
};

// ── Full render ────────────────────────────
const render = () => {
  setSummary();
  renderTxList();
  renderCharts();
};

// ── Add / Edit transaction ─────────────────
const getFormData = () => ({
  desc: document.getElementById('tx-desc').value.trim(),
  amt:  parseFloat(document.getElementById('tx-amount').value),
  cat:  document.getElementById('tx-category').value,
  date: document.getElementById('tx-date').value,
  note: document.getElementById('tx-note').value.trim(),
});

const validateForm = ({ desc, amt, date }) => {
  if (!desc)                      { toast('Please enter a description.',   'error'); return false; }
  if (!amt || isNaN(amt) || amt <= 0) { toast('Please enter a valid amount.', 'error'); return false; }
  if (!date)                      { toast('Please pick a date.',           'error'); return false; }
  return true;
};

window.submitTx = () => {
  const { desc, amt, cat, date, note } = getFormData();
  if (!validateForm({ desc, amt, date })) return;

  if (editingId) {
    const idx = transactions.findIndex(t => t.id === editingId);
    if (idx !== -1) {
      transactions[idx] = { ...transactions[idx], description: desc, amount: amt, category: cat, date, note, type: txType };
    }
    toast('Transaction updated ✅', 'success');
    editingId = null;
    document.getElementById('form-title').textContent = 'Add Transaction';
    document.getElementById('submit-btn').innerHTML   = '<i class="fa-solid fa-plus"></i> Add Transaction';
    document.getElementById('cancel-edit-btn').style.display = 'none';
  } else {
    transactions.unshift({ id: uid(), description: desc, amount: amt, category: cat, date, note, type: txType });
    toast('Transaction added ✅', 'success');
  }

  save();
  clearForm();
  render();
};

window.startEdit = (id) => {
  const t = transactions.find(t => t.id === id);
  if (!t) return;
  editingId = t.id;
  txType = t.type;
  updateTypeButtons();
  renderCategoryOptions();

  document.getElementById('tx-desc').value     = t.description;
  document.getElementById('tx-amount').value   = t.amount;
  document.getElementById('tx-category').value = t.category;
  document.getElementById('tx-date').value     = t.date;
  document.getElementById('tx-note').value     = t.note || '';
  document.getElementById('form-title').textContent = 'Edit Transaction';
  document.getElementById('submit-btn').innerHTML   = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  document.getElementById('cancel-edit-btn').style.display = 'inline-flex';
  document.getElementById('tx-desc').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.cancelEdit = () => {
  editingId = null;
  clearForm();
  document.getElementById('form-title').textContent = 'Add Transaction';
  document.getElementById('submit-btn').innerHTML   = '<i class="fa-solid fa-plus"></i> Add Transaction';
  document.getElementById('cancel-edit-btn').style.display = 'none';
};

window.deleteTx = (id) => {
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
  toast('Transaction deleted.', 'info');
};

const clearForm = () => {
  document.getElementById('tx-desc').value   = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-note').value   = '';
  document.getElementById('tx-date').value   = new Date().toISOString().slice(0,10);
};

// ── Type toggle ────────────────────────────
const updateTypeButtons = () => {
  document.getElementById('btn-expense').className =
    'type-btn' + (txType === 'expense' ? ' active-expense' : '');
  document.getElementById('btn-income').className =
    'type-btn' + (txType === 'income'  ? ' active-income'  : '');
};

window.setType = (type) => {
  txType = type;
  updateTypeButtons();
  renderCategoryOptions();
};

// ── Budget modal ───────────────────────────
window.openBudgetModal = () => {
  const mo = currentMonth();
  document.getElementById('budget-month').value = mo;
  document.getElementById('budget-input').value = budgets[mo] || '';
  document.getElementById('budget-modal').classList.add('open');
};

window.closeBudgetModal = () => {
  document.getElementById('budget-modal').classList.remove('open');
};

window.saveBudget = () => {
  const mo  = document.getElementById('budget-month').value;
  const val = parseFloat(document.getElementById('budget-input').value);
  if (!mo)               { toast('Please select a month.',             'error'); return; }
  if (isNaN(val) || val < 0) { toast('Please enter a valid budget amount.', 'error'); return; }
  budgets[mo] = val;
  save();
  closeBudgetModal();
  render();
  toast(`Budget set to ${fmt(val)} for ${mo} ✅`, 'success');
};

// ── Settings modal ─────────────────────────
window.openSettingsModal = () => {
  document.getElementById('setting-currency').value = settings.currency;
  document.getElementById('settings-modal').classList.add('open');
};

window.closeSettingsModal = () => {
  document.getElementById('settings-modal').classList.remove('open');
};

window.saveSettings = () => {
  const currency = document.getElementById('setting-currency').value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) { toast('Enter a valid 3-letter currency code.', 'error'); return; }
  settings.currency = currency;
  settings.locale   = LOCALE_BY_CURRENCY[currency] || 'en-US';
  save();
  closeSettingsModal();
  // Update exchange "from" label and reset exchange display
  document.getElementById('exchange-from-label').textContent = currency;
  resetExchangeDisplay();
  render();
  toast('Settings saved ✅', 'success');
};

// ── Clear all data ─────────────────────────
window.clearAllData = () => {
  if (!confirm('Delete ALL transactions and budgets? This cannot be undone.')) return;
  transactions = [];
  budgets      = {};
  save();
  render();
  toast('All data cleared.', 'info');
};

// ── Filters & search ───────────────────────
const initFilters = () => {
  document.getElementById('tx-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTxList();
  });
  document.getElementById('tx-filter').addEventListener('change', (e) => {
    filterType = e.target.value;
    renderTxList();
  });
  document.getElementById('tx-sort').addEventListener('change', (e) => {
    sortField = e.target.value;
    renderTxList();
  });
};

// ── Export CSV ─────────────────────────────
window.exportCSV = () => {
  if (transactions.length === 0) { toast('No transactions to export.', 'error'); return; }
  const header = ['Date','Type','Category','Description','Amount','Note'];
  const rows   = transactions.map(t => [
    t.date, t.type,
    CATEGORIES[t.category]?.label || t.category,
    `"${(t.description||'').replace(/"/g,'""')}"`,
    t.amount.toFixed(2),
    `"${(t.note||'').replace(/"/g,'""')}"`,
  ]);
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download= `budget-tracker-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('CSV exported ✅', 'success');
};

// ── Currency Exchange ──────────────────────
const resetExchangeDisplay = () => {
  document.getElementById('exchange-data').style.display        = 'none';
  document.getElementById('exchange-loading').style.display     = 'none';
  document.getElementById('exchange-error').style.display       = 'none';
  document.getElementById('exchange-placeholder').style.display = '';
};

window.fetchRates = async () => {
  const target = document.getElementById('exchange-target').value;
  const base   = settings.currency;

  if (target === base) {
    toast(`Already displaying in ${base}.`, 'info');
    resetExchangeDisplay();
    return;
  }

  document.getElementById('exchange-placeholder').style.display = 'none';
  document.getElementById('exchange-error').style.display       = 'none';
  document.getElementById('exchange-data').style.display        = 'none';
  document.getElementById('exchange-loading').style.display     = '';

  const btn  = document.getElementById('refresh-rates-btn');
  const icon = document.getElementById('refresh-icon');
  btn.disabled  = true;
  icon.className = 'fa-solid fa-spinner fa-spin';

  try {
    const res  = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(target)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data.rates[target];
    if (!rate) throw new Error('Rate not available');

    const all = totals();
    const mo  = monthTotals();

    const conv = (n) => fmtCurrency(n * rate, target);

    document.getElementById('ex-balance').textContent = conv(all.balance);
    document.getElementById('ex-income').textContent  = conv(all.income);
    document.getElementById('ex-expense').textContent = conv(all.expense);
    document.getElementById('ex-month').textContent   = conv(mo.expense);
    document.getElementById('exchange-meta').textContent =
      `1 ${base} = ${rate.toFixed(4)} ${target}  ·  Rates from ${data.date}`;

    document.getElementById('exchange-loading').style.display = 'none';
    document.getElementById('exchange-data').style.display    = '';
  } catch (err) {
    document.getElementById('exchange-loading').style.display = 'none';
    document.getElementById('exchange-error-msg').textContent =
      `Could not fetch rates: ${err.message}`;
    document.getElementById('exchange-error').style.display = '';
    toast('Failed to fetch exchange rates.', 'error');
  } finally {
    btn.disabled   = false;
    icon.className = 'fa-solid fa-rotate';
  }
};

// ── Close modals on backdrop click ─────────
const initModalDismiss = () => {
  ['budget-modal','settings-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      if (e.target.id === id) document.getElementById(id).classList.remove('open');
    });
  });
};

// ── Keyboard shortcuts ─────────────────────
const initKeyboard = () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeBudgetModal(); closeSettingsModal(); }
  });
};

// ── Resize → redraw charts ─────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCharts, 200);
});

// ── Bootstrap ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();
  renderCategoryOptions();
  updateTypeButtons();
  document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('cancel-edit-btn').style.display = 'none';
  document.getElementById('exchange-from-label').textContent = settings.currency;
  initFilters();
  initModalDismiss();
  initKeyboard();
  render();
});
