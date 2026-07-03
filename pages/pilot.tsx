import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiGet, TOKEN_KEY, ROLE_KEY, PILOT_ID_KEY } from '../lib/api';

const DEFAULT_TYPES = ['pouch','tshirt','jacket','cap','helmet'];
const DEFAULT_UI: Record<string, string> = { pouch:'👜', tshirt:'👕', jacket:'🧥', cap:'🧢', helmet:'⛑️' };
const DEFAULT_UL: Record<string, string> = { pouch:'كيس', tshirt:'تيشيرت', jacket:'جاكيت', cap:'كاب', helmet:'خوذة' };
const fmt = (n: any) => Number(n||0).toLocaleString('ar-EG');
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'}) : '-';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#f8f9fc;--bg2:#f1f3f8;--surface:#ffffff;--border:#e4e7ef;--border2:#cdd2e0;
  --text:#0f1221;--text2:#4a5068;--muted:#9ba3b8;
  --accent:#2563eb;--accent2:#1d4ed8;--accent-bg:#eff6ff;--accent-border:#bfdbfe;
  --success:#16a34a;--success-bg:#f0fdf4;--success-border:#dcfce7;
  --danger:#dc2626;--danger-bg:#fef2f2;--danger-border:#fee2e2;
  --warning:#d97706;--warning-bg:#fffbeb;--warning-border:#fef3c7;
  --info:#7c3aed;--info-bg:#f5f3ff;--info-border:#ede9fe;
  --shadow:0 1px 4px rgba(15,18,33,.06),0 2px 8px rgba(15,18,33,.04);
  --shadow2:0 4px 16px rgba(15,18,33,.08),0 8px 32px rgba(15,18,33,.06);
  --shadow3:0 8px 24px rgba(15,18,33,.1),0 16px 48px rgba(15,18,33,.08);
  --radius:14px;--r2:10px;--r3:6px;
  --font:'Cairo',sans-serif;
  --ease:cubic-bezier(.16,1,.3,1);--trans:.2s cubic-bezier(.16,1,.3,1);
  --topbar-h:64px;
}
html,body{direction:rtl;width:100vw;max-width:100vw;overflow-x:hidden;overscroll-behavior-y:contain;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:calc(var(--vh, 1vh) * 100);-webkit-font-smoothing:antialiased;overscroll-behavior-y:contain;}

/* TOPBAR */
.header{
  position:fixed;top:0;left:0;right:0;z-index:200;
  height:var(--topbar-h);
  background:rgba(255,255,255,.92);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
  box-shadow:var(--shadow);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;gap:12px;
}
.header-logo{
  display:flex;align-items:center;gap:8px;
  font-size:17px;font-weight:900;color:var(--accent);
  white-space:nowrap;letter-spacing:-.3px;
}
.header-logo-icon{
  width:36px;height:36px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  border-radius:var(--r2);
  display:flex;align-items:center;justify-content:center;
  font-size:18px;
  box-shadow:0 4px 10px rgba(37,99,235,.25);
}
.header-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.header-info{font-size:12px;color:var(--muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.header-info strong{color:var(--text);font-weight:700;}

/* TOPBAR BUTTONS */
.btn-icon{
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 13px;
  background:var(--bg2);border:1px solid var(--border);
  border-radius:var(--r2);
  color:var(--text2);font-family:var(--font);font-size:12px;font-weight:600;
  cursor:pointer;transition:var(--trans);white-space:nowrap;
  position:relative;
}
.btn-icon:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-bg);}
.badge{
  position:absolute;top:-5px;right:-5px;
  min-width:18px;height:18px;
  background:var(--danger);color:#fff;
  border-radius:9999px;font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  padding:0 4px;border:2px solid var(--surface);
}
.menu-toggle{
  width:38px;height:38px;
  background:var(--bg2);border:1px solid var(--border);
  border-radius:var(--r2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text2);font-size:18px;transition:var(--trans);
}
.menu-toggle:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-bg);}

/* MAIN */
.main{padding-top:calc(var(--topbar-h) + 16px);padding-bottom:48px;width:100%;box-sizing:border-box;padding-left:24px;padding-right:24px;}

/* STATS OVERVIEW */
.ov-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;}
@media(min-width:600px){.ov-grid{grid-template-columns:repeat(4,1fr);}}
.ov-card{
  background:var(--surface);border-radius:var(--radius);
  padding:18px 16px;
  border:1px solid var(--border);
  box-shadow:var(--shadow);
  cursor:pointer;transition:var(--trans);
  position:relative;overflow:hidden;
}
.ov-card::before{
  content:'';position:absolute;top:0;right:0;width:3px;height:100%;
  background:var(--accent);border-radius:0 var(--radius) var(--radius) 0;
}
.ov-card.green::before{background:var(--success);}
.ov-card.red::before{background:var(--danger);}
.ov-card.amber::before{background:var(--warning);}
.ov-card.violet::before{background:var(--info);}
.ov-card:hover{transform:translateY(-2px);box-shadow:var(--shadow2);border-color:var(--accent-border);}
.ov-icon{width:38px;height:38px;border-radius:var(--r2);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;font-size:17px;margin-bottom:10px;}
.ov-icon.green{background:var(--success-bg);}
.ov-icon.red{background:var(--danger-bg);}
.ov-icon.amber{background:var(--warning-bg);}
.ov-icon.violet{background:var(--info-bg);}
.ov-label{font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;}
.ov-value{font-size:22px;font-weight:900;color:var(--text);letter-spacing:-.5px;}
.ov-value.blue{color:var(--accent);}
.ov-value.green{color:var(--success);}
.ov-value.red{color:var(--danger);}
.ov-value.amber{color:var(--warning);}

/* aliased stat classes */
.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px;}
@media(min-width:550px){.stats-grid{grid-template-columns:repeat(3,1fr);}}
@media(min-width:800px){.stats-grid{grid-template-columns:repeat(4,1fr);}}
.stat-card{background:var(--surface);border-radius:var(--radius);padding:16px;border:1px solid var(--border);cursor:pointer;transition:var(--trans);box-shadow:var(--shadow);position:relative;overflow:hidden;}
.stat-card::after{content:'';position:absolute;top:0;right:0;width:3px;height:100%;background:var(--accent);border-radius:0 var(--radius) var(--radius) 0;}
.stat-card.green::after{background:var(--success);}
.stat-card.red::after{background:var(--danger);}
.stat-card.warn::after{background:var(--warning);}
.stat-card:hover{border-color:var(--accent-border);transform:translateY(-2px);box-shadow:var(--shadow2);}
.stat-label{font-size:11px;color:var(--muted);margin-bottom:5px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;}
.stat-val{font-size:21px;font-weight:900;color:var(--text);}
.stat-val.blue{color:var(--accent);}
.stat-val.green{color:var(--success);}
.stat-val.red{color:var(--danger);}
.stat-val.warn{color:var(--warning);}

/* FRAME (card) */
.frame{background:var(--surface);border-radius:var(--radius);margin-bottom:16px;border:1px solid var(--border);box-shadow:var(--shadow);}
.frame-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
.frame-title{font-size:14px;font-weight:700;color:var(--text);}
.frame-body{padding:16px 18px;}

/* INVENTORY */
.inv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
@media(min-width:480px){.inv-grid{grid-template-columns:repeat(5,1fr);}}
.inv-item{background:var(--bg2);border-radius:var(--radius);padding:14px 8px;text-align:center;cursor:pointer;transition:var(--trans);border:1.5px solid var(--border);}
.inv-item:hover{border-color:var(--accent);background:var(--accent-bg);transform:translateY(-2px);box-shadow:var(--shadow);}
.inv-icon{font-size:28px;margin-bottom:6px;}
.inv-label{font-size:11px;color:var(--text2);margin-bottom:4px;font-weight:700;}
.inv-qty{font-size:20px;font-weight:900;}
.inv-sub{font-size:10px;color:var(--muted);margin-top:2px;}

/* ENTITY ROW (supervisor/pilot cards) */
.sup-card{background:var(--bg2);border-radius:var(--r2);padding:13px 15px;border:1px solid var(--border);cursor:pointer;transition:var(--trans);display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.sup-card:hover{border-color:var(--accent);background:var(--accent-bg);transform:translateX(-2px);}
.sup-name{font-size:14px;font-weight:700;color:var(--text);}
.sup-meta{font-size:11px;color:var(--muted);margin-top:2px;}
.sup-net{font-size:16px;font-weight:900;color:var(--accent);}
.pilot-row{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;background:var(--bg2);border-radius:var(--r2);border:1px solid var(--border);margin-bottom:7px;cursor:pointer;transition:var(--trans);}
.pilot-row:hover{border-color:var(--accent);background:var(--accent-bg);}

/* BUTTONS */
.btn{padding:11px 20px;border:none;border-radius:var(--r2);background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;transition:var(--trans);display:inline-flex;align-items:center;gap:6px;position:relative;overflow:hidden;}
.btn::after{content:'';position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.08),transparent);pointer-events:none;}
.btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(37,99,235,.3);}
.btn:active:not(:disabled){transform:translateY(0);}
.btn:disabled{opacity:.65;cursor:not-allowed;}
.btn-sm{padding:7px 14px;font-size:12px;}
.btn-lg{padding:13px 24px;font-size:15px;}
.btn-outline{padding:9px 16px;border:1.5px solid var(--border);border-radius:var(--r2);background:transparent;color:var(--text2);font-family:var(--font);font-size:13px;cursor:pointer;transition:var(--trans);}
.btn-outline:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-bg);}
.btn-danger{background:linear-gradient(135deg,var(--danger),#b91c1c);color:#fff;padding:8px 14px;border:none;border-radius:var(--r3);font-family:var(--font);font-size:13px;cursor:pointer;transition:var(--trans);}
.btn-danger:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(220,38,38,.3);}
.btn-success{background:linear-gradient(135deg,var(--success),#15803d);color:#fff;padding:8px 14px;border:none;border-radius:var(--r3);font-family:var(--font);font-size:13px;cursor:pointer;}
.btn-icon-only{width:36px;height:36px;padding:0;border-radius:var(--r2);background:var(--bg2);border:1px solid var(--border);color:var(--text2);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:var(--trans);font-size:15px;}
.btn-icon-only:hover{border-color:var(--accent-border);color:var(--accent);background:var(--accent-bg);}

/* FORMS */
.form-group{margin-bottom:14px;}
.form-label{display:block;color:var(--text2);font-size:12px;margin-bottom:6px;font-weight:700;letter-spacing:.2px;}
.form-input,.form-select{width:100%;padding:10px 13px;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--r2);color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:var(--trans);-webkit-appearance:none;}
.form-input:focus,.form-select:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.08);}
.form-input::placeholder{color:var(--muted);}
.row-flex{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;}
.row-flex .form-group{flex:1;min-width:140px;}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(15,18,33,.5);backdrop-filter:blur(4px);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
.modal{background:var(--surface);border-radius:20px;padding:28px;width:100%;max-width:480px;border:1px solid var(--border);box-shadow:var(--shadow3);max-height:90vh;overflow-y:auto;animation:modalIn .25s var(--ease);}
@keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}
.modal-title{font-size:17px;font-weight:900;color:var(--text);margin-bottom:20px;text-align:center;letter-spacing:-.3px;}

/* ALERTS */
.alert-box{padding:10px 13px;border-radius:var(--r3);font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.alert-error{background:var(--danger-bg);border:1px solid var(--danger-border);color:var(--danger);}
.alert-success{background:var(--success-bg);border:1px solid var(--success-border);color:var(--success);}

/* TOAST */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(0);background:var(--text);color:#fff;padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;white-space:nowrap;box-shadow:var(--shadow3);}
.toast.show{opacity:1;transform:translateX(-50%) translateY(-4px);}

/* TABLES */
.table-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:13px;}
th{background:var(--bg2);color:var(--muted);font-weight:700;padding:11px 14px;text-align:right;border-bottom:1.5px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;}
td{padding:11px 14px;border-bottom:1px solid var(--border);color:var(--text2);vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr{transition:background var(--trans);}
tbody tr:hover td{background:var(--accent-bg);}

/* BADGES */
.code-badge{background:var(--accent-bg);color:var(--accent);padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid var(--accent-border);}
.badge-green{background:var(--success-bg);color:var(--success);padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid var(--success-border);}
.badge-red{background:var(--danger-bg);color:var(--danger);padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid var(--danger-border);}
.badge-amber{background:var(--warning-bg);color:var(--warning);padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid var(--warning-border);}
.badge-gray{background:var(--bg2);color:var(--muted);padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;border:1px solid var(--border);}

/* EMPTY & SPINNER */
.empty-state{text-align:center;padding:48px 20px;color:var(--muted);}
.empty-state-icon{font-size:48px;margin-bottom:12px;opacity:.4;}
.empty-state-title{font-size:16px;font-weight:700;color:var(--text2);margin-bottom:6px;}
.empty-state-desc{font-size:13px;}
.spinner{width:24px;height:24px;border:2.5px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin:24px auto;}
.spinner-lg{width:40px;height:40px;}
@keyframes spin{to{transform:rotate(360deg)}}

/* SIDEBAR */
.sidebar-overlay{position:fixed;inset:0;background:rgba(15,18,33,.4);backdrop-filter:blur(2px);z-index:300;animation:fadeIn .2s var(--ease);}
@keyframes fadeIn{to{opacity:1;}from{opacity:0;}}
.sidebar{position:fixed;top:0;right:0;bottom:0;width:256px;background:var(--surface);z-index:400;box-shadow:var(--shadow3);display:flex;flex-direction:column;transform:translateX(100%);animation:slideIn .25s var(--ease) forwards;}
@keyframes slideIn{to{transform:translateX(0);}}
.sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:20px 18px 16px;border-bottom:1px solid var(--border);}
.sidebar-title{font-size:16px;font-weight:900;color:var(--accent);}
.sidebar-close{width:32px;height:32px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);font-size:16px;transition:var(--trans);}
.sidebar-close:hover{background:var(--danger-bg);border-color:var(--danger-border);color:var(--danger);}
.sidebar-nav{display:flex;flex-direction:column;padding:10px 0;overflow-y:auto;flex:1;}
.sidebar-btn{display:flex;align-items:center;gap:10px;padding:13px 20px;font-family:var(--font);font-size:14px;font-weight:600;color:var(--text2);background:none;border:none;cursor:pointer;text-align:right;transition:var(--trans);border-right:3px solid transparent;}
.sidebar-btn:hover{background:var(--accent-bg);color:var(--accent);}
.sidebar-btn.active{background:var(--accent-bg);color:var(--accent);border-right-color:var(--accent);font-weight:700;}

/* TABS */
.tabs{display:flex;gap:6px;margin-bottom:14px;padding-bottom:2px;border-bottom:1.5px solid var(--border);flex-wrap:wrap;}
.tab{padding:7px 16px;border-radius:var(--r2) var(--r2) 0 0;border:1.5px solid transparent;border-bottom:none;background:none;color:var(--muted);font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer;transition:var(--trans);margin-bottom:-1.5px;}
.tab:hover{color:var(--accent);background:var(--accent-bg);}
.tab.active{border-color:var(--border);border-bottom-color:var(--surface);background:var(--surface);color:var(--accent);font-weight:700;}

/* VIEWS */
.view{display:none;}
.view.active{display:block;animation:viewIn .2s var(--ease);}
@keyframes viewIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.nav-btns{display:none;}

/* === FINAL POLISH ADDITIONS === */

/* تأثير hover على صفوف الجدول */
tbody tr {
  transition: background 0.15s, transform 0.15s;
}
tbody tr:hover td {
  background: var(--accent-bg);
}

/* تأثيرات الأزرار المحسّنة */
.btn:focus-visible,
.btn-outline:focus-visible,
.btn-icon:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* تأثير نبض على الشارات */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.15); }
}
.badge[data-pulse="true"] {
  animation: pulse 2s infinite;
}

/* Glass morphism للـ topbar */
.header {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
}

/* تدرج خلفية الصفحة */
body {
  background-image:
    radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(37,99,235,0.04) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 90% 100%, rgba(124,58,237,0.03) 0%, transparent 60%);
}

/* تحسين الـ modal */
.modal {
  border-top: 3px solid var(--accent) !important;
}

/* تحسين الـ frame */
.frame-header {
  background: var(--bg2) !important;
  border-radius: var(--radius) var(--radius) 0 0 !important;
}

/* تحسين الـ sup-card و pilot-row */
.sup-card, .pilot-row {
  border-left: 3px solid transparent !important;
  transition: all 0.2s var(--ease) !important;
}
.sup-card:hover, .pilot-row:hover {
  border-left-color: var(--accent) !important;
  transform: translateX(-4px) !important;
}

/* تحسين الـ inv-item */
.inv-item {
  position: relative;
  overflow: hidden;
}
.inv-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(37,99,235,0.04), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.inv-item:hover::before { opacity: 1; }

/* scrollbar مُحسَّن */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg2); border-radius: 3px; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

/* print styles */
@media print {
  .header, .sidebar, .sidebar-overlay, .toast { display: none !important; }
  .main { padding-top: 0 !important; }
}

.pilot-stat-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
@media (min-width: 480px) { .pilot-stat-row { grid-template-columns: repeat(4, 1fr); } }

.pilot-stat {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 14px 12px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.pilot-stat::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--accent);
}
.pilot-stat.green::before { background: var(--success); }
.pilot-stat.red::before   { background: var(--danger);  }
.pilot-stat.amber::before { background: var(--warning);  }
.pilot-stat-icon { font-size: 22px; margin-bottom: 8px; }
.pilot-stat-label { font-size: 10px; color: var(--muted); font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
.pilot-stat-value { font-size: 18px; font-weight: 900; color: var(--text); }
.pilot-stat-value.blue   { color: var(--accent);  }
.pilot-stat-value.green  { color: var(--success); }
.pilot-stat-value.red    { color: var(--danger);  }

/* ======================== MOBILE SCALE (30% smaller, fills screen) ======================== */
@media(max-width:900px){
  html{zoom:0.7;}
  html,body{width:142.86vw !important;max-width:142.86vw !important;}
  body{min-height:142.86vh !important;}
}
`;

export default function PilotPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const TYPES = equipmentTypes.length > 0 ? equipmentTypes.map((t:any) => t.key) : DEFAULT_TYPES;
  const UI: Record<string,string> = equipmentTypes.length > 0 ? Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.icon])) : DEFAULT_UI;
  const UL: Record<string,string> = equipmentTypes.length > 0 ? Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.label])) : DEFAULT_UL;

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    const pilotId = localStorage.getItem(PILOT_ID_KEY);
    if (!token || role !== 'pilot' || !pilotId) { router.replace('/'); return; }
    loadData(pilotId);
  }, []);

  async function loadData(pilotId: string) {
    setLoading(true);
    const [res, eqTypesRes] = await Promise.all([
      apiGet('getPilotDetails', { pilotId }),
      apiGet('getEquipmentTypes'),
    ]);
    if (!res.success) { router.replace('/'); return; }
    setData(res);
    if (eqTypesRes.success && eqTypesRes.data?.length > 0) setEquipmentTypes(eqTypesRes.data);
    setLoading(false);
  }

  function doLogout() {
    localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); localStorage.removeItem(PILOT_ID_KEY);
    router.push('/');
  }

  function toggleSection(key: string) {
    setCollapsed(p => ({ ...p, [key]: !p[key] }));
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{
        position:'fixed', inset:0,
        display:'flex', flexDirection:'column',
        justifyContent:'center', alignItems:'center',
        gap:16, background:'transparent',
        backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
        zIndex:9999,
      }}>
        <div style={{width:40,height:40,borderRadius:'50%',border:'4px solid rgba(37,99,235,0.2)',borderTopColor:'#2563EB',animation:'spin .8s linear infinite'}} />
        <div style={{ fontSize:13, color:'#111827', fontWeight:600 }}>جارٍ التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  if (!data) return null;

  const { pilot, advances, deductions, bonuses, uniforms, summary } = data;

  // تجميع المعدات (تفصل بين المعلقة والمسوّاة لكل نوع)
  const uniSummary: Record<string, number> = {};
  const uniSettledSummary: Record<string, number> = {};
  (uniforms || []).forEach((u: any) => {
    if (u.settled) {
      uniSettledSummary[u.type] = (uniSettledSummary[u.type] || 0) + Number(u.qty || 0);
    } else {
      uniSummary[u.type] = (uniSummary[u.type] || 0) + Number(u.qty || 0);
    }
  });
  const allUniTypes = Array.from(new Set([...Object.keys(uniSummary), ...Object.keys(uniSettledSummary)]));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="header">
        <div className="header-logo">
          <div className="header-logo-icon">✈️</div>
          بداية
        </div>
        <div className="header-info">مرحباً <strong>{pilot?.name}</strong></div>
        <button className="btn-icon" onClick={doLogout}>🚪 خروج</button>
      </div>

      <div className="main">
        {/* بطاقة الطيار */}
        <div className="pilot-card">
          <div className="pilot-avatar">✈️</div>
          <div>
            <div className="pilot-name">{pilot?.name}</div>
            <div className="pilot-meta">{pilot?.phone || ''} | {pilot?.region || ''}</div>
            <span className="code-badge">{pilot?.pilot_code}</span>
          </div>
        </div>

        {/* ملخص مالي */}
        <div className="info-grid">
          <div className="info-card">
            <div className="info-label">الراتب الأساسي</div>
            <div className="info-value blue">{fmt(pilot?.base_salary)} ج</div>
          </div>
          <div className="info-card">
            <div className="info-label">صافي الراتب</div>
            <div className={`info-value ${(summary?.netSalary || 0) >= 0 ? 'green' : 'red'}`}>{fmt(summary?.netSalary)} ج</div>
          </div>
          <div className="info-card">
            <div className="info-label">السلف المعلقة</div>
            <div className="info-value red">{fmt(summary?.totalAdvances)} ج</div>
            <div className="info-hint">{(advances || []).filter((a: any) => !a.settled).length} سلفة معلقة</div>
          </div>
          <div className="info-card">
            <div className="info-label">الخصومات</div>
            <div className="info-value warn">{fmt(summary?.totalDeductions)} ج</div>
          </div>
          <div className="info-card">
            <div className="info-label">المكافآت</div>
            <div className="info-value green">{fmt(summary?.totalBonuses)} ج</div>
          </div>
          <div className="info-card">
            <div className="info-label">تكلفة المعدات</div>
            <div className="info-value">{fmt(summary?.uniformCost)} ج</div>
          </div>
        </div>

        {/* المعدات */}
        <div className="frame">
          <div className="frame-header" onClick={() => toggleSection('uniforms')}>
            <span className="frame-title">👕 معداتي</span>
            <span>{collapsed.uniforms ? '▼' : '▲'}</span>
          </div>
          {!collapsed.uniforms && (
            <div className="frame-body">
              {allUniTypes.length === 0 ? (
                <div className="empty-state">لا توجد معدات</div>
              ) : (
                <div className="uniform-grid">
                  {TYPES.filter((t: string) => (uniSummary[t] > 0) || (uniSettledSummary[t] > 0)).map((t: string) => {
                    const isSettled = !uniSummary[t] && uniSettledSummary[t] > 0;
                    const qty = isSettled ? uniSettledSummary[t] : uniSummary[t];
                    return (
                      <div
                        key={t}
                        className={`uni-item${isSettled ? ' uni-item-settled' : ''}`}
                        style={isSettled ? { opacity: 0.5, background: 'var(--bg2)' } : undefined}
                      >
                        <div className="uni-icon">{UI[t]}</div>
                        <div className="uni-label">{UL[t]}</div>
                        {isSettled ? (
                          <div className="uni-qty" style={{ fontSize: 11, color: 'var(--muted)' }}>تم تسديد ثمنه</div>
                        ) : (
                          <div className="uni-qty">{qty}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* السلف */}
        <div className="frame">
          <div className="frame-header" onClick={() => toggleSection('advances')}>
            <span className="frame-title">💵 السلف</span>
            <span>{collapsed.advances ? '▼' : '▲'}</span>
          </div>
          {!collapsed.advances && (
            <div className="frame-body">
              {(advances || []).length === 0 ? <div className="empty-state">لا توجد سلف</div> : (
                (advances || []).map((a: any) => (
                  <div key={a.id} className="item-row">
                    <div>
                      <div className="item-amount" style={{ color: 'var(--danger)' }}>{fmt(a.amount)} ج</div>
                      <div className="item-meta">{a.reason || '-'} · {fmtDate(a.date)}</div>
                    </div>
                    <span className={a.settled ? 'badge-settled' : 'badge-pending'}>{a.settled ? '✅ مسوّى' : '⏳ معلق'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* الخصومات */}
        <div className="frame">
          <div className="frame-header" onClick={() => toggleSection('deductions')}>
            <span className="frame-title">✂️ الخصومات</span>
            <span>{collapsed.deductions ? '▼' : '▲'}</span>
          </div>
          {!collapsed.deductions && (
            <div className="frame-body">
              {(deductions || []).filter((d: any) => !d.deleted).length === 0 ? <div className="empty-state">لا توجد خصومات</div> : (
                (deductions || []).filter((d: any) => !d.deleted).map((d: any) => (
                  <div key={d.id} className="item-row">
                    <div>
                      <div className="item-amount" style={{ color: 'var(--warning)' }}>{fmt(d.amount)} ج</div>
                      <div className="item-meta">{d.reason || '-'} · {fmtDate(d.date)}</div>
                    </div>
                    <span className={d.settled ? 'badge-settled' : 'badge-pending'}>{d.settled ? '✅' : '⏳'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* المكافآت */}
        <div className="frame">
          <div className="frame-header" onClick={() => toggleSection('bonuses')}>
            <span className="frame-title">🎁 المكافآت</span>
            <span>{collapsed.bonuses ? '▼' : '▲'}</span>
          </div>
          {!collapsed.bonuses && (
            <div className="frame-body">
              {(bonuses || []).filter((b: any) => !b.deleted).length === 0 ? <div className="empty-state">لا توجد مكافآت</div> : (
                (bonuses || []).filter((b: any) => !b.deleted).map((b: any) => (
                  <div key={b.id} className="item-row">
                    <div>
                      <div className="item-amount" style={{ color: 'var(--success)' }}>{fmt(b.amount)} ج</div>
                      <div className="item-meta">{b.reason || '-'} · {fmtDate(b.date)}</div>
                    </div>
                    <span className={b.settled ? 'badge-settled' : 'badge-pending'}>{b.settled ? '✅' : '⏳'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
