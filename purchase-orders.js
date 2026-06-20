/* ============================================================
   PURCHASE ORDER MODULE  |  purchase-orders.js
   Depends on: app.js (helpers, PDF builders, CloudSync)
   ============================================================ */
'use strict';

/* ── State ── */
let allPOs       = [];
let currentPOId  = null;

/* ── Helpers ── */
function newPOId()     { return 'PO_' + Date.now() + '_' + Math.random().toString(36).substr(2,5).toUpperCase(); }
function newPONumber() { return 'PO-' + String(allPOs.length + 1).padStart(3,'0'); }

function createNewPO() {
  return {
    id:         newPOId(),
    poNumber:   newPONumber(),
    clientName: '',
    date:       new Date().toISOString().slice(0,10),
    status:     'Pending',
    pageCount:  1,
    items:      [],
    notes:      '',
    total:      0,
    createdAt:  Date.now(),
    updatedAt:  Date.now(),
  };
}

/* ── Load all POs from cloud/local ── */
async function loadAllPOs() {
  allPOs = await CloudSync.loadPOs();
  renderPOList();
  /* Subscribe for real-time updates */
  CloudSync.subscribePOs(freshPOs => {
    allPOs = freshPOs;
    renderPOList();
    /* If currently editing a PO that got updated remotely, show a subtle indicator */
    if (currentPOId) {
      const cur = allPOs.find(p => p.id === currentPOId);
      if (cur) {
        const badge = document.getElementById('po-sync-badge');
        if (badge) { badge.textContent = '☁ Synced'; badge.className = 'po-sync-badge synced'; }
      }
    }
  });
}

/* ── PO List Panel ── */
function renderPOList() {
  const list = document.getElementById('po-list');
  if (!list) return;

  /* Search filter */
  const q = (document.getElementById('po-search')?.value || '').toLowerCase();
  const filtered = q
    ? allPOs.filter(po =>
        (po.clientName||'').toLowerCase().includes(q) ||
        (po.poNumber||'').toLowerCase().includes(q) ||
        (po.status||'').toLowerCase().includes(q))
    : allPOs;

  if (!filtered.length) {
    list.innerHTML = `<div class="po-empty-list">
      <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
      <p>${allPOs.length ? 'No results found' : 'No purchase orders yet'}</p>
      ${!allPOs.length ? '<button class="btn-primary" style="margin-top:10px;" onclick="addNewPO()">+ Create First PO</button>' : ''}
    </div>`;
    return;
  }

  const statusClr = { Pending:'#f59e0b', Approved:'#3b82f6', Completed:'#22c55e', Cancelled:'#ef4444' };

  list.innerHTML = filtered.map(po => `
    <div class="po-card ${po.id === currentPOId ? 'active' : ''}" onclick="openPO('${po.id}')">
      <div class="po-card-top">
        <span class="po-number-badge">${escHtml(po.poNumber||'—')}</span>
        <span class="po-status-badge" style="background:${statusClr[po.status]||'#8e8c87'}22;color:${statusClr[po.status]||'#8e8c87'};border-color:${statusClr[po.status]||'#8e8c87'}44;">
          ${escHtml(po.status||'Pending')}
        </span>
      </div>
      <div class="po-card-client">${escHtml(po.clientName||'No client specified')}</div>
      <div class="po-card-meta">
        <span>${po.date ? formatDate(po.date) : '—'}</span>
        <span class="po-card-total">₹ ${formatINR(po.total||0)}</span>
      </div>
    </div>`).join('');
}

/* ── Open / Edit a PO ── */
function openPO(id) {
  const po = allPOs.find(p => p.id === id);
  if (!po) return;
  currentPOId = id;
  renderPOList();
  renderPOEditor(po);
}

function addNewPO() {
  const po = createNewPO();
  allPOs.unshift(po);
  currentPOId = po.id;
  CloudSync.savePO(po);  /* save skeleton immediately */
  renderPOList();
  renderPOEditor(po);
  setTimeout(() => document.getElementById('po-client-inp')?.focus(), 100);
}

/* ── PO Editor ── */
function renderPOEditor(po) {
  const ed = document.getElementById('po-editor');
  if (!ed) return;

  const statusColors = { Pending:'#f59e0b', Approved:'#3b82f6', Completed:'#22c55e', Cancelled:'#ef4444' };

  ed.innerHTML = `
    <div class="po-editor-inner">

      <!-- Editor Header Bar -->
      <div class="po-editor-topbar">
        <div class="po-editor-id-row">
          <input type="text" id="po-number-inp" value="${escHtml(po.poNumber||'')}"
                 class="po-number-input" placeholder="PO Number" />
          <select id="po-status-inp" class="po-status-select"
                  style="border-color:${statusColors[po.status]||'#8e8c87'}66;color:${statusColors[po.status]||'#8e8c87'};"
                  onchange="onPOStatusChange(this)">
            ${['Pending','Approved','Completed','Cancelled'].map(s =>
              `<option value="${s}" ${po.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <span class="po-sync-badge" id="po-sync-badge"></span>
        </div>
        <div class="po-editor-actions">
          <button class="btn-po-save" onclick="savePOEdits()">
            <svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            Save
          </button>
          <button class="btn-po-pdf" onclick="generatePOPDF()">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            PDF
          </button>
          <button class="btn-po-delete" onclick="confirmDeletePO('${po.id}')">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Delete
          </button>
        </div>
      </div>

      <!-- Fields -->
      <div class="po-editor-body">
        <div class="po-fields-row">
          <div class="form-group" style="flex:2;">
            <label for="po-client-inp">Client Name</label>
            <input type="text" id="po-client-inp" value="${escHtml(po.clientName||'')}" placeholder="Client / Company name" />
          </div>
          <div class="form-group">
            <label for="po-date-inp">Date</label>
            <input type="date" id="po-date-inp" value="${escHtml(po.date||'')}" />
          </div>
        </div>

        <!-- Page count -->
        <div class="form-group">
          <label>PDF Pages</label>
          <div class="pgcount-wrap" style="gap:8px;">
            <button class="pgcount-btn ${po.pageCount===1?'active':''}" style="min-width:80px;padding:8px 12px;font-size:12px;" data-pages="1" onclick="setPOPageCount(1)">1 Page</button>
            <button class="pgcount-btn ${po.pageCount===2?'active':''}" style="min-width:80px;padding:8px 12px;font-size:12px;" data-pages="2" onclick="setPOPageCount(2)">2 Pages</button>
          </div>
        </div>

        <!-- Items Table -->
        <div class="po-items-section">
          <div class="po-items-header">
            <span>Line Items</span>
            <button class="btn-add-row" onclick="addPORow()">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add Item
            </button>
          </div>
          <div class="table-wrapper">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="col-desc">Description of Work</th>
                  <th class="col-qty">Qty</th>
                  <th class="col-unit">Units</th>
                  <th class="col-rate">Rate (₹)</th>
                  <th class="col-amount">Amount (₹)</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody id="po-items-tbody">${_renderPORows(po.items)}</tbody>
            </table>
          </div>
          <div class="total-bar">
            <div class="total-label">TOTAL AMOUNT</div>
            <div class="total-value" id="po-total-display">₹ ${formatINR(po.total||0)}</div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="po-notes-inp">Notes / Remarks</label>
          <textarea id="po-notes-inp" rows="3" placeholder="Additional notes…">${escHtml(po.notes||'')}</textarea>
        </div>

      </div><!-- /po-editor-body -->
    </div>`;

  calcPOTotal();
}

function _renderPORows(items) {
  if (!items || !items.length) {
    return `<tr class="empty-row"><td colspan="6">
      <div style="text-align:center;padding:22px;color:#8e8c87;font-size:13px;">
        No items — click <strong>Add Item</strong> to begin
      </div></td></tr>`;
  }
  return items.map((item,idx) => `
    <tr data-idx="${idx}">
      <td>
        <input type="text" class="po-td-desc" value="${escHtml(item.desc||'')}" placeholder="Item description" oninput="calcPOTotal()" />
        <textarea class="td-subdesc" rows="2" placeholder="Sub-description (optional)">${escHtml(item.subDesc||'')}</textarea>
      </td>
      <td><input type="number" class="po-td-qty"  value="${escHtml(item.qty||'')}"  placeholder="0"    min="0" oninput="calcPOTotal()" style="text-align:center;" /></td>
      <td><input type="text"   class="po-td-unit" value="${escHtml(item.unit||'')}" placeholder="Nos" /></td>
      <td><input type="number" class="po-td-rate" value="${escHtml(item.rate||'')}" placeholder="0.00" min="0" step="0.01" oninput="calcPOTotal()" style="text-align:right;" /></td>
      <td class="po-td-amount amount-cell">₹ ${formatINR(parseNum(item.qty)*parseNum(item.rate))}</td>
      <td><button class="btn-delete-row" onclick="deletePORow(${idx})">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button></td>
    </tr>`).join('');
}

/* ── PO Total ── */
function calcPOTotal() {
  let total = 0;
  document.querySelectorAll('#po-items-tbody tr:not(.empty-row)').forEach(row => {
    const qty  = parseNum(row.querySelector('.po-td-qty')?.value);
    const rate = parseNum(row.querySelector('.po-td-rate')?.value);
    const amt  = qty * rate;
    const cell = row.querySelector('.po-td-amount');
    if (cell) cell.textContent = '₹ ' + formatINR(amt);
    total += amt;
  });
  const el = document.getElementById('po-total-display');
  if (el) el.textContent = '₹ ' + formatINR(total);
  return total;
}

/* ── Collect current editor data → PO object ── */
function _collectPOFromEditor() {
  const po = allPOs.find(p => p.id === currentPOId);
  if (!po) return null;
  const items = [];
  document.querySelectorAll('#po-items-tbody tr:not(.empty-row)').forEach(row => {
    items.push({
      desc:    row.querySelector('.po-td-desc')?.value  || '',
      subDesc: row.querySelector('.td-subdesc')?.value  || '',
      qty:     row.querySelector('.po-td-qty')?.value   || '',
      unit:    row.querySelector('.po-td-unit')?.value  || '',
      rate:    row.querySelector('.po-td-rate')?.value  || '',
    });
  });
  return {
    ...po,
    poNumber:   document.getElementById('po-number-inp')?.value  || po.poNumber,
    clientName: document.getElementById('po-client-inp')?.value  || '',
    date:       document.getElementById('po-date-inp')?.value    || '',
    status:     document.getElementById('po-status-inp')?.value  || 'Pending',
    notes:      document.getElementById('po-notes-inp')?.value   || '',
    items,
    total:      calcPOTotal(),
    updatedAt:  Date.now(),
  };
}

/* ── Save ── */
async function savePOEdits() {
  const po = _collectPOFromEditor();
  if (!po) return;
  const idx = allPOs.findIndex(p => p.id === po.id);
  if (idx >= 0) allPOs[idx] = po;
  renderPOList();
  const badge = document.getElementById('po-sync-badge');
  if (badge) { badge.textContent = '⟳ Saving…'; badge.className = 'po-sync-badge syncing'; }
  await CloudSync.savePO(po);
  if (badge) { badge.textContent = '☁ Saved'; badge.className = 'po-sync-badge synced'; }
  showToast('✅ Purchase Order saved!');
}

/* ── Delete ── */
async function confirmDeletePO(id) {
  if (!confirm('Delete this Purchase Order? This cannot be undone.')) return;
  allPOs = allPOs.filter(p => p.id !== id);
  currentPOId = null;
  await CloudSync.deletePO(id);
  renderPOList();
  const ed = document.getElementById('po-editor');
  if (ed) ed.innerHTML = `
    <div class="po-empty-editor">
      <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
      <p>Select a Purchase Order or create a new one</p>
      <button class="btn-primary" onclick="addNewPO()">+ New Purchase Order</button>
    </div>`;
  showToast('🗑 Purchase Order deleted');
}

/* ── Row management ── */
function addPORow() {
  const po = _collectPOFromEditor();
  if (!po) return;
  po.items.push({ desc:'', subDesc:'', qty:'', unit:'', rate:'' });
  const idx = allPOs.findIndex(p => p.id === po.id);
  if (idx >= 0) allPOs[idx] = po;
  document.getElementById('po-items-tbody').innerHTML = _renderPORows(po.items);
  calcPOTotal();
  const inputs = document.querySelectorAll('#po-items-tbody .po-td-desc');
  inputs[inputs.length-1]?.focus();
}

function deletePORow(idx) {
  const po = _collectPOFromEditor();
  if (!po) return;
  po.items.splice(idx, 1);
  const pidx = allPOs.findIndex(p => p.id === po.id);
  if (pidx >= 0) allPOs[pidx] = po;
  document.getElementById('po-items-tbody').innerHTML = _renderPORows(po.items);
  calcPOTotal();
}

function setPOPageCount(n) {
  document.querySelectorAll('.po-editor-inner .pgcount-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.pages === n));
  const po = allPOs.find(p => p.id === currentPOId);
  if (po) po.pageCount = n;
}

function onPOStatusChange(sel) {
  const clrs = { Pending:'#f59e0b', Approved:'#3b82f6', Completed:'#22c55e', Cancelled:'#ef4444' };
  const c = clrs[sel.value] || '#8e8c87';
  sel.style.borderColor = c + '66';
  sel.style.color = c;
}

/* ══════════════════════════════════════════════════════════
   PURCHASE ORDER PDF GENERATOR
   ══════════════════════════════════════════════════════════ */

function _buildPOPageHTML(po) {
  const C   = JSON.parse(JSON.stringify(PDF_CONFIG));
  const P   = C.pagePad, L = Math.round(C.logoSize);
  const total = po.items.reduce((s,i) => s + parseNum(i.qty)*parseNum(i.rate), 0);
  const addrLines = (state.company.address||'').split('\n');

  const rows = !po.items.length
    ? `<tr><td colspan="5" style="padding:10px;text-align:center;color:#8e8c87;font-size:${C.tdPt}pt;">No items added</td></tr>`
    : po.items.map((item,idx) => {
        const amt = parseNum(item.qty)*parseNum(item.rate);
        const bg  = idx%2===0 ? '#ffffff' : '#f3f1ec';
        const sub = item.subDesc ? `<div style="font-size:${C.tdSubPt}pt;color:#8e8c87;margin-top:2px;">${escNl(item.subDesc)}</div>` : '';
        return `<tr style="background:${bg};">
          <td style="padding:6px 10px;vertical-align:top;border-bottom:1px solid #e5e2da;"><div style="font-weight:700;font-size:${C.tdPt}pt;color:#1d293b;">${escHtml(item.desc)}</div>${sub}</td>
          <td style="padding:6px 5px;text-align:center;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${escHtml(item.qty)}</td>
          <td style="padding:6px 5px;text-align:center;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${escHtml(item.unit)}</td>
          <td style="padding:6px 10px;text-align:right;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${formatINR(parseNum(item.rate))}</td>
          <td style="padding:6px 10px;text-align:right;vertical-align:middle;font-size:${C.tdPt}pt;font-weight:700;color:#1d293b;border-bottom:1px solid #e5e2da;">${formatINR(amt)}</td>
        </tr>`;
      }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${IFRAME_FONTS}
<style>${IFRAME_RESET}table{border-collapse:collapse;width:100%}th{white-space:nowrap;word-break:keep-all}</style>
</head><body>
<div style="width:595px;height:842px;background:#faf9f5;padding:${P}px ${P+8}px;position:relative;overflow:hidden;">

  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:${Math.round(P*.4)}px;">
    <img src="${LOGO_PNG}" width="${L}" height="${L}" style="display:block;border-radius:${Math.round(L*.17)}px;" />
    <div>
      <div style="font-family:'Open Sans',Arial,sans-serif;font-size:${C.quotationPt}pt;font-weight:800;color:#1d293b;letter-spacing:2px;text-align:right;">PURCHASE ORDER</div>
      <div style="font-size:7pt;text-align:right;margin-top:3px;padding:3px 8px;background:#1d293b;color:#c9a227;border-radius:3px;display:inline-block;float:right;">${escHtml(po.status||'Pending')}</div>
    </div>
  </div>

  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:${Math.round(P*.33)}px;">
    <div>
      <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.companyPt}pt;font-weight:800;color:#1d293b;">${escHtml(state.company.name)}</div>
      <div style="font-size:${C.taglinePt}pt;font-weight:600;color:#b08d57;letter-spacing:2px;text-transform:uppercase;margin-top:3px;">${escHtml(state.company.tagline)}</div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:20px;">
      <div style="display:flex;align-items:baseline;justify-content:flex-end;gap:8px;margin-bottom:3px;">
        <span style="font-size:6pt;font-weight:700;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">PO NO:</span>
        <span style="font-size:${C.metaPt}pt;font-weight:700;color:#1d293b;">${escHtml(po.poNumber||'—')}</span>
      </div>
      <div style="display:flex;align-items:baseline;justify-content:flex-end;gap:8px;">
        <span style="font-size:6pt;font-weight:700;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">DATE:</span>
        <span style="font-size:${C.metaPt}pt;font-weight:700;color:#1d293b;">${formatDate(po.date)}</span>
      </div>
    </div>
  </div>

  <div style="font-size:${C.addrPt}pt;color:#4a4a45;line-height:1.6;margin-bottom:2px;">${addrLines.map(l=>`<div>${escHtml(l)}</div>`).join('')}</div>
  <div style="font-size:${C.addrPt}pt;color:#4a4a45;margin-bottom:${Math.round(P*.4)}px;">
    <span style="font-weight:700;color:#1d293b;">Mo:</span> ${escHtml(state.company.phone)}&nbsp;&nbsp;
    <span style="font-weight:700;color:#1d293b;">| Mail:</span> ${escHtml(state.company.email)}
  </div>

  <div style="border-top:1px solid #dedad2;margin-bottom:${Math.round(P*.4)}px;"></div>

  <div style="background:#f0ede7;border-left:3px solid #c9a227;padding:6px 12px;border-radius:0 3px 3px 0;margin-bottom:${Math.round(P*.45)}px;">
    <div style="font-size:6pt;font-weight:700;color:#8e8c87;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">BILLED TO</div>
    <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.quoteToPt}pt;font-weight:700;color:#1d293b;">${escHtml(po.clientName||'—')}</div>
  </div>

  <table>
    <thead><tr style="background:#1d293b;">
      <th style="padding:7px 10px;text-align:left;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:42%;">Description of Work</th>
      <th style="padding:7px 5px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:7%;">Qty</th>
      <th style="padding:7px 5px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:10%;">Units</th>
      <th style="padding:7px 10px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:18%;">Rate</th>
      <th style="padding:7px 10px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:23%;">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;align-items:center;gap:18px;border-top:1.5px solid #1d293b;border-bottom:1.5px solid #1d293b;padding:7px 10px;margin-bottom:12px;">
    <span style="font-size:${C.totalLabelPt}pt;font-weight:700;color:#1d293b;letter-spacing:1px;text-transform:uppercase;">TOTAL AMOUNT:</span>
    <span style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.totalValPt}pt;font-weight:800;color:#1d293b;">&#8377;&nbsp;${formatINR(total)}</span>
  </div>

  ${po.notes ? `<div style="font-size:${C.sec2BodyPt}pt;color:#4a4a45;line-height:1.55;">
    <span style="font-weight:700;color:#1d293b;">Notes: </span>${escHtml(po.notes)}
  </div>` : ''}

  <div style="position:absolute;bottom:${P+4}px;left:${P+8}px;right:${P+8}px;border-top:1px solid #dedad2;"></div>
  <div style="position:absolute;bottom:${Math.round(P*.6)}px;left:0;right:0;text-align:center;font-size:6pt;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">${escHtml(state.company.name)} &nbsp;&#x2022;&nbsp; PURCHASE ORDER</div>
  <div style="position:absolute;bottom:12px;right:${P+8}px;font-size:6pt;color:#8e8c87;">Page 1 of 1</div>
</div></body></html>`;
}

async function generatePOPDF() {
  const po = _collectPOFromEditor();
  if (!po) { showToast('⚠ Open a PO first'); return; }
  showToast('⏳ Generating PO PDF…');
  const A4_W=595, A4_H=842, SCALE=4;

  async function render(html) {
    return new Promise((res,rej) => {
      const f = document.createElement('iframe');
      f.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4_W}px;height:${A4_H}px;border:none;opacity:0;pointer-events:none;`;
      document.body.appendChild(f);
      const d = f.contentDocument; d.open(); d.write(html); d.close();
      setTimeout(() => {
        html2canvas(d.body, { scale:SCALE, useCORS:true, allowTaint:true, foreignObjectRendering:false,
          backgroundColor:'#faf9f5', width:A4_W, height:A4_H, windowWidth:A4_W, windowHeight:A4_H, imageTimeout:25000, logging:false })
          .then(c => { document.body.removeChild(f); res(c); })
          .catch(e => { document.body.removeChild(f); rej(e); });
      }, 2500);
    });
  }

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait', compress:true });
    const c = await render(_buildPOPageHTML(po));
    pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, '', 'FAST');
    pdf.save(`PO_${po.poNumber}_${(po.clientName||'Client').replace(/\s+/g,'_')}.pdf`);
    showToast('✅ PO PDF downloaded!', 4000);
  } catch(e) { console.error(e); showToast('❌ Error generating PDF', 4000); }
}

/* ── Filter ── */
function filterPOList() { renderPOList(); }
