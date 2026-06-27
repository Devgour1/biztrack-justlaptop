// ═══════════════════════════════════════════════════════
//  BizTrack — Google Drive Sync
//  Paste your Google OAuth Client ID below after setup
// ═══════════════════════════════════════════════════════

const GDRIVE_CLIENT_ID = 'PASTE_YOUR_CLIENT_ID_HERE';  // ← sirf yahi change karna hai
const GDRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'biztrack-backup.json';

// All localStorage keys to sync
const DATA_KEYS = [
  'bizTrackOrders',
  'bizTrackProducts',
  'bizTrackTransactions',
  'bizTrackInvoices',
  'bizTrackBizInfo'
];

let gdriveFileId = null;
let gapiReady = false;
let syncStatus = 'idle'; // idle | syncing | success | error | not-configured

// ── Init Google API ──
function initGDrive() {
  if (!GDRIVE_CLIENT_ID || GDRIVE_CLIENT_ID === 'PASTE_YOUR_CLIENT_ID_HERE') {
    setSyncStatus('not-configured');
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.onload = () => { gapiReady = true; tryAutoSync(); };
  document.head.appendChild(script);
}

// ── OAuth Token ──
let accessToken = null;
let tokenExpiry = 0;

function getToken() {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiry) { resolve(accessToken); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CLIENT_ID,
      scope: GDRIVE_SCOPES,
      callback: (resp) => {
        if (resp.error) { reject(resp.error); return; }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
        localStorage.setItem('bzt_token', accessToken);
        localStorage.setItem('bzt_expiry', tokenExpiry);
        resolve(accessToken);
      }
    });
    client.requestAccessToken({ prompt: '' });
  });
}

function tryAutoSync() {
  // Try silent token from storage
  const t = localStorage.getItem('bzt_token');
  const exp = parseInt(localStorage.getItem('bzt_expiry') || '0');
  if (t && Date.now() < exp) {
    accessToken = t;
    tokenExpiry = exp;
    autoSyncFromDrive();
  } else {
    setSyncStatus('idle');
  }
}

// ── Collect all local data ──
function getAllLocalData() {
  const data = {};
  DATA_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v) data[k] = JSON.parse(v);
  });
  data._lastSaved = new Date().toISOString();
  return data;
}

// ── Restore all data to localStorage ──
function restoreLocalData(data) {
  DATA_KEYS.forEach(k => {
    if (data[k] !== undefined) {
      localStorage.setItem(k, JSON.stringify(data[k]));
    }
  });
}

// ── Find backup file in Drive appdata ──
async function findBackupFile(token) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27' + BACKUP_FILENAME + '%27&fields=files(id,name,modifiedTime)',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const json = await res.json();
  return json.files && json.files.length > 0 ? json.files[0] : null;
}

// ── Upload / Update backup ──
async function uploadToDrive(token, data) {
  const content = JSON.stringify(data);
  const blob = new Blob([content], { type: 'application/json' });

  if (gdriveFileId) {
    // Update existing
    const form = new FormData();
    form.append('file', blob);
    await fetch('https://www.googleapis.com/upload/drive/v3/files/' + gdriveFileId + '?uploadType=multipart', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
      body: form
    });
  } else {
    // Create new in appDataFolder
    const meta = JSON.stringify({ name: BACKUP_FILENAME, parents: ['appDataFolder'] });
    const form = new FormData();
    form.append('metadata', new Blob([meta], { type: 'application/json' }));
    form.append('file', blob);
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form
    });
    const json = await res.json();
    gdriveFileId = json.id;
    localStorage.setItem('bzt_file_id', gdriveFileId);
  }
}

// ── Download backup from Drive ──
async function downloadFromDrive(token, fileId) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  return await res.json();
}

// ── Main: Sync to Drive (upload) ──
async function syncToDrive() {
  if (!gapiReady) { alert('Google Drive abhi ready nahi hai. Thodi der mein try karo.'); return; }
  setSyncStatus('syncing');
  try {
    const token = await getToken();
    const file = await findBackupFile(token);
    if (file) gdriveFileId = file.id;
    else gdriveFileId = localStorage.getItem('bzt_file_id') || null;

    const data = getAllLocalData();
    await uploadToDrive(token, data);
    setSyncStatus('success');
    showToast('✅ Data Google Drive mein save ho gaya!');
  } catch (err) {
    console.error('Sync error:', err);
    setSyncStatus('error');
    showToast('❌ Sync fail hui. Internet check karo.', true);
  }
}

// ── Main: Restore from Drive ──
async function restoreFromDrive() {
  if (!gapiReady) { alert('Google Drive abhi ready nahi hai.'); return; }
  if (!confirm('Google Drive se data restore karein? Abhi ka local data replace ho jaayega.')) return;
  setSyncStatus('syncing');
  try {
    const token = await getToken();
    const file = await findBackupFile(token);
    if (!file) {
      setSyncStatus('idle');
      showToast('ℹ️ Drive pe koi backup nahi mila.', true);
      return;
    }
    const data = await downloadFromDrive(token, file.id);
    restoreLocalData(data);
    setSyncStatus('success');
    showToast('✅ Data restore ho gaya! Page reload ho raha hai...');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error('Restore error:', err);
    setSyncStatus('error');
    showToast('❌ Restore fail hui.', true);
  }
}

// ── Auto sync: on load pull from drive if newer ──
async function autoSyncFromDrive() {
  try {
    const token = accessToken;
    const file = await findBackupFile(token);
    if (!file) { setSyncStatus('idle'); return; }
    gdriveFileId = file.id;
    localStorage.setItem('bzt_file_id', file.id);

    // Check if drive data is newer
    const driveTime = new Date(file.modifiedTime).getTime();
    const localTime = parseInt(localStorage.getItem('bzt_last_local') || '0');
    if (driveTime > localTime) {
      const data = await downloadFromDrive(token, file.id);
      restoreLocalData(data);
      localStorage.setItem('bzt_last_local', Date.now());
      setSyncStatus('success');
      showToast('🔄 Latest data Drive se load ho gaya!');
      setTimeout(() => location.reload(), 1000);
    } else {
      setSyncStatus('success');
    }
  } catch (e) {
    setSyncStatus('idle');
  }
}

// ── UI: Status indicator ──
function setSyncStatus(status) {
  syncStatus = status;
  const el = document.getElementById('sync-status-text');
  const dot = document.getElementById('sync-dot');
  if (!el || !dot) return;

  const map = {
    'idle':           { text: 'Not signed in', color: '#aaa' },
    'not-configured': { text: 'Setup required', color: '#f59e0b' },
    'syncing':        { text: 'Syncing...', color: '#3b82f6' },
    'success':        { text: 'Drive synced ✓', color: '#22c55e' },
    'error':          { text: 'Sync error', color: '#ef4444' }
  };
  const s = map[status] || map['idle'];
  el.textContent = s.text;
  dot.style.background = s.color;
}

// ── Toast notification ──
function showToast(msg, isError) {
  let toast = document.getElementById('bzt-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bzt-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      padding:12px 20px;border-radius:8px;font-size:0.9rem;font-weight:600;
      color:#fff;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.25);
      transition:opacity 0.4s;opacity:0;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? '#ef4444' : '#1a1a1a';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

// ── Render sync bar in page ──
function renderSyncBar() {
  const bar = document.createElement('div');
  bar.id = 'sync-bar';
  bar.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;
    background:#1e293b;color:#fff;
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 20px;font-size:0.82rem;z-index:9998;
    gap:10px;flex-wrap:wrap;
  `;
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span id="sync-dot" style="width:9px;height:9px;border-radius:50%;background:#aaa;display:inline-block;flex-shrink:0;"></span>
      <span style="color:#94a3b8;">Google Drive:</span>
      <span id="sync-status-text" style="font-weight:700;">Loading...</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="syncToDrive()" style="background:#247BA0;color:#fff;border:none;border-radius:5px;padding:5px 14px;cursor:pointer;font-size:0.8rem;font-weight:700;">
        ☁ Save to Drive
      </button>
      <button onclick="restoreFromDrive()" style="background:#334155;color:#fff;border:none;border-radius:5px;padding:5px 14px;cursor:pointer;font-size:0.8rem;">
        ↓ Restore from Drive
      </button>
    </div>
  `;
  document.body.appendChild(bar);
  // Add bottom padding to main content so bar doesn't overlap
  const mc = document.querySelector('.main-content');
  if (mc) mc.style.paddingBottom = '52px';
}

// ── Auto-init on page load ──
document.addEventListener('DOMContentLoaded', () => {
  renderSyncBar();
  initGDrive();
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.log('SW:', e));
  }
});
