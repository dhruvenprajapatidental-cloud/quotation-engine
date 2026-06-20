/* ============================================================
   MAYURI ENTERPRISE – QUOTATION ENGINE  |  app.js
   Features: Page Count · Section Manager · Admin · Client DB
   ============================================================ */
'use strict';

/* ── PDF_CONFIG — every dimension is a slider in Admin Mode ── */
const DEFAULT_PDF_CONFIG = {
  logoSize:     48,
  pagePad:      30,
  quotationPt:  22,
  companyPt:    13,
  taglinePt:    6,
  metaPt:       7.5,
  addrPt:       7,
  quoteToPt:    10.5,
  thPt:         6.5,
  tdPt:         7.5,
  tdSubPt:      6.5,
  totalLabelPt: 7,
  totalValPt:   11,
  sec2HeadPt:   9,
  sec2BodyPt:   7,
  payPctPt:     9,
};
let PDF_CONFIG = JSON.parse(JSON.stringify(DEFAULT_PDF_CONFIG));

/* Scale all pt/px values for 1-page mode */
function scaledCfg(factor) {
  const C = {};
  const skip = ['leftSections','rightSections'];
  Object.keys(PDF_CONFIG).forEach(k => {
    C[k] = (!skip.includes(k) && typeof PDF_CONFIG[k] === 'number')
      ? Math.round(PDF_CONFIG[k] * factor * 10) / 10
      : PDF_CONFIG[k];
  });
  return C;
}

/* ── Default Data ── */
const DEFAULT_DATA = {
  company: {
    name:    'MAYURI ENTERPRISE',
    tagline: 'CONSTRUCTION & INTERIOR DESIGN',
    address: 'F/09, Pranam complex,\nNear urmi cross road, Akota, Vadodara',
    phone:   '9925342750',
    email:   'mayuri.enterprise1@gmail.com',
  },
  quote: { number: '', date: '', to: '' },
  headings: {
    termsSection:    'GENERAL CONDITIONS',
    notesSection:    'Notes',
    paymentSection:  'PAYMENT STRUCTURE',
    paymentSubtitle: 'The schedule of payment would be as follows:',
  },
  items: [],
  terms: [
    'ALL WORK ARE DONE WITH DESIGNERS CONCEPTUAL DESIGN.',
    'EXTRA WORK WILL CHARGE EXTRA & APPLICABLE.',
    'Validity Of The Quotation 20 Days.',
    'ALL TAXES ARE EXTRA.',
  ],
  payments: [
    { stage: 'Starting Of Work',         pct: '30' },
    { stage: 'After Tile Selection',     pct: '40' },
    { stage: 'Ongoing Work',             pct: '25' },
    { stage: 'After Completion Of Work', pct: '5'  },
  ],
  notes: [
    'In renovation work bathroom breaking tiling work, plumbing work, sanitaryware fitting will be done.',
    'Tile as per selection up to 60 sq/ft. And parking tile up to 30 sq/ft.',
    'In sanitaryware W.C, Diverter, Washbasin will be provided and all upto 30,000 in total.',
    'Plumbing work will be done in bathroom area in total.',
    'Outer major line work cost extra.',
    'Bathroom accessories will be cost extra.',
    'Electric work will be extra.',
  ],
  /* ── NEW: Page & Section Settings ── */
  pageCount: 2,                  /* 1 or 2 */
  sections: {                    /* toggle any section on/off */
    terms:   true,
    payment: true,
    notes:   true,
  },
  customSections: [],            /* [{heading, items:[], enabled}] */
};

let state = JSON.parse(JSON.stringify(DEFAULT_DATA));

/* ── Helpers ── */
const formatINR = n => isNaN(n)||n==='' ? '0' : Number(n).toLocaleString('en-IN',{maximumFractionDigits:2});
const parseNum  = s => parseFloat((s||'').toString().replace(/,/g,''))||0;
const formatDate = d => { if(!d) return ''; const [y,m,dd]=d.split('-'); return `${dd}-${m}-${y}`; };
function escHtml(s) {
  return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
const escNl = s => escHtml(s).replace(/\n/g,'<br>');
function showToast(msg, dur=3000) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

/* ============================================================
   PAGE COUNT & SECTION MANAGER
   ============================================================ */
function setPageCount(n) {
  state.pageCount = n;
  document.querySelectorAll('.pgcount-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.pages === n));
  showToast(`PDF → ${n} page${n>1?'s':''} per quotation`);
}

function toggleSection(name) {
  syncState();
  state.sections[name] = !state.sections[name];
  updateSectionUI(name);
}

function updateSectionUI(name) {
  const on = state.sections[name];
  /* dim the editor card */
  const card = document.querySelector(`.card[data-section="${name}"]`);
  if (card) card.classList.toggle('section-off', !on);
  /* update toggle button */
  const btn = document.getElementById(`sec-toggle-${name}`);
  if (btn) { btn.classList.toggle('on', on); btn.title = on ? 'Click to hide from PDF' : 'Click to show in PDF'; }
}

/* ── Custom Sections ── */
function renderCustomSections() {
  const container = document.getElementById('custom-sections-container');
  if (!container) return;
  container.innerHTML = '';
  state.customSections.forEach((sec, idx) => {
    const card = document.createElement('div');
    card.className = 'card card-custom' + (sec.enabled ? '' : ' section-off');
    card.dataset.section = `custom-${idx}`;
    card.innerHTML = `
      <div class="card-header">
        <span class="drag-handle">⠿</span>
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--brand-primary);flex-shrink:0;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
        <input type="text" class="heading-input custom-sec-title" value="${escHtml(sec.heading)}" placeholder="Section Title" data-idx="${idx}" />
        <button class="sec-toggle-btn ${sec.enabled?'on':''}" id="sec-toggle-custom-${idx}"
                onclick="toggleCustomSection(${idx})" title="${sec.enabled?'Hide from PDF':'Show in PDF'}">
          ${sec.enabled ? '● ON' : '○ OFF'}
        </button>
        <button class="btn-add-row" onclick="addCustomSectionItem(${idx})">
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Add
        </button>
        <button class="btn-del-item" style="margin-left:auto;" onclick="deleteCustomSection(${idx})" title="Delete section">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
      <div class="card-body">
        <div class="custom-items-list" id="custom-list-${idx}">
          ${sec.items.map((item,iIdx)=>`
            <div class="list-item">
              <span class="item-bullet">&#x2022;</span>
              <input type="text" value="${escHtml(item)}" placeholder="Enter text…" style="flex:1;"
                     oninput="syncCustomSectionItem(${idx},${iIdx},this.value)" />
              <button class="btn-del-item" onclick="deleteCustomSectionItem(${idx},${iIdx})">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>`).join('')}
          ${sec.items.length===0?'<div class="list-empty">No items — click Add</div>':''}
        </div>
      </div>`;
    /* sync title on change */
    card.querySelector('.custom-sec-title').addEventListener('input', e => {
      state.customSections[idx].heading = e.target.value;
    });
    container.appendChild(card);
  });
}

function addCustomSection() {
  syncState();
  state.customSections.push({ heading: 'Custom Section', items: [], enabled: true });
  renderCustomSections();
  /* focus new heading */
  const inputs = document.querySelectorAll('.custom-sec-title');
  inputs[inputs.length-1]?.focus();
}

function deleteCustomSection(idx) {
  syncState();
  state.customSections.splice(idx, 1);
  renderCustomSections();
}

function toggleCustomSection(idx) {
  syncState();
  state.customSections[idx].enabled = !state.customSections[idx].enabled;
  renderCustomSections();
}

function addCustomSectionItem(idx) {
  syncState();
  state.customSections[idx].items.push('');
  renderCustomSections();
  const lists = document.querySelectorAll(`#custom-list-${idx} .list-item input`);
  lists[lists.length-1]?.focus();
}

function deleteCustomSectionItem(sIdx, iIdx) {
  syncState();
  state.customSections[sIdx].items.splice(iIdx, 1);
  renderCustomSections();
}

function syncCustomSectionItem(sIdx, iIdx, val) {
  if (state.customSections[sIdx]) state.customSections[sIdx].items[iIdx] = val;
}

/* ============================================================
   CLIENT MANAGER
   ============================================================ */
/* ═══ CLIENT MANAGER (CloudSync-backed) ═══ */

async function saveClient() {
  syncState();
  const name = document.getElementById('client-name-input').value.trim();
  if (!name) { showToast('⚠ Enter a client name first.'); return; }
  await CloudSync.saveQuotation(name, state, PDF_CONFIG);
  await renderClientList();
  showToast(`✅ Saved — "${name}"`);
}

async function loadClient(name) {
  const clients = await CloudSync.loadQuotations();
  if (!clients[name]) return;
  state      = JSON.parse(JSON.stringify(clients[name].state));
  PDF_CONFIG = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_PDF_CONFIG)), clients[name].cfg||{});
  document.getElementById('client-name-input').value = name;
  initForm();
  syncAdminSliders();
  showToast(`📂 Loaded — "${name}"`);
}

async function deleteCurrentClient() {
  const name = document.getElementById('client-name-input').value.trim();
  if (!name) { showToast('⚠ No client name.'); return; }
  if (!confirm(`Delete client "${name}"?`)) return;
  await CloudSync.deleteQuotation(name);
  await renderClientList();
  showToast(`🗑 Deleted — "${name}"`);
}

function newClient() {
  if (!confirm('Start a new blank quotation?')) return;
  state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  PDF_CONFIG = JSON.parse(JSON.stringify(DEFAULT_PDF_CONFIG));
  document.getElementById('client-name-input').value = '';
  initForm(); syncAdminSliders();
}

async function renderClientList() {
  const sel = document.getElementById('client-select');
  if (!sel) return;
  const clients = await CloudSync.loadQuotations();
  const names = Object.keys(clients);
  sel.innerHTML = names.length
    ? '<option value="">Load client…</option>' + names.map(n=>`<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('')
    : '<option value="">— No saved clients —</option>';
  sel.onchange = async ()=>{ if(sel.value){ await loadClient(sel.value); sel.value=''; } };
  /* Real-time listener so any device save updates the dropdown */
  CloudSync.subscribeQuotations(() => renderClientList());
}

/* ============================================================
   ADMIN MODE
   ============================================================ */
let adminMode = false;
function toggleAdmin() {
  adminMode = !adminMode;
  document.body.classList.toggle('admin-active', adminMode);
  document.getElementById('admin-btn').classList.toggle('active', adminMode);
  document.getElementById('admin-panel').classList.toggle('open', adminMode);
  enableCardDrag();
}

const SLIDERS = [
  ['sl-logo','Logo Size (px)','logoSize',32,80,2],
  ['sl-pad','Page Padding (px)','pagePad',20,50,2],
  ['sl-quotation','"QUOTATION" (pt)','quotationPt',14,34,1],
  ['sl-company','Company Name (pt)','companyPt',9,22,1],
  ['sl-tagline','Tagline (pt)','taglinePt',4,10,0.5],
  ['sl-meta','Quote No/Date (pt)','metaPt',5,12,0.5],
  ['sl-addr','Address Text (pt)','addrPt',5,11,0.5],
  ['sl-quoteto','Quote-To Name (pt)','quoteToPt',7,16,0.5],
  ['sl-th','Table Header (pt)','thPt',5,10,0.5],
  ['sl-td','Table Body (pt)','tdPt',5,11,0.5],
  ['sl-tdsub','Table Sub-Desc (pt)','tdSubPt',4,9,0.5],
  ['sl-totlabel','Total Label (pt)','totalLabelPt',5,12,0.5],
  ['sl-totval','Total Value (pt)','totalValPt',7,18,0.5],
  ['sl-s2head','Section Heading (pt)','sec2HeadPt',6,14,0.5],
  ['sl-s2body','Section Body (pt)','sec2BodyPt',5,11,0.5],
  ['sl-paypct','Payment % (pt)','payPctPt',6,14,0.5],
];

function buildAdminPanel() {
  const panel = document.getElementById('admin-sliders');
  if (!panel) return;
  panel.innerHTML = SLIDERS.map(([id,label,key,min,max,step])=>`
    <div class="admin-row">
      <label for="${id}">${label}</label>
      <div class="slider-wrap">
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${PDF_CONFIG[key]}"
               oninput="PDF_CONFIG['${key}']=+this.value;document.getElementById('${id}-val').textContent=this.value;refreshPreviewIfOpen();" />
        <span id="${id}-val" class="slider-val">${PDF_CONFIG[key]}</span>
      </div>
    </div>`).join('');
}

function syncAdminSliders() {
  SLIDERS.forEach(([id,,key])=>{
    const el=document.getElementById(id);
    if(el){el.value=PDF_CONFIG[key];document.getElementById(id+'-val').textContent=PDF_CONFIG[key];}
  });
}

function refreshPreviewIfOpen() {
  if(document.getElementById('tab-preview')?.classList.contains('active')){syncState();renderPreview();}
}

/* ── Tab ── */
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.getElementById('nav-'+tab).classList.add('active');
  document.getElementById('page-title-label').textContent = {editor:'Edit Quotation',preview:'Preview PDF'}[tab]||tab;
  if(tab==='preview'){syncState();renderPreview();}
}

/* ── Sync DOM → state ── */
function syncState() {
  state.company.name    = document.getElementById('company-name').value;
  state.company.tagline = document.getElementById('company-tagline').value;
  state.company.address = document.getElementById('company-address').value;
  state.company.phone   = document.getElementById('company-phone').value;
  state.company.email   = document.getElementById('company-email').value;
  state.quote.number    = document.getElementById('quote-number').value;
  state.quote.date      = document.getElementById('quote-date').value;
  state.quote.to        = document.getElementById('quote-to').value;
  state.headings.termsSection    = document.getElementById('heading-terms').value   ||state.headings.termsSection;
  state.headings.notesSection    = document.getElementById('heading-notes').value   ||state.headings.notesSection;
  state.headings.paymentSection  = document.getElementById('heading-payment').value ||state.headings.paymentSection;
  state.headings.paymentSubtitle = document.getElementById('heading-pay-sub').value ||state.headings.paymentSubtitle;

  state.items=[];
  document.querySelectorAll('#items-tbody tr:not(.empty-row)').forEach(row=>{
    state.items.push({
      desc:row.querySelector('.td-desc')?.value||'',
      subDesc:row.querySelector('.td-subdesc')?.value||'',
      qty:row.querySelector('.td-qty')?.value||'',
      unit:row.querySelector('.td-unit')?.value||'',
      rate:row.querySelector('.td-rate')?.value||'',
    });
  });
  state.terms=[];
  document.querySelectorAll('#terms-list .list-item input').forEach(i=>{if(i.value.trim())state.terms.push(i.value.trim());});
  state.payments=[];
  document.querySelectorAll('#payments-list .payment-item').forEach(item=>{
    state.payments.push({stage:item.querySelector('.pay-stage')?.value||'',pct:item.querySelector('.pct-input')?.value||''});
  });
  state.notes=[];
  document.querySelectorAll('#notes-list .list-item input').forEach(i=>{if(i.value.trim())state.notes.push(i.value.trim());});
  /* custom sections titles/items already synced live */
}

function calcTotal() {
  let total=0;
  document.querySelectorAll('#items-tbody tr:not(.empty-row)').forEach(row=>{
    const qty=parseNum(row.querySelector('.td-qty')?.value);
    const rate=parseNum(row.querySelector('.td-rate')?.value);
    const amt=qty*rate;
    const cell=row.querySelector('.td-amount'); if(cell)cell.textContent='₹ '+formatINR(amt);
    total+=amt;
  });
  document.getElementById('total-display').textContent='₹ '+formatINR(total);
  return total;
}
function updateQuoteBadge(){const e=document.getElementById('quote-badge-display');if(e)e.textContent='QUOTE #'+document.getElementById('quote-number').value;}

/* ── Items ── */
function renderItems(){
  const tbody=document.getElementById('items-tbody'); tbody.innerHTML='';
  if(!state.items.length){
    tbody.innerHTML=`<tr class="empty-row"><td colspan="6"><div style="text-align:center;padding:22px;color:#8e8c87;font-size:13px;">No items yet — click <strong>Add Item</strong></div></td></tr>`;
    document.getElementById('total-display').textContent='₹ 0'; return;
  }
  state.items.forEach((item,idx)=>tbody.appendChild(createItemRow(item,idx))); calcTotal();
}
function createItemRow(item,idx){
  const tr=document.createElement('tr'); tr.dataset.idx=idx;
  tr.innerHTML=`
    <td><input type="text" class="td-desc" value="${escHtml(item.desc)}" placeholder="Item description" oninput="calcTotal()" />
    <textarea class="td-subdesc" rows="2" placeholder="Sub-description (optional)">${escHtml(item.subDesc)}</textarea></td>
    <td><input type="number" class="td-qty"  value="${escHtml(item.qty)}"  placeholder="0"    min="0" oninput="calcTotal()" style="text-align:center;" /></td>
    <td><input type="text"   class="td-unit" value="${escHtml(item.unit)}" placeholder="Nos" /></td>
    <td><input type="number" class="td-rate" value="${escHtml(item.rate)}" placeholder="0.00" min="0" step="0.01" oninput="calcTotal()" style="text-align:right;" /></td>
    <td class="td-amount amount-cell">₹ ${formatINR(parseNum(item.qty)*parseNum(item.rate))}</td>
    <td><button class="btn-delete-row" onclick="deleteRow(${idx})"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></td>`;
  return tr;
}
function addRow(){syncState();state.items.push({desc:'',subDesc:'',qty:'',unit:'',rate:''});renderItems();document.querySelectorAll('#items-tbody tr:not(.empty-row) .td-desc')[state.items.length-1]?.focus();}
function deleteRow(idx){syncState();state.items.splice(idx,1);renderItems();}

/* ── Terms / Payments / Notes ── */
function renderTerms(){const l=document.getElementById('terms-list');l.innerHTML='';if(!state.terms.length){l.innerHTML='<div class="list-empty">No conditions — click Add</div>';return;}state.terms.forEach((t,i)=>l.appendChild(mkListItem(t,i,'deleteTerm')));}
function addTerm(){syncState();state.terms.push('');renderTerms();document.querySelectorAll('#terms-list .list-item input')[state.terms.length-1]?.focus();}
function deleteTerm(idx){syncState();state.terms.splice(idx,1);renderTerms();}

function renderPayments(){const l=document.getElementById('payments-list');l.innerHTML='';if(!state.payments.length){l.innerHTML='<div class="list-empty">No stages — click Add</div>';return;}state.payments.forEach((p,i)=>l.appendChild(mkPayItem(p,i)));}
function mkPayItem(p,idx){const d=document.createElement('div');d.className='payment-item';d.innerHTML=`<span class="stage-num">${idx+1}.</span><input type="text" class="pay-stage" value="${escHtml(p.stage)}" placeholder="Stage description" /><input type="number" class="pct-input" value="${escHtml(p.pct)}" placeholder="%" min="0" max="100" /><span class="pct-label">%</span><button class="btn-del-item" onclick="deletePayment(${idx})"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`;return d;}
function addPayment(){syncState();state.payments.push({stage:'',pct:''});renderPayments();document.querySelectorAll('#payments-list .payment-item .pay-stage')[state.payments.length-1]?.focus();}
function deletePayment(idx){syncState();state.payments.splice(idx,1);renderPayments();}

function renderNotes(){const l=document.getElementById('notes-list');l.innerHTML='';if(!state.notes.length){l.innerHTML='<div class="list-empty">No notes — click Add</div>';return;}state.notes.forEach((n,i)=>l.appendChild(mkListItem(n,i,'deleteNote')));}
function addNote(){syncState();state.notes.push('');renderNotes();document.querySelectorAll('#notes-list .list-item input')[state.notes.length-1]?.focus();}
function deleteNote(idx){syncState();state.notes.splice(idx,1);renderNotes();}

function mkListItem(text,idx,delFn){const d=document.createElement('div');d.className='list-item';d.innerHTML=`<span class="item-bullet">&#x2022;</span><input type="text" value="${escHtml(text)}" placeholder="Enter text…" style="flex:1;" /><button class="btn-del-item" onclick="${delFn}(${idx})"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`;return d;}

/* ── Drag & Drop ── */
let dragSrc=null;
function enableCardDrag(){
  document.querySelectorAll('.card[data-section]').forEach(card=>{
    card.draggable=adminMode;
    card.ondragstart=e=>{dragSrc=card;card.classList.add('dragging');};
    card.ondragend=()=>{dragSrc=null;card.classList.remove('dragging');document.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-over'));};
    card.ondragover=e=>{e.preventDefault();if(card!==dragSrc)card.classList.add('drag-over');};
    card.ondragleave=()=>card.classList.remove('drag-over');
    card.ondrop=e=>{e.preventDefault();card.classList.remove('drag-over');if(!dragSrc||dragSrc===card)return;const g=document.querySelector('.editor-grid');const cards=[...g.querySelectorAll('.card[data-section]')];cards.indexOf(dragSrc)<cards.indexOf(card)?card.after(dragSrc):card.before(dragSrc);};
  });
}

/* ── Logo ── */
let LOGO_PNG='';
function buildLogoPNG(){
  const S=240,c=document.createElement('canvas');c.width=S;c.height=S;
  const ctx=c.getContext('2d'),R=30;
  ctx.fillStyle='#1c2a42';ctx.beginPath();ctx.moveTo(R,0);ctx.lineTo(S-R,0);ctx.quadraticCurveTo(S,0,S,R);ctx.lineTo(S,S-R);ctx.quadraticCurveTo(S,S,S-R,S);ctx.lineTo(R,S);ctx.quadraticCurveTo(0,S,0,S-R);ctx.lineTo(0,R);ctx.quadraticCurveTo(0,0,R,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d4a017';ctx.font=`normal ${Math.round(S*.59)}px "Times New Roman",Times,Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('M',S/2,S/2+S*.03);
  LOGO_PNG=c.toDataURL('image/png');
}

/* ============================================================
   PDF TEMPLATES
   ============================================================ */
const IFRAME_FONTS=`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@700;800&family=Open+Sans:wght@700;800&display=swap" rel="stylesheet">`;
const IFRAME_RESET=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{width:595px;height:842px;overflow:hidden;background:#faf9f5}body{font-family:'IBM Plex Sans',Arial,sans-serif}`;

/* ─── shared snippet builders ─── */
function _headerHTML(s, C) {
  const addrLines=(s.company.address||'').split('\n');
  const P=C.pagePad, L=Math.round(C.logoSize);
  return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:${Math.round(P*.4)}px;">
    <img src="${LOGO_PNG}" width="${L}" height="${L}" style="display:block;border-radius:${Math.round(L*.17)}px;flex-shrink:0;" />
    <div style="font-family:'Open Sans',Arial,sans-serif;font-size:${C.quotationPt}pt;font-weight:800;color:#1d293b;letter-spacing:2px;line-height:1;">QUOTATION</div>
  </div>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:${Math.round(P*.33)}px;">
    <div>
      <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.companyPt}pt;font-weight:800;color:#1d293b;letter-spacing:0.5px;">${escHtml(s.company.name)}</div>
      <div style="font-size:${C.taglinePt}pt;font-weight:600;color:#b08d57;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;">${escHtml(s.company.tagline)}</div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:20px;">
      <div style="display:flex;align-items:baseline;justify-content:flex-end;gap:8px;margin-bottom:3px;">
        <span style="font-size:${Math.max(C.metaPt-1.5,5)}pt;font-weight:700;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">QUOTE NO:</span>
        <span style="font-size:${C.metaPt}pt;font-weight:700;color:#1d293b;">${escHtml(s.quote.number)}</span>
      </div>
      <div style="display:flex;align-items:baseline;justify-content:flex-end;gap:8px;">
        <span style="font-size:${Math.max(C.metaPt-1.5,5)}pt;font-weight:700;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">DATE:</span>
        <span style="font-size:${C.metaPt}pt;font-weight:700;color:#1d293b;">${formatDate(s.quote.date)}</span>
      </div>
    </div>
  </div>
  <div style="font-size:${C.addrPt}pt;color:#4a4a45;line-height:1.6;margin-bottom:2px;">${addrLines.map(l=>`<div>${escHtml(l)}</div>`).join('')}</div>
  <div style="font-size:${C.addrPt}pt;color:#4a4a45;margin-bottom:${Math.round(P*.4)}px;">
    <span style="font-weight:700;color:#1d293b;">Mo:</span> ${escHtml(s.company.phone)}&nbsp;&nbsp;
    <span style="font-weight:700;color:#1d293b;">| Mail:</span> ${escHtml(s.company.email)}
  </div>
  <div style="border-top:1px solid #dedad2;margin-bottom:${Math.round(P*.4)}px;"></div>
  <div style="background:#f0ede7;border-left:3px solid #c9a227;padding:6px 12px;border-radius:0 3px 3px 0;margin-bottom:${Math.round(P*.45)}px;">
    <div style="font-size:${Math.max(C.thPt-0.5,5)}pt;font-weight:700;color:#8e8c87;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">QUOTE TO</div>
    <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.quoteToPt}pt;font-weight:700;color:#1d293b;">${escHtml(s.quote.to)}</div>
  </div>`;
}

function _itemsTableHTML(s, C) {
  const total=s.items.reduce((sum,i)=>sum+parseNum(i.qty)*parseNum(i.rate),0);
  const rows=!s.items.length
    ? `<tr><td colspan="5" style="padding:10px;text-align:center;color:#8e8c87;font-size:${C.tdPt}pt;">No items added</td></tr>`
    : s.items.map((item,idx)=>{
        const amt=parseNum(item.qty)*parseNum(item.rate);
        const bg=idx%2===0?'#ffffff':'#f3f1ec';
        const sub=item.subDesc?`<div style="font-size:${C.tdSubPt}pt;color:#8e8c87;margin-top:2px;line-height:1.3;">${escNl(item.subDesc)}</div>`:'';
        return `<tr style="background:${bg};">
          <td style="padding:6px 10px;vertical-align:top;border-bottom:1px solid #e5e2da;"><div style="font-weight:700;font-size:${C.tdPt}pt;color:#1d293b;">${escHtml(item.desc)}</div>${sub}</td>
          <td style="padding:6px 5px;text-align:center;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${escHtml(item.qty)}</td>
          <td style="padding:6px 5px;text-align:center;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${escHtml(item.unit)}</td>
          <td style="padding:6px 10px;text-align:right;vertical-align:middle;font-size:${C.tdPt}pt;color:#1d293b;border-bottom:1px solid #e5e2da;">${formatINR(parseNum(item.rate))}</td>
          <td style="padding:6px 10px;text-align:right;vertical-align:middle;font-size:${C.tdPt}pt;font-weight:700;color:#1d293b;border-bottom:1px solid #e5e2da;">${formatINR(amt)}</td>
        </tr>`;
      }).join('');
  return { rows, total };
}

function _sectionBlockHTML(heading, bullets, C) {
  const body = !bullets.length
    ? `<div style="font-size:${C.sec2BodyPt}pt;color:#8e8c87;font-style:italic;">—</div>`
    : bullets.map(t=>`<div style="display:flex;align-items:flex-start;gap:4px;font-size:${C.sec2BodyPt}pt;color:#4a4a45;line-height:1.5;margin-bottom:4px;"><span style="flex-shrink:0;">&#x2022;</span><span>${escHtml(t)}</span></div>`).join('');
  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.sec2HeadPt}pt;font-weight:800;color:#1d293b;margin-bottom:3px;">${escHtml(heading)}</div>
    <div style="border-top:1.5px solid #1d293b;margin-bottom:8px;"></div>
    ${body}`;
}

/* ─── Page 1 (items page) ─── */
function buildPage1HTML(s, cfg) {
  const C=cfg||PDF_CONFIG, P=C.pagePad;
  const {rows,total}=_itemsTableHTML(s,C);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${IFRAME_FONTS}
<style>${IFRAME_RESET}table{border-collapse:collapse;width:100%}th{white-space:nowrap;word-break:keep-all}</style>
</head><body>
<div style="width:595px;height:842px;background:#faf9f5;padding:${P}px ${P+8}px;position:relative;overflow:hidden;">
  ${_headerHTML(s,C)}
  <table>
    <thead><tr style="background:#1d293b;">
      <th style="padding:7px 10px;text-align:left;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:42%;">Description of Work</th>
      <th style="padding:7px 5px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:7%;">Qty</th>
      <th style="padding:7px 5px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:10%;">Units</th>
      <th style="padding:7px 10px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:18%;">Rate</th>
      <th style="padding:7px 10px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.8px;text-transform:uppercase;width:23%;">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:18px;border-top:1.5px solid #1d293b;border-bottom:1.5px solid #1d293b;padding:7px 10px;">
    <span style="font-size:${C.totalLabelPt}pt;font-weight:700;color:#1d293b;letter-spacing:1px;text-transform:uppercase;">TOTAL AMOUNT:</span>
    <span style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.totalValPt}pt;font-weight:800;color:#1d293b;">&#8377;&nbsp;${formatINR(total)}</span>
  </div>
  <div style="position:absolute;bottom:14px;right:${P+8}px;font-size:6.5pt;color:#8e8c87;">Page 1 of 2</div>
</div></body></html>`;
}

/* ─── Page 2 (sections page) ─── */
function buildPage2HTML(s, cfg) {
  const C=cfg||PDF_CONFIG, h=s.headings, P=C.pagePad;
  const vis=s.sections||{terms:true,payment:true,notes:true};

  /* payment rows */
  const payRows=!s.payments.length
    ? `<div style="font-size:${C.sec2BodyPt}pt;color:#8e8c87;font-style:italic;">—</div>`
    : s.payments.map((p,i)=>`<div style="display:flex;align-items:center;border-bottom:1px dashed #ccc;padding:6px 0;">
        <span style="font-size:${C.sec2BodyPt+0.5}pt;color:#4a4a45;flex:1;">${i+1}.&nbsp;${escHtml(p.stage)}</span>
        <span style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.payPctPt}pt;font-weight:800;color:#1d293b;min-width:32px;text-align:right;">${escHtml(p.pct)}%</span>
      </div>`).join('');

  /* collect all active sections for layout */
  const leftParts  = [];
  const rightParts = [];

  if (vis.terms) leftParts.push(_sectionBlockHTML(h.termsSection, s.terms, C));
  if (vis.notes) leftParts.push(`
    <div style="margin-top:12px;">
      <div style="font-size:${C.sec2BodyPt+0.5}pt;font-weight:700;font-style:italic;color:#1d293b;margin-bottom:7px;">${escHtml(h.notesSection)}</div>
      ${!s.notes.length?`<div style="font-size:${C.sec2BodyPt}pt;color:#8e8c87;font-style:italic;">—</div>`:s.notes.map(n=>`<div style="display:flex;align-items:flex-start;gap:4px;font-size:${C.sec2BodyPt}pt;color:#4a4a45;line-height:1.5;margin-bottom:4px;"><span style="flex-shrink:0;">&#x2022;</span><span>${escHtml(n)}</span></div>`).join('')}
    </div>`);

  if (vis.payment) rightParts.push(`
    <div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.sec2HeadPt}pt;font-weight:800;color:#1d293b;margin-bottom:3px;">${escHtml(h.paymentSection)}</div>
    <div style="border-top:1.5px solid #1d293b;margin-bottom:7px;"></div>
    <div style="font-size:${C.sec2BodyPt}pt;color:#4a4a45;margin-bottom:8px;">${escHtml(h.paymentSubtitle)}</div>
    ${payRows}`);

  /* custom sections — split evenly between left and right */
  const customEnabled=(s.customSections||[]).filter(cs=>cs.enabled);
  customEnabled.forEach((cs,i) => {
    const block=_sectionBlockHTML(cs.heading, cs.items, C);
    (i%2===0 ? rightParts : leftParts).push(`<div style="margin-top:14px;">${block}</div>`);
  });

  /* if all off, show placeholder */
  const noSections = leftParts.length===0 && rightParts.length===0;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${IFRAME_FONTS}
<style>${IFRAME_RESET}</style></head><body>
<div style="width:595px;height:842px;background:#faf9f5;padding:${P}px ${P+8}px ${P+18}px;position:relative;overflow:hidden;">
  ${noSections
    ? `<div style="font-size:9pt;color:#8e8c87;text-align:center;margin-top:40px;font-style:italic;">All sections are hidden</div>`
    : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;">
        <div>${leftParts.join('')}</div>
        <div>${rightParts.join('')}</div>
      </div>`}
  <div style="position:absolute;bottom:${P+4}px;left:${P+8}px;right:${P+8}px;border-top:1px solid #dedad2;"></div>
  <div style="position:absolute;bottom:${Math.round(P*.6)}px;left:0;right:0;text-align:center;font-size:6.5pt;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">${escHtml(s.company.name)} &nbsp;&#x2022;&nbsp; ${escHtml(s.company.tagline)} STUDIO</div>
  <div style="position:absolute;bottom:14px;right:${P+8}px;font-size:6.5pt;color:#8e8c87;">Page 2 of 2</div>
</div></body></html>`;
}

/* ─── Single page (1-page mode) — scale 0.72 ─── */
function buildSinglePageHTML(s) {
  const C=scaledCfg(0.72), h=s.headings, P=C.pagePad;
  const vis=s.sections||{terms:true,payment:true,notes:true};
  const {rows,total}=_itemsTableHTML(s,C);

  const payRows=!s.payments.length?`<div style="font-size:${C.sec2BodyPt}pt;color:#8e8c87;font-style:italic;">—</div>`
    :s.payments.map((p,i)=>`<div style="display:flex;align-items:center;border-bottom:1px dashed #ccc;padding:4px 0;"><span style="font-size:${C.sec2BodyPt+0.5}pt;color:#4a4a45;flex:1;">${i+1}.&nbsp;${escHtml(p.stage)}</span><span style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.payPctPt}pt;font-weight:800;color:#1d293b;min-width:28px;text-align:right;">${escHtml(p.pct)}%</span></div>`).join('');

  /* build section columns for bottom grid */
  const leftParts=[], rightParts=[];
  if(vis.terms) leftParts.push(_sectionBlockHTML(h.termsSection, s.terms, C));
  if(vis.notes) leftParts.push(`<div style="margin-top:8px;"><div style="font-size:${C.sec2BodyPt+0.5}pt;font-weight:700;font-style:italic;color:#1d293b;margin-bottom:5px;">${escHtml(h.notesSection)}</div>${!s.notes.length?`<div style="font-size:${C.sec2BodyPt}pt;color:#8e8c87;font-style:italic;">—</div>`:s.notes.map(n=>`<div style="display:flex;align-items:flex-start;gap:4px;font-size:${C.sec2BodyPt}pt;color:#4a4a45;line-height:1.45;margin-bottom:3px;"><span style="flex-shrink:0;">&#x2022;</span><span>${escHtml(n)}</span></div>`).join('')}</div>`);
  if(vis.payment) rightParts.push(`<div style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.sec2HeadPt}pt;font-weight:800;color:#1d293b;margin-bottom:3px;">${escHtml(h.paymentSection)}</div><div style="border-top:1.5px solid #1d293b;margin-bottom:5px;"></div><div style="font-size:${C.sec2BodyPt}pt;color:#4a4a45;margin-bottom:6px;">${escHtml(h.paymentSubtitle)}</div>${payRows}`);
  const customEnabled=(s.customSections||[]).filter(cs=>cs.enabled);
  customEnabled.forEach((cs,i)=>{ const b=_sectionBlockHTML(cs.heading,cs.items,C); (i%2===0?rightParts:leftParts).push(`<div style="margin-top:10px;">${b}</div>`); });

  const noSections=leftParts.length===0&&rightParts.length===0;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${IFRAME_FONTS}
<style>${IFRAME_RESET}table{border-collapse:collapse;width:100%}th{white-space:nowrap;word-break:keep-all}</style>
</head><body>
<div style="width:595px;height:842px;background:#faf9f5;padding:${P}px ${P+8}px;position:relative;overflow:hidden;">
  ${_headerHTML(s,C)}
  <table>
    <thead><tr style="background:#1d293b;">
      <th style="padding:5px 8px;text-align:left;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;letter-spacing:0.6px;text-transform:uppercase;width:42%;">Description of Work</th>
      <th style="padding:5px 4px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:7%;">Qty</th>
      <th style="padding:5px 4px;text-align:center;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:10%;">Units</th>
      <th style="padding:5px 8px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:18%;">Rate</th>
      <th style="padding:5px 8px;text-align:right;font-size:${C.thPt}pt;font-weight:700;color:#c9a227;text-transform:uppercase;width:23%;">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;align-items:center;gap:14px;border-top:1.5px solid #1d293b;border-bottom:1.5px solid #1d293b;padding:5px 8px;margin-bottom:10px;">
    <span style="font-size:${C.totalLabelPt}pt;font-weight:700;color:#1d293b;letter-spacing:1px;text-transform:uppercase;">TOTAL AMOUNT:</span>
    <span style="font-family:'Montserrat',Arial,sans-serif;font-size:${C.totalValPt}pt;font-weight:800;color:#1d293b;">&#8377;&nbsp;${formatINR(total)}</span>
  </div>
  ${noSections?'':`
  <div style="border-top:1px solid #dedad2;margin-bottom:8px;"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div>${leftParts.join('')}</div>
    <div>${rightParts.join('')}</div>
  </div>`}
  <div style="position:absolute;bottom:${P+4}px;left:${P+8}px;right:${P+8}px;border-top:1px solid #dedad2;"></div>
  <div style="position:absolute;bottom:${Math.round(P*.6)}px;left:0;right:0;text-align:center;font-size:5.5pt;color:#8e8c87;letter-spacing:1px;text-transform:uppercase;">${escHtml(s.company.name)} &nbsp;&#x2022;&nbsp; ${escHtml(s.company.tagline)} STUDIO</div>
  <div style="position:absolute;bottom:12px;right:${P+8}px;font-size:5.5pt;color:#8e8c87;">Page 1 of 1</div>
</div></body></html>`;
}

/* ── Preview ── */
function renderPreview() {
  syncState();
  const body=h=>h.replace(/^[\s\S]*?<body[^>]*>/i,'').replace(/<\/body[\s\S]*$/i,'');
  const wrapper=document.getElementById('pdf-preview-wrapper');
  if(state.pageCount===1){
    wrapper.innerHTML=body(buildSinglePageHTML(state));
  } else {
    wrapper.innerHTML=`<div style="display:flex;flex-direction:column;">
      <div style="border-bottom:3px solid #ccc;">${body(buildPage1HTML(state,PDF_CONFIG))}</div>
      ${body(buildPage2HTML(state,PDF_CONFIG))}
    </div>`;
  }
}

/* ============================================================
   GENERATE PDF — 4× scale / PNG lossless
   ============================================================ */
async function generatePDF() {
  syncState();
  const pages = state.pageCount===1 ? 1 : 2;
  showToast(`⏳ Rendering ${pages}-page PDF… ~${pages*3}s`);
  const A4_W=595,A4_H=842,SCALE=4;

  async function render(html){
    return new Promise((res,rej)=>{
      const f=document.createElement('iframe');
      f.style.cssText=`position:fixed;left:-9999px;top:0;width:${A4_W}px;height:${A4_H}px;border:none;opacity:0;pointer-events:none;overflow:hidden;`;
      document.body.appendChild(f);
      const d=f.contentDocument||f.contentWindow.document;
      d.open();d.write(html);d.close();
      setTimeout(()=>{
        html2canvas(d.body,{scale:SCALE,useCORS:true,allowTaint:true,foreignObjectRendering:false,
          backgroundColor:'#faf9f5',width:A4_W,height:A4_H,windowWidth:A4_W,windowHeight:A4_H,
          imageTimeout:25000,logging:false,
          onclone:doc=>{doc.body.style.cssText=`width:${A4_W}px;height:${A4_H}px;overflow:hidden;background:#faf9f5;`;}
        }).then(c=>{document.body.removeChild(f);res(c);}).catch(e=>{document.body.removeChild(f);rej(e);});
      },2500);
    });
  }

  try {
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
    if(state.pageCount===1){
      const c=await render(buildSinglePageHTML(state));
      pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,210,297,'','FAST');
    } else {
      const c1=await render(buildPage1HTML(state,PDF_CONFIG));
      const c2=await render(buildPage2HTML(state,PDF_CONFIG));
      pdf.addImage(c1.toDataURL('image/png'),'PNG',0,0,210,297,'','FAST');
      pdf.addPage();
      pdf.addImage(c2.toDataURL('image/png'),'PNG',0,0,210,297,'','FAST');
    }
    pdf.save(`Quotation_${state.quote.number||'Draft'}_${(state.company.name||'').replace(/\s+/g,'_')}.pdf`);
    showToast('✅ PDF downloaded!',4000);
    const pill=document.getElementById('status-pill');
    if(pill) pill.innerHTML=`<span class="status-dot" style="background:#4caf50;"></span>Exported`;
  } catch(e){console.error(e);showToast('❌ Error generating PDF.',4000);}
}

/* ── Reset ── */
function resetForm(){
  if(!confirm('Reset all fields?')) return;
  state=JSON.parse(JSON.stringify(DEFAULT_DATA));
  PDF_CONFIG=JSON.parse(JSON.stringify(DEFAULT_PDF_CONFIG));
  initForm();syncAdminSliders();showToast('Form reset.');
}

/* ── Init ── */
function initForm(){
  buildLogoPNG();
  if(!state.quote.date) state.quote.date=new Date().toISOString().slice(0,10);
  if(!state.sections) state.sections={terms:true,payment:true,notes:true};
  if(!state.customSections) state.customSections=[];
  if(!state.pageCount) state.pageCount=2;

  document.getElementById('company-name').value    =state.company.name;
  document.getElementById('company-tagline').value =state.company.tagline;
  document.getElementById('company-address').value =state.company.address;
  document.getElementById('company-phone').value   =state.company.phone;
  document.getElementById('company-email').value   =state.company.email;
  document.getElementById('quote-number').value    =state.quote.number;
  document.getElementById('quote-date').value      =state.quote.date;
  document.getElementById('quote-to').value        =state.quote.to;
  document.getElementById('heading-terms').value    =state.headings.termsSection;
  document.getElementById('heading-notes').value    =state.headings.notesSection;
  document.getElementById('heading-payment').value  =state.headings.paymentSection;
  document.getElementById('heading-pay-sub').value  =state.headings.paymentSubtitle;

  /* page count buttons */
  document.querySelectorAll('.pgcount-btn').forEach(b=>b.classList.toggle('active',+b.dataset.pages===state.pageCount));

  /* section toggles */
  Object.keys(state.sections).forEach(name=>updateSectionUI(name));

  updateQuoteBadge();
  renderItems();renderTerms();renderPayments();renderNotes();
  renderCustomSections();
  enableCardDrag();
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();generatePDF();}
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();switchTab('preview');}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveClient();}
});
/* DOMContentLoaded is handled by index.html inline script (cloud modal → connectCloud → initForm) */
document.addEventListener('DOMContentLoaded',()=>{ initForm(); buildAdminPanel(); });
