/* ============================================================
   CLOUD SYNC MODULE  |  cloud-sync.js
   Provides cross-device data sync via Firebase Firestore.
   Falls back to localStorage if Firebase is not configured.
   ============================================================ */
'use strict';

const CloudSync = {
  db:      null,
  pin:     null,
  ready:   false,

  /* ── Init with company PIN ── */
  async init(pin) {
    this.pin = pin;
    localStorage.setItem('me_company_pin', pin);
    this._updateStatus('local');

    const cfg = window.FIREBASE_CONFIG;
    const configured = cfg && cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY';
    if (!configured || !window.firebase) {
      console.info('CloudSync: Firebase not configured → localStorage only');
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      this.db = firebase.firestore();
      /* Enable offline persistence so it works briefly offline too */
      await this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      this.ready = true;
      this._updateStatus('synced');
      console.info('CloudSync: Connected to Firestore ✓');
      return true;
    } catch (e) {
      console.error('CloudSync: Firebase error', e);
      this._updateStatus('error');
      return false;
    }
  },

  /* ── Firestore collection path ── */
  _col(name) {
    return this.db.collection('companies').doc(this.pin).collection(name);
  },

  /* ── Status badge in UI ── */
  _updateStatus(status) {
    const el = document.getElementById('cloud-status');
    if (!el) return;
    const map = {
      local:   { icon: '💾', text: 'Local Only',   cls: 'cs-local'   },
      synced:  { icon: '☁',  text: 'Cloud Synced', cls: 'cs-synced'  },
      syncing: { icon: '⟳',  text: 'Syncing…',     cls: 'cs-syncing' },
      error:   { icon: '⚠',  text: 'Sync Error',   cls: 'cs-error'   },
    };
    const s = map[status] || map.local;
    el.innerHTML = `<span>${s.icon}</span> ${s.text}`;
    el.className = 'cloud-status ' + s.cls;
  },

  /* ═══ QUOTATIONS ═══ */

  async saveQuotation(name, stateData, cfgData) {
    const payload = {
      state: JSON.parse(JSON.stringify(stateData)),
      cfg:   JSON.parse(JSON.stringify(cfgData)),
      name,
      updatedAt: Date.now(),
    };
    /* Always write to localStorage first */
    const local = JSON.parse(localStorage.getItem('me_clients') || '{}');
    local[name] = payload;
    localStorage.setItem('me_clients', JSON.stringify(local));

    if (!this.ready) return;
    this._updateStatus('syncing');
    try {
      await this._col('quotations').doc(encodeURIComponent(name)).set(payload);
      this._updateStatus('synced');
    } catch (e) {
      console.error('Save quotation error', e);
      this._updateStatus('error');
    }
  },

  async loadQuotations() {
    const local = JSON.parse(localStorage.getItem('me_clients') || '{}');
    if (!this.ready) return local;
    try {
      const snap = await this._col('quotations').get();
      const cloud = {};
      snap.forEach(doc => { cloud[doc.data().name || doc.id] = doc.data(); });
      /* Cloud wins on conflict (always newer) */
      const merged = Object.assign({}, local, cloud);
      localStorage.setItem('me_clients', JSON.stringify(merged));
      return merged;
    } catch (e) {
      return local;
    }
  },

  async deleteQuotation(name) {
    const local = JSON.parse(localStorage.getItem('me_clients') || '{}');
    delete local[name];
    localStorage.setItem('me_clients', JSON.stringify(local));
    if (!this.ready) return;
    try {
      await this._col('quotations').doc(encodeURIComponent(name)).delete();
    } catch (e) {}
  },

  /** Real-time listener — calls callback(quotationsObj) whenever data changes */
  subscribeQuotations(callback) {
    if (!this.ready) return () => {};
    return this._col('quotations').onSnapshot(snap => {
      const result = {};
      snap.forEach(doc => { result[doc.data().name || doc.id] = doc.data(); });
      const merged = Object.assign(
        JSON.parse(localStorage.getItem('me_clients') || '{}'), result);
      localStorage.setItem('me_clients', JSON.stringify(merged));
      callback(result);
      this._updateStatus('synced');
    }, () => this._updateStatus('error'));
  },

  /* ═══ PURCHASE ORDERS ═══ */

  async savePO(po) {
    let local = JSON.parse(localStorage.getItem('me_pos') || '[]');
    const idx = local.findIndex(p => p.id === po.id);
    if (idx >= 0) local[idx] = po; else local.unshift(po);
    localStorage.setItem('me_pos', JSON.stringify(local));

    if (!this.ready) return;
    this._updateStatus('syncing');
    try {
      await this._col('purchaseOrders').doc(po.id).set(po);
      this._updateStatus('synced');
    } catch (e) {
      console.error('Save PO error', e);
      this._updateStatus('error');
    }
  },

  async loadPOs() {
    const local = JSON.parse(localStorage.getItem('me_pos') || '[]');
    if (!this.ready) return local.sort((a, b) => b.createdAt - a.createdAt);
    try {
      const snap = await this._col('purchaseOrders').get();
      const cloudMap = {};
      snap.forEach(doc => { cloudMap[doc.id] = doc.data(); });
      const localMap = {};
      local.forEach(p => { localMap[p.id] = p; });
      const merged = Object.values(Object.assign({}, localMap, cloudMap));
      merged.sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem('me_pos', JSON.stringify(merged));
      return merged;
    } catch (e) {
      return local.sort((a, b) => b.createdAt - a.createdAt);
    }
  },

  async deletePO(id) {
    const local = JSON.parse(localStorage.getItem('me_pos') || '[]')
      .filter(p => p.id !== id);
    localStorage.setItem('me_pos', JSON.stringify(local));
    if (!this.ready) return;
    try { await this._col('purchaseOrders').doc(id).delete(); } catch (e) {}
  },

  /** Real-time PO listener */
  subscribePOs(callback) {
    if (!this.ready) return () => {};
    return this._col('purchaseOrders').onSnapshot(snap => {
      const result = [];
      snap.forEach(doc => result.push(doc.data()));
      result.sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem('me_pos', JSON.stringify(result));
      callback(result);
    }, () => {});
  },
};
