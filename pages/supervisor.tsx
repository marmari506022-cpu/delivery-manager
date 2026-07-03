import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { api, apiGet, TOKEN_KEY, ROLE_KEY, invalidateAllCache, invalidateCache } from '../lib/api';
import { aggregateCompanyInventory } from '../lib/inventoryAggregate';
import { useBackClose } from '../lib/backNav';

const DEFAULT_TYPES = ['pouch','tshirt','jacket','cap','helmet'];
const DEFAULT_UI: Record<string, string> = { pouch:'👜', tshirt:'👕', jacket:'🧥', cap:'🧢', helmet:'⛑️' };
const DEFAULT_UL: Record<string, string> = { pouch:'كيس', tshirt:'تيشيرت', jacket:'جاكيت', cap:'كاب', helmet:'خوذة' };
const fmt = (n: any) => Number(n||0).toLocaleString('en-US');
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'}) : '-';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --primary:#2563EB;
  --primary-dark:#1d4ed8;
  --primary-light:#EFF6FF;
  --primary-border:#BFDBFE;
  --bg:#F8FAFC;
  --surface:#FFFFFF;
  --border:#E5E7EB;
  --border2:#D1D5DB;
  --text:#111827;
  --text2:#374151;
  --muted:#64748B;
  --muted2:#9CA3AF;
  --active:#10B981;
  --active-bg:#ECFDF5;
  --active-border:#A7F3D0;
  --pending:#F59E0B;
  --pending-bg:#FFFBEB;
  --pending-border:#FDE68A;
  --inactive:#94A3B8;
  --inactive-bg:#F8FAFC;
  --danger:#EF4444;
  --danger-bg:#FEF2F2;
  --danger-border:#FECACA;
  --shadow-sm:0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.03);
  --shadow:0 4px 16px rgba(0,0,0,.05),0 2px 6px rgba(0,0,0,.03);
  --shadow-md:0 8px 24px rgba(0,0,0,.07),0 4px 10px rgba(0,0,0,.04);
  --shadow-lg:0 20px 60px rgba(15,23,42,.08),0 8px 20px rgba(15,23,42,.04);
  --sidebar-w:320px;
  --header-h:88px;
  --font:'Cairo',sans-serif;
  --ease:cubic-bezier(.16,1,.3,1);
  --trans:.2s cubic-bezier(.16,1,.3,1);
  --r-sm:12px;
  --r:18px;
  --r-lg:24px;
  --r-xl:28px;
}

html,body{direction:rtl;width:100vw;max-width:100vw;overflow-x:hidden;overscroll-behavior-y:contain;}
body{
  font-family:var(--font);
  background:var(--bg);
  color:var(--text);
  min-height:calc(var(--vh, 1vh) * 100);
  -webkit-font-smoothing:antialiased;
  overscroll-behavior-y:contain;
}

/* ========= LAYOUT ========= */
.app-layout{
  display:flex;
  height:calc(var(--vh, 1vh) * 100);
  width:100vw;
  max-width:100vw;
  box-sizing:border-box;
  overflow:hidden;
}

/* ========= SIDEBAR ========= */
.sidebar{
  width:var(--sidebar-w);
  min-width:var(--sidebar-w);
  background:var(--surface);
  border-left:1px solid var(--border);
  display:flex;
  flex-direction:column;
  position:sticky;
  top:0;
  height:calc(var(--vh, 1vh) * 100);
  z-index:100;
  box-shadow:0 20px 60px rgba(15,23,42,.05);
  padding:32px;
  overflow-y:auto;
  flex-shrink:0;
}
.sidebar-logo{
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:40px;
}
.sidebar-logo-icon{
  width:48px;height:48px;
  background:linear-gradient(135deg,var(--primary),var(--primary-dark));
  border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-size:22px;
  box-shadow:0 8px 20px rgba(37,99,235,.25);
  flex-shrink:0;
}
.sidebar-logo-text{
  font-size:22px;font-weight:900;
  color:var(--text);letter-spacing:-.5px;
}
.sidebar-logo-sub{
  font-size:13px;color:var(--muted);margin-top:2px;
}

.sidebar-section-label{
  font-size:11px;font-weight:700;
  color:var(--muted2);
  letter-spacing:.8px;
  text-transform:uppercase;
  margin-bottom:8px;
  margin-top:24px;
  padding-right:18px;
}
.sidebar-section-label:first-of-type{margin-top:0;}

.sidebar-item{
  display:flex;align-items:center;gap:18px;
  padding:0 18px;
  height:64px;
  border-radius:18px;
  font-family:var(--font);
  font-size:18px;font-weight:600;
  color:var(--text2);
  background:none;border:none;
  cursor:pointer;
  transition:var(--trans);
  text-align:right;
  width:100%;
  margin-bottom:4px;
}
.sidebar-item:hover{
  background:var(--primary-light);
  color:var(--primary);
}
.sidebar-item.active{
  background:var(--primary);
  color:#fff;
  box-shadow:0 8px 20px rgba(37,99,235,.25);
}
.sidebar-item.active .si-icon{color:#fff;}
.si-icon{
  width:24px;height:24px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;
  flex-shrink:0;
}

.sidebar-footer{
  margin-top:auto;
  padding-top:24px;
  border-top:1px solid var(--border);
}
.sidebar-user{
  display:flex;align-items:center;gap:12px;
  margin-bottom:16px;
}
.sidebar-avatar{
  width:44px;height:44px;
  border-radius:14px;
  background:linear-gradient(135deg,var(--primary),#7C3AED);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:18px;font-weight:800;
  flex-shrink:0;
}
.sidebar-user-name{font-size:15px;font-weight:700;color:var(--text);}
.sidebar-user-role{font-size:12px;color:var(--muted);}
.sidebar-companies{
  display:flex;flex-wrap:wrap;gap:6px;
  margin-bottom:16px;
}
.sidebar-company-badge{
  font-size:11px;font-weight:700;
  color:var(--primary);
  background:var(--primary-light, rgba(37,99,235,.08));
  border:1px solid var(--active-border, rgba(37,99,235,.2));
  border-radius:8px;
  padding:4px 10px;
  white-space:nowrap;
}

.btn-logout{
  display:flex;align-items:center;gap:8px;
  padding:0 16px;
  height:48px;
  border-radius:14px;
  background:var(--danger-bg);
  border:1px solid var(--danger-border);
  color:var(--danger);
  font-family:var(--font);
  font-size:14px;font-weight:600;
  cursor:pointer;transition:var(--trans);
  width:100%;
  justify-content:center;
}
.btn-logout:hover{background:var(--danger);color:#fff;}

/* ========= MOBILE SIDEBAR TOGGLE ========= */
.mobile-menu-btn{
  display:none;
  position:fixed;top:20px;right:20px;z-index:150;
  width:52px;height:52px;
  background:var(--surface);
  border:1.5px solid var(--border);
  border-radius:16px;
  align-items:center;justify-content:center;
  font-size:22px;cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.08);
  flex-shrink:0;
}
@media(max-width:900px){
  .mobile-menu-btn{position:static;width:40px;height:40px;font-size:18px;}
}
html.is-mobile .mobile-menu-btn{position:static;width:40px;height:40px;font-size:18px;}
.sidebar-overlay-bg{
  display:none;
  position:fixed;inset:0;
  background:rgba(0,0,0,.4);
  z-index:90;
}

/* ========= MAIN CONTENT ========= */
.main-content{
  flex:1;
  min-width:0;
  height:calc(var(--vh, 1vh) * 100);
  overflow-y:auto;
  overscroll-behavior-y:contain;
  display:flex;
  flex-direction:column;
}

/* ========= HEADER ========= */
.sticky-top-wrap{
  position:sticky;top:0;z-index:50;
}
.header{
  height:var(--header-h);
  background:var(--surface);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 40px;
  box-shadow:var(--shadow-sm);
}
.header-right{}
.header-title{
  font-size:42px;font-weight:700;
  color:var(--text);letter-spacing:-1px;
  line-height:1;
}
.header-subtitle{
  font-size:18px;color:var(--muted);
  margin-top:6px;
  font-weight:400;
}
.header-left{
  display:flex;align-items:center;gap:20px;
}

/* SEARCH */
.search-box{
  width:460px;height:56px;
  border-radius:18px;
  background:var(--surface);
  border:1.5px solid var(--border);
  display:flex;align-items:center;gap:14px;
  padding:0 24px;
  transition:var(--trans);
}
.search-box:focus-within{
  border-color:var(--primary);
  box-shadow:0 0 0 4px rgba(37,99,235,.08);
}
.search-box input{
  flex:1;border:none;outline:none;
  font-family:var(--font);font-size:15px;
  color:var(--text);background:transparent;
}
.search-box input::placeholder{color:var(--muted2);}
.search-icon{font-size:20px;color:var(--muted);}

.header-action{
  width:48px;height:48px;
  border-radius:14px;
  background:var(--surface);
  border:1.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;
  color:var(--text2);
  font-size:20px;
  transition:var(--trans);
  position:relative;
}
.header-action:hover{
  border-color:var(--primary-border);
  color:var(--primary);
  background:var(--primary-light);
}
.notif-badge{
  position:absolute;top:-5px;left:-5px;
  min-width:20px;height:20px;
  background:var(--danger);color:#fff;
  border-radius:10px;font-size:11px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  padding:0 5px;
  border:2.5px solid var(--surface);
}
.header-profile{
  width:48px;height:48px;
  border-radius:14px;
  background:linear-gradient(135deg,var(--primary),#7C3AED);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:18px;font-weight:800;
  cursor:pointer;
  border:2px solid transparent;
  transition:var(--trans);
}
.header-profile:hover{border-color:var(--primary);}

/* ========= MAIN UPGRADE BAR ========= */
.main-upgrade-bar{
  display:flex;align-items:center;justify-content:space-between;
  background:linear-gradient(135deg,#2563EB,#4F8CFF);
  color:#fff;
  padding:0 32px;
  height:52px;
  border-radius:0;
  margin:0;
  flex-shrink:0;
  width:100%;
}
.main-upgrade-bar-text{font-size:14px;font-weight:600;opacity:.95;}
.main-upgrade-bar-btn{
  height:34px;padding:0 20px;
  background:#fff;color:var(--primary);
  border:none;border-radius:10px;
  font-family:var(--font);font-size:14px;font-weight:700;
  cursor:pointer;white-space:nowrap;
  transition:all .2s;
}
.main-upgrade-bar-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.15);}
@media(max-width:900px){
  .main-upgrade-bar{padding:0 16px;height:auto;min-height:44px;flex-wrap:wrap;gap:8px;padding-top:8px;padding-bottom:8px;}
  .main-upgrade-bar-text{font-size:12px;}
}
html.is-mobile .main-upgrade-bar{padding:0 16px;height:auto;min-height:44px;flex-wrap:wrap;gap:8px;padding-top:8px;padding-bottom:8px;}
html.is-mobile .main-upgrade-bar-text{font-size:12px;}

/* ========= PROFILE MODAL ========= */
.profile-modal-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1100;
  display:flex;align-items:center;justify-content:center;padding:16px;
}
.profile-modal{
  background:var(--surface);border-radius:20px;width:100%;max-width:440px;
  box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;
}
.profile-modal-header{
  background:linear-gradient(135deg,var(--primary),#7C3AED);
  padding:28px 24px 20px;text-align:center;color:#fff;
}
.profile-modal-avatar{
  width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.25);
  display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:800;margin:0 auto 12px;border:3px solid rgba(255,255,255,0.4);
}
.profile-modal-name{font-size:20px;font-weight:700;margin-bottom:4px;}
.profile-modal-role{font-size:13px;opacity:0.85;}
.profile-modal-body{padding:24px;}
.profile-info-row{
  display:flex;align-items:center;gap:12px;padding:12px 0;
  border-bottom:1px solid var(--border);
}
.profile-info-row:last-of-type{border-bottom:none;}
.profile-info-icon{font-size:18px;width:28px;text-align:center;flex-shrink:0;}
.profile-info-label{font-size:12px;color:var(--muted);margin-bottom:2px;}
.profile-info-value{font-size:15px;font-weight:600;color:var(--text);}
.profile-divider{height:1px;background:var(--border);margin:16px 0;}
.profile-modal-footer{padding:0 24px 24px;display:flex;gap:10px;}

/* ========= PAGE BODY ========= */
.page-body{
  padding:40px;
  flex:1;
}

/* ========= DASHBOARD OVERVIEW ========= */
.dash-summary-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:20px;
  margin-bottom:24px;
}
.summary-card{
  background:var(--surface);
  border-radius:24px;
  padding:28px;
  box-shadow:var(--shadow);
  border:1px solid var(--border);
  display:flex;flex-direction:column;gap:8px;
  transition:var(--trans);
  animation:fadeUp .5s var(--ease) both;
}
.summary-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
.summary-card:nth-child(1){animation-delay:.05s;}
.summary-card:nth-child(2){animation-delay:.1s;}
.summary-card:nth-child(3){animation-delay:.15s;}
.summary-card-top{display:flex;align-items:center;gap:12px;}
.summary-icon{
  width:48px;height:48px;flex-shrink:0;
  border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-size:24px;
}
.summary-icon.blue{background:var(--primary-light);}
.summary-icon.green{background:var(--active-bg);}
.summary-icon.orange{background:var(--pending-bg);}
.summary-label{font-size:13px;font-weight:700;color:var(--muted);}
.summary-value{font-size:40px;font-weight:900;letter-spacing:-1px;line-height:1;}
.summary-value.blue{color:var(--primary);}
.summary-value.green{color:var(--active);}
.summary-value.orange{color:var(--pending);}
.summary-value small{font-size:16px;font-weight:700;}
.summary-desc{font-size:13px;color:var(--muted);}

.excel-sheet-mini{
  margin-top:8px;
  border:1px solid #b7d4b1;
  border-radius:6px;
  overflow:hidden;
  font-family:Tahoma,Arial,sans-serif;
  box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.excel-sheet-row{
  display:grid;
  grid-template-columns:24px repeat(3,1fr);
}
.excel-sheet-row span{
  border-left:1px solid #d7e6d4;
  border-bottom:1px solid #d7e6d4;
  padding:4px 2px;
  font-size:10px;
  color:#3c6b3a;
  text-align:center;
  background:#fff;
  min-height:16px;
}
.excel-sheet-row span:first-child{
  background:#eef6ec;
  font-weight:700;
  border-left:none;
}
.excel-sheet-row.excel-sheet-head span{
  background:#217346;
  color:#fff;
  font-weight:700;
  border-color:#1a5c38;
}
.excel-sheet-row.excel-sheet-head span:first-child{
  background:#1a5c38;
}
.excel-sheet-row:last-child span{border-bottom:none;}

.dash-row{
  display:grid;
  grid-template-columns:2fr 1fr;
  gap:20px;
  margin-bottom:24px;
}
.dash-card{
  background:var(--surface);
  border-radius:24px;
  padding:28px;
  box-shadow:var(--shadow);
  border:1px solid var(--border);
}
.dash-card-title{
  font-size:17px;font-weight:700;color:var(--text);
  margin-bottom:18px;
  display:flex;align-items:center;gap:8px;
}

.inv-chip-row{display:flex;flex-wrap:wrap;gap:12px;}
.inv-chip{
  display:flex;align-items:center;gap:10px;
  border-radius:16px;
  padding:12px 18px;
  min-width:118px;
}
.inv-chip-icon{font-size:24px;}
.inv-chip-label{font-size:11px;font-weight:700;color:var(--muted);}
.inv-chip-val{font-size:22px;font-weight:900;line-height:1.1;}

.pay-card{
  background:linear-gradient(135deg,var(--primary),var(--primary-dark));
  border-radius:24px;
  padding:28px;
  box-shadow:0 10px 32px rgba(37,99,235,.25);
  display:flex;flex-direction:column;justify-content:space-between;
  color:#fff;
}
.pay-card-label{font-size:13px;font-weight:700;color:rgba(255,255,255,.75);margin-bottom:8px;}
.pay-card-value{font-size:42px;font-weight:900;letter-spacing:-1px;line-height:1;}
.pay-card-sub{font-size:15px;color:rgba(255,255,255,.75);margin-top:4px;}
.pay-card-footer{margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.18);}
.pay-card-footer-label{font-size:12px;color:rgba(255,255,255,.8);margin-bottom:6px;}
.pay-card-footer-val{font-size:20px;font-weight:800;}

/* ========= KPI SECTION ========= */
.kpi-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:24px;
  margin-bottom:32px;
}
.kpi-card{
  background:var(--surface);
  border-radius:28px;
  padding:32px;
  height:220px;
  box-shadow:0 12px 36px rgba(0,0,0,.05);
  border:1px solid var(--border);
  display:flex;flex-direction:column;
  justify-content:space-between;
  transition:var(--trans);
  cursor:default;
  animation:fadeUp .5s var(--ease) both;
}
.kpi-card:hover{
  transform:translateY(-4px);
  box-shadow:0 20px 48px rgba(0,0,0,.08);
}
.kpi-card:nth-child(1){animation-delay:.05s;}
.kpi-card:nth-child(2){animation-delay:.1s;}
.kpi-card:nth-child(3){animation-delay:.15s;}
.kpi-card:nth-child(4){animation-delay:.2s;}

.kpi-icon-wrap{
  width:72px;height:72px;
  border-radius:20px;
  display:flex;align-items:center;justify-content:center;
  font-size:28px;
}
.kpi-icon-blue{background:var(--primary-light);}
.kpi-icon-green{background:var(--active-bg);}
.kpi-icon-orange{background:var(--pending-bg);}
.kpi-icon-accent{background:linear-gradient(135deg,rgba(37,99,235,.1),rgba(124,58,237,.08));}

.kpi-value{
  font-size:52px;font-weight:900;
  color:var(--text);letter-spacing:-2px;
  line-height:1;
}
.kpi-value.green{color:var(--active);}
.kpi-value.orange{color:var(--pending);}
.kpi-value.blue{color:var(--primary);}
.kpi-label{
  font-size:18px;font-weight:600;
  color:var(--muted);
  margin-top:6px;
}
.kpi-accent-line{
  height:3px;border-radius:2px;
  margin-bottom:24px;
  width:40px;
}
.kpi-line-blue{background:var(--primary);}
.kpi-line-green{background:var(--active);}
.kpi-line-orange{background:var(--pending);}
.kpi-line-accent{background:linear-gradient(90deg,var(--primary),#7C3AED);}

/* ========= ANALYTICS SECTION ========= */
.analytics-row{
  display:grid;
  grid-template-columns:1fr;
  gap:24px;
  margin-bottom:32px;
}

/* ========= PILOTS GRID ========= */
.section-header{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:24px;
}
.section-title{
  font-size:28px;font-weight:700;
  color:var(--text);letter-spacing:-.5px;
}
.section-subtitle{font-size:15px;color:var(--muted);margin-top:4px;}

.pilots-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:24px;
  margin-bottom:32px;
}

.pilot-card{
  background:var(--surface);
  border-radius:28px;
  padding:32px;
  height:280px;
  box-shadow:0 10px 30px rgba(0,0,0,.05);
  border:1px solid var(--border);
  display:flex;flex-direction:column;
  transition:var(--trans);
  cursor:pointer;
  animation:fadeUp .5s var(--ease) both;
}
.pilot-card:hover{
  transform:translateY(-4px);
  box-shadow:0 20px 48px rgba(0,0,0,.1);
  border-color:var(--primary-border);
}

.pilot-card-top{
  display:flex;align-items:flex-start;gap:16px;
  margin-bottom:20px;
}
.pilot-avatar{
  width:88px;height:88px;flex-shrink:0;
  border-radius:24px;
  background:linear-gradient(135deg,var(--primary),#7C3AED);
  display:flex;align-items:center;justify-content:center;
  font-size:32px;
  position:relative;
}
.status-dot{
  width:14px;height:14px;
  border-radius:50%;
  border:2.5px solid var(--surface);
  position:absolute;bottom:4px;left:4px;
}
.status-dot.active{background:var(--active);}
.status-dot.inactive{background:var(--inactive);}
.status-dot.pending{background:var(--pending);}

.pilot-info{flex:1;min-width:0;}
.pilot-name{
  font-size:20px;font-weight:700;
  color:var(--text);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.pilot-code{
  display:inline-flex;align-items:center;
  background:var(--primary-light);
  color:var(--primary);
  padding:3px 10px;border-radius:8px;
  font-size:12px;font-weight:700;
  margin-top:4px;
  border:1px solid var(--primary-border);
}
.pilot-meta{font-size:13px;color:var(--muted);margin-top:6px;}

.pilot-card-middle{flex:1;}
.perf-label{font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600;}
.perf-bar-wrap{
  height:8px;
  background:var(--bg);
  border-radius:4px;
  overflow:hidden;
}
.perf-bar-fill{
  height:100%;border-radius:4px;
  background:linear-gradient(90deg,var(--primary),#7C3AED);
  transition:width .6s var(--ease);
}
.perf-stats{
  display:flex;gap:16px;
  margin-top:12px;
}
.perf-stat{
  flex:1;
  background:var(--bg);
  border-radius:10px;
  padding:8px 10px;
  text-align:center;
}
.perf-stat-val{font-size:14px;font-weight:800;color:var(--text);}
.perf-stat-val.red{color:var(--danger);}
.perf-stat-val.green{color:var(--active);}
.perf-stat-label{font-size:10px;color:var(--muted);margin-top:1px;}

.pilot-card-actions{
  display:flex;gap:12px;
  margin-top:20px;
  padding-top:16px;
  border-top:1px solid var(--border);
}

/* ========= PILOTS TABLE TOOLBAR ========= */
.pilots-toolbar{
  display:flex;gap:12px;flex-wrap:wrap;
  margin-bottom:20px;
}
.search-box-inline{
  flex:1;min-width:240px;
  height:48px;
  border-radius:14px;
  background:var(--bg);
  border:1.5px solid var(--border);
  display:flex;align-items:center;gap:10px;
  padding:0 16px;
  transition:var(--trans);
}
.search-box-inline:focus-within{
  border-color:var(--primary);
  background:var(--surface);
  box-shadow:0 0 0 4px rgba(37,99,235,.08);
}
.search-box-inline input{
  flex:1;border:none;outline:none;
  font-family:var(--font);font-size:14px;
  color:var(--text);background:transparent;
}
.search-box-inline input::placeholder{color:var(--muted2);}
.search-box-inline .search-icon{font-size:18px;color:var(--muted);}
.pilots-toolbar select.form-select{
  width:200px;flex:0 0 auto;
  height:48px;margin:0;
}
.table-avatar{
  width:38px;height:38px;flex-shrink:0;
  border-radius:12px;
  background:linear-gradient(135deg,var(--primary),#7C3AED);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;color:#fff;
}

/* ========= ACTION BUTTONS ========= */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:0 20px;
  height:52px;
  border-radius:16px;
  font-family:var(--font);font-size:15px;font-weight:700;
  cursor:pointer;transition:var(--trans);
  border:none;
  white-space:nowrap;
}
.btn:disabled{opacity:.6;cursor:not-allowed;}
.btn-primary{
  background:var(--primary);
  color:#fff;
  box-shadow:0 4px 12px rgba(37,99,235,.25);
}
.btn-primary:hover:not(:disabled){
  background:var(--primary-dark);
  transform:scale(1.02);
  box-shadow:0 6px 18px rgba(37,99,235,.35);
}
.btn-secondary{
  background:var(--surface);
  color:var(--text2);
  border:1.5px solid var(--border);
}
.btn-secondary:hover:not(:disabled){
  border-color:var(--primary-border);
  color:var(--primary);
  background:var(--primary-light);
}
.btn-sm{height:40px;padding:0 16px;font-size:13px;border-radius:12px;}
.btn-danger-outline{
  background:var(--danger-bg);
  color:var(--danger);
  border:1.5px solid var(--danger-border);
  height:40px;padding:0 14px;
  border-radius:12px;
  font-family:var(--font);font-size:13px;font-weight:600;
  cursor:pointer;transition:var(--trans);
}
.btn-danger-outline:hover{background:var(--danger);color:#fff;}
.btn-success-outline{
  background:var(--active-bg);
  color:var(--active);
  border:1.5px solid var(--active-border);
  height:40px;padding:0 14px;
  border-radius:12px;
  font-family:var(--font);font-size:13px;font-weight:600;
  cursor:pointer;transition:var(--trans);
}
.btn-success-outline:hover{background:var(--active);color:#fff;}

/* ========= INVENTORY (admin-matching style) ========= */
.section-card{
  background:#ffffff;
  border-radius:24px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
  margin-bottom:32px;
  overflow:hidden;
  animation:fadeUp .4s var(--ease) both;
}
.section-card-header{
  padding:24px 32px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid #EEF2F7;
}
.section-card-title{font-size:18px;font-weight:700;color:#111827;}
.section-card-actions{display:flex;gap:6px;flex-wrap:wrap;}
@media(max-width:900px){
  .inv-total-header{flex-direction:column;align-items:stretch;gap:10px;}
  .inv-total-title{
    display:flex;align-items:center;gap:8px;
    white-space:nowrap;overflow-x:auto;
    font-size:15px;
  }
  .inv-total-value{white-space:nowrap;flex-shrink:0;}
  .inv-total-header .section-card-actions{
    flex-wrap:nowrap;gap:4px;
  }
  .inv-total-header .section-card-actions .btn{
    flex:1 1 0;min-width:0;
    padding:0 4px;font-size:10px;height:34px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    text-align:center;justify-content:center;
  }
}
html.is-mobile .inv-total-header{flex-direction:column;align-items:stretch;gap:10px;}
html.is-mobile .inv-total-title{
  display:flex;align-items:center;gap:8px;
  white-space:nowrap;overflow-x:auto;
  font-size:15px;
}
html.is-mobile .inv-total-value{white-space:nowrap;flex-shrink:0;}
html.is-mobile .inv-total-header .section-card-actions{
  flex-wrap:nowrap;gap:4px;
}
html.is-mobile .inv-total-header .section-card-actions .btn{
  flex:1 1 0;min-width:0;
  padding:0 4px;font-size:10px;height:34px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  text-align:center;justify-content:center;
}
.pilot-quick-actions{display:flex;gap:8px;}
@media(max-width:900px){
  .pilot-quick-actions{
    flex:1 1 100%;flex-wrap:nowrap;gap:4px;
  }
  .pilot-quick-actions .btn{
    flex:1 1 0;min-width:0;
    padding:0 4px;font-size:10px;height:34px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    text-align:center;justify-content:center;
  }
}
html.is-mobile .pilot-quick-actions{
  flex:1 1 100%;flex-wrap:nowrap;gap:4px;
}
html.is-mobile .pilot-quick-actions .btn{
  flex:1 1 0;min-width:0;
  padding:0 4px;font-size:10px;height:34px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  text-align:center;justify-content:center;
}
.pilot-quick-actions-2{display:flex;gap:8px;}
@media(max-width:900px){
  .pilot-quick-actions-2{
    flex:1 1 100%;flex-wrap:nowrap;gap:3px;
  }
  .pilot-quick-actions-2 .btn,.pilot-quick-actions-2 .btn-danger-outline{
    flex:1 1 0;min-width:0;
    padding:0 3px;font-size:9px;height:34px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    text-align:center;justify-content:center;
  }
}
html.is-mobile .pilot-quick-actions-2{
  flex:1 1 100%;flex-wrap:nowrap;gap:3px;
}
html.is-mobile .pilot-quick-actions-2 .btn,html.is-mobile .pilot-quick-actions-2 .btn-danger-outline{
  flex:1 1 0;min-width:0;
  padding:0 3px;font-size:9px;height:34px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  text-align:center;justify-content:center;
}
.section-card-body{padding:24px 32px;}
.inv-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:16px;
}
.inv-item{
  background:#F8FAFC;
  border-radius:18px;
  padding:20px 12px;
  text-align:center;
  cursor:pointer;
  transition:all .2s cubic-bezier(0.16,1,0.3,1);
  border:1.5px solid #EEF2F7;
}
.inv-item:hover{
  border-color:#2563EB;
  background:#EEF4FF;
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(37,99,235,.1);
}
.inv-icon{font-size:30px;margin-bottom:8px;}
.inv-label{font-size:13px;font-weight:700;color:#374151;margin-bottom:6px;}
.inv-qty{font-size:24px;font-weight:800;}
.inv-sub{font-size:11px;color:#6B7280;margin-top:4px;}

/* ========= COMPANY INVENTORY (admin-matching style) ========= */
.company-box{
  margin-bottom:24px;
  background:#F8FAFC;
  border-radius:16px;
  padding:16px;
  border:1.5px solid #EEF2F7;
}
.company-box:last-child{margin-bottom:0;}
.company-box-title{
  font-weight:700;font-size:16px;margin-bottom:12px;color:#111827;
  display:flex;align-items:center;gap:8px;
}

/* ========= BOTTOM SECTION ========= */
.bottom-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
}

/* TABLE CARD */
.table-card{
  background:var(--surface);
  border-radius:24px;
  padding:28px;
  box-shadow:var(--shadow);
  border:1px solid var(--border);
}
.table-card-header{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;
}
.table-card-title{font-size:20px;font-weight:700;color:var(--text);}

table{width:100%;border-collapse:collapse;font-size:13px;}
th{
  background:var(--bg);
  color:var(--muted);
  font-weight:700;
  padding:0 16px;
  height:64px;
  text-align:right;
  border-bottom:1.5px solid var(--border);
  font-size:11px;text-transform:uppercase;letter-spacing:.4px;
  white-space:nowrap;
}
td{
  padding:0 16px;
  height:72px;
  border-bottom:1px solid var(--border);
  color:var(--text2);
  vertical-align:middle;
}
tbody tr:last-child td{border-bottom:none;}
tbody tr{transition:background var(--trans);}
tbody tr:hover td{background:#FAFBFF;}
.table-empty{
  text-align:center;padding:48px 20px;color:var(--muted);
}

/* TIMELINE CARD */
.timeline-card{
  background:var(--surface);
  border-radius:24px;
  padding:28px;
  box-shadow:var(--shadow);
  border:1px solid var(--border);
}
.timeline-item{
  height:120px;
  background:var(--bg);
  border-radius:16px;
  padding:16px 18px;
  margin-bottom:16px;
  border:1px solid var(--border);
  display:flex;flex-direction:column;justify-content:space-between;
  transition:var(--trans);
}
.timeline-item:hover{
  border-color:var(--primary-border);
  background:var(--primary-light);
}
.timeline-item-title{font-size:14px;font-weight:700;color:var(--text);}
.timeline-item-meta{font-size:12px;color:var(--muted);}
.timeline-item-footer{display:flex;align-items:center;justify-content:space-between;}

/* BADGES */
.badge{
  display:inline-flex;align-items:center;
  padding:4px 12px;border-radius:20px;
  font-size:11px;font-weight:700;
}
.badge-green{background:var(--active-bg);color:var(--active);border:1px solid var(--active-border);}
.badge-orange{background:var(--pending-bg);color:var(--pending);border:1px solid var(--pending-border);}
.badge-gray{background:var(--inactive-bg);color:var(--inactive);border:1px solid var(--border);}
.badge-blue{background:var(--primary-light);color:var(--primary);border:1px solid var(--primary-border);}
.badge-red{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);}

/* ========= MODAL ========= */
.overlay{
  position:fixed;inset:0;
  background:rgba(15,23,42,.5);
  backdrop-filter:blur(6px);
  z-index:300;
  display:flex;align-items:center;justify-content:center;
  padding:24px;overflow-y:auto;
}
.overlay-tight{padding:24px;}
@media(max-width:900px){
  .overlay-tight{padding:6px !important;}
  .overlay-flush{padding:0 !important;}
  .overlay-flush .modal{width:100% !important;max-width:100% !important;border-radius:0 !important;}
  .modal-company-inv{
    position:fixed !important;
    left:4px !important;right:4px !important;
    top:50% !important;bottom:auto !important;
    transform:translateY(-50%) !important;
    width:auto !important;max-width:none !important;
    max-height:90vh !important;overflow-y:auto !important;
    margin:0 !important;
  }
}
html.is-mobile .overlay-tight{padding:6px !important;}
html.is-mobile .overlay-flush{padding:0 !important;}
html.is-mobile .overlay-flush .modal{width:100% !important;max-width:100% !important;border-radius:0 !important;}
html.is-mobile .modal-company-inv{
  position:fixed !important;
  left:4px !important;right:4px !important;
  top:50% !important;bottom:auto !important;
  transform:translateY(-50%) !important;
  width:auto !important;max-width:none !important;
  max-height:90vh !important;overflow-y:auto !important;
  margin:0 !important;
}
.modal{
  background:var(--surface);
  border-radius:28px;
  padding:36px;
  width:100%;max-width:500px;
  border:1px solid var(--border);
  box-shadow:0 32px 80px rgba(15,23,42,.15);
  max-height:90vh;overflow-y:auto;
  animation:modalIn .3s var(--ease);
}
.modal-lg{max-width:620px;}
@keyframes modalIn{
  from{opacity:0;transform:translateY(20px) scale(.96);}
  to{opacity:1;transform:translateY(0) scale(1);}
}
.modal-header{
  display:flex;align-items:center;gap:16px;
  margin-bottom:28px;
  padding-bottom:24px;
  border-bottom:1px solid var(--border);
}
.modal-icon{
  width:56px;height:56px;
  border-radius:18px;
  background:var(--primary-light);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;
  flex-shrink:0;
}
.modal-title{font-size:22px;font-weight:800;color:var(--text);}
.modal-subtitle{font-size:14px;color:var(--muted);margin-top:2px;}

/* FORMS */
.form-group{margin-bottom:18px;}
.form-label{display:block;color:var(--text2);font-size:13px;margin-bottom:8px;font-weight:700;}
.form-input,.form-select{
  width:100%;
  padding:14px 18px;
  background:var(--bg);
  border:1.5px solid var(--border);
  border-radius:14px;
  color:var(--text);
  font-family:var(--font);font-size:15px;
  outline:none;transition:var(--trans);
  -webkit-appearance:none;
}
.form-input:focus,.form-select:focus{
  border-color:var(--primary);
  background:var(--surface);
  box-shadow:0 0 0 4px rgba(37,99,235,.08);
}
.form-input::placeholder{color:var(--muted2);}
.form-row{display:flex;gap:14px;}
.form-row .form-group{flex:1;}
.modal-actions{display:flex;gap:12px;padding-top:8px;}
.modal-actions .btn{flex:1;}
.modal-table{width:100%;border-collapse:collapse;font-size:14px;}
.modal-table th{background:var(--bg);color:var(--muted);font-weight:700;padding:10px 14px;text-align:right;border-bottom:1.5px solid var(--border);font-size:12px;}
.modal-table td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--text2);}
.modal-table tbody tr:last-child td{border-bottom:none;}
.modal-table tbody tr:hover td{background:var(--accent-bg);}

/* ALERT */
.alert{padding:12px 16px;border-radius:12px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:10px;}
.alert-error{background:var(--danger-bg);border:1px solid var(--danger-border);color:var(--danger);}
.alert-success{background:var(--active-bg);border:1px solid var(--active-border);color:var(--active);}

/* TABS */
.tabs{display:flex;gap:4px;margin-bottom:20px;padding:4px;background:var(--bg);border-radius:14px;}
.tab{
  flex:1;
  padding:10px 12px;
  border-radius:10px;
  border:none;background:none;
  color:var(--muted);
  font-family:var(--font);font-size:13px;font-weight:600;
  cursor:pointer;transition:var(--trans);
}
.tab:hover{color:var(--text);}
.tab.active{background:var(--surface);color:var(--primary);font-weight:700;box-shadow:var(--shadow-sm);}

/* TOAST */
.toast{
  position:fixed;bottom:32px;left:50%;
  transform:translateX(-50%) translateY(16px);
  background:var(--text);color:#fff;
  padding:16px 28px;border-radius:20px;
  font-size:15px;font-weight:600;
  z-index:9999;opacity:0;
  transition:all .3s var(--ease);
  pointer-events:none;
  white-space:nowrap;
  box-shadow:0 16px 40px rgba(0,0,0,.2);
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
/* على الموبايل: نثبّت التنبيه في منتصف الربع الأول (العلوي) من الارتفاع المرئي
   الحقيقي (var(--vh) محسوبة في JS لتعكس الجزء المرئي فعليًا على الموبايل). */
html.is-mobile .toast{bottom:auto !important;top:calc(var(--vh, 1vh) * 12.5) !important;}

/* EMPTY STATE */
.empty-state{
  text-align:center;padding:80px 20px;
}
.empty-icon{font-size:64px;margin-bottom:16px;opacity:.3;}
.empty-title{font-size:22px;font-weight:700;color:var(--text2);margin-bottom:8px;}
.empty-desc{font-size:15px;color:var(--muted);margin-bottom:24px;}

/* SPINNER */
.spinner{
  width:28px;height:28px;
  border:3px solid var(--border);
  border-top-color:var(--primary);
  border-radius:50%;
  animation:spin .7s linear infinite;
  margin:40px auto;
}
.spinner-lg{width:48px;height:48px;}
@keyframes spin{to{transform:rotate(360deg)}}

/* SKELETON */
.skeleton{
  background:linear-gradient(90deg,var(--bg) 25%,var(--border) 50%,var(--bg) 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
  border-radius:8px;
}
@keyframes shimmer{
  0%{background-position:200% 0;}
  100%{background-position:-200% 0;}
}

/* ANIMATIONS */
@keyframes fadeUp{
  from{opacity:0;transform:translateY(16px);}
  to{opacity:1;transform:translateY(0);}
}

/* SCROLLBAR */
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:var(--bg);border-radius:3px;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:var(--muted);}

/* MOBILE */
@media(max-width:1200px){
  .kpi-grid{grid-template-columns:repeat(2,1fr);}
  .pilots-grid{grid-template-columns:repeat(2,1fr);}
  .dash-summary-grid{grid-template-columns:repeat(2,1fr);}
}
@media(max-width:900px){
  .sidebar{
    position:fixed;right:0;top:0;bottom:0;
    width:var(--sidebar-w);
    z-index:100;
    border-radius:0;
    transform:translateX(100%);
    height:calc(var(--vh, 1vh) * 100);
    transition:transform .3s var(--ease);
  }
  .sidebar.open{transform:translateX(0);}
  .sidebar-overlay-bg{display:block;}
  .mobile-menu-btn{display:flex;}
  .app-layout{display:block;}
  .main-content{width:100%;padding-top:0;}
  .header{padding:0 20px;}
  .header-title{font-size:28px;}
  .search-box{width:200px;}
  .page-body{padding:20px;}
  .kpi-grid{grid-template-columns:1fr 1fr;}
  .pilots-grid{grid-template-columns:1fr;}
  .bottom-row{grid-template-columns:1fr;}
  .inv-grid{grid-template-columns:repeat(3,1fr);}
  .dash-summary-grid{grid-template-columns:repeat(2,1fr);}
  .dash-row{grid-template-columns:1fr;}
}
@media(min-width:901px){.mobile-menu-btn{display:none;}}
html.is-mobile .sidebar{
  position:fixed;right:0;top:0;bottom:0;
  width:var(--sidebar-w);
  z-index:100;
  border-radius:0;
  transform:translateX(100%);
  height:calc(var(--vh, 1vh) * 100);
  transition:transform .3s var(--ease);
}
html.is-mobile .sidebar.open{transform:translateX(0);}
html.is-mobile .sidebar-overlay-bg{display:block;}
html.is-mobile .mobile-menu-btn{display:flex;}
html.is-mobile .app-layout{display:block;}
html.is-mobile .main-content{width:100%;padding-top:0;}
html.is-mobile .header{margin-top:0;}

@media(max-width:540px){
  .kpi-grid{grid-template-columns:repeat(2,1fr);}
  .inv-grid{grid-template-columns:repeat(2,1fr);}
  .search-box{display:none;}
  .pilots-toolbar select.form-select{width:100%;}
}

@media print{
  .sidebar,.toast{display:none!important;}
}

/* ======================== MOBILE SCALE (30% smaller, fills screen) ======================== */
@media(max-width:900px){
  html{zoom:0.7;}
  html,body{width:142.86vw !important;max-width:142.86vw !important;}
  body{min-height:142.86vh !important;}
  .app-layout{height:142.86vh !important;width:142.86vw !important;max-width:142.86vw !important;}
  .main-content{height:142.86vh !important;}
}
`;

export default function SupervisorPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [pilots, setPilots] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('badaya_sup_section') || 'dashboard';
    return 'dashboard';
  });
  const [searchQ, setSearchQ] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modal, setModal] = useState('');
  const [modalData, setModalData] = useState<any>({});
  const [modalErr, setModalErr] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [prevModal, setPrevModal] = useState<{ name: string; data: any } | null>(null);

  const [pilotDetail, setPilotDetail] = useState<any>(null);
  const [pilotLoading, setPilotLoading] = useState(false);
  const pilotCache = useRef<Record<string, any>>({});
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'info'|'password'>('info');

  // اجعل زر/سحبة الرجوع في الموبايل تُغلق المودال أو صفحة البروفايل بدل الخروج من التطبيق
  useBackClose(!!modal, () => setModal(''));
  useBackClose(showProfile, () => setShowProfile(false));
  useBackClose(sidebarOpen, () => setSidebarOpen(false));
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState('');
  const [profileOldPass, setProfileOldPass] = useState('');
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileNewPass2, setProfileNewPass2] = useState('');
  const [transferNotifs, setTransferNotifs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifKindFilter, setNotifKindFilter] = useState('');
  const [notifLastSeen, setNotifLastSeen] = useState<number>(0);
  const [itemsTab, setItemsTab] = useState<Record<string, string>>({});
  const [itemsSearch, setItemsSearch] = useState('');
  const [closeConfirmData, setCloseConfirmData] = useState<any>(null);
  const [closedPilotIds, setClosedPilotIds] = useState<Set<string>>(new Set());
  const [settledHistory, setSettledHistory] = useState<any[]>([]);
  const [settledHistoryLoading, setSettledHistoryLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; onConfirm: () => void; title?: string; icon?: string; confirmLabel?: string } | null>(null);
  const [uniformDetailModal, setUniformDetailModal] = useState<any>(null);
  const [cardReturnModal, setCardReturnModal] = useState<any>(null); // مرتجع من كارت المعدة
  const [cardReturnQty, setCardReturnQty] = useState<number>(0);
  const [cardReturnPrice, setCardReturnPrice] = useState<number>(0);
  const [cardReturnLoading, setCardReturnLoading] = useState(false);
  const [cardReturnErr, setCardReturnErr] = useState('');
  const [cardReturnDone, setCardReturnDone] = useState<Set<string>>(new Set()); // تتبع المرتجعات المنجزة
  const [invDetailModal, setInvDetailModal] = useState<{ type?: string; label: string; icon: string; priceBatches: {price:number;remaining:number;total:number;condition:string}[]; remaining: number; totalValue: number; mismatchWarning?: string } | null>(null);
  const [unpaidInventory, setUnpaidInventory] = useState<Record<string, { qty: number; value: number; byPrice: { price: number; qty: number; value: number; pilots: { pilotId: string; name: string; qty: number; value: number }[] }[] }>>({});
  const [paidInventoryTotal, setPaidInventoryTotal] = useState<number>(0);
  const [paidInventoryByType, setPaidInventoryByType] = useState<Record<string, { qty: number; value: number }>>({});
  const [unpaidPilotsModal, setUnpaidPilotsModal] = useState<{ label: string; price: number; pilots: { pilotId: string; name: string; qty: number; value: number }[] } | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [companyInventory, setCompanyInventory] = useState<any[]>([]);
  const [requestCompanies, setRequestCompanies] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [requestsLog, setRequestsLog] = useState<any[]>([]);
  const [requestsLogLoading, setRequestsLogLoading] = useState(false);
  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsStatusFilter, setRequestsStatusFilter] = useState('');
  const [requestsTypeFilter, setRequestsTypeFilter] = useState('');
  const [fundingLog, setFundingLog] = useState<any[]>([]);
  const [fundingLogLoading, setFundingLogLoading] = useState(false);
  const [fundingSearch, setFundingSearch] = useState('');
  const [fundingSourceFilter, setFundingSourceFilter] = useState('');
  const [returnsLog, setReturnsLog] = useState<any[]>([]);
  const [returnsLogLoading, setReturnsLogLoading] = useState(false);
  const [returnSelectedItems, setReturnSelectedItems] = useState<Record<string, boolean>>({});
  const [returnItemQty, setReturnItemQty] = useState<Record<string, number>>({});
  // مرتجع المشرف (للمدير)
  const [supReturnRequests, setSupReturnRequests] = useState<any[]>([]);
  const [supReturnRequestsLoading, setSupReturnRequestsLoading] = useState(false);
  const [supReturnItems, setSupReturnItems] = useState<Record<string, { qty: number; price: number; condition: string; company_id: string; company_name: string }>>({});

  const TYPES = (() => {
    const dbKeys = equipmentTypes.map((t:any) => t.key);
    const extraKeys = dbKeys.filter((k:string) => !DEFAULT_TYPES.includes(k));
    return [...DEFAULT_TYPES, ...extraKeys];
  })();
  const UI: Record<string,string> = {
    ...DEFAULT_UI,
    ...Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.icon]))
  };
  const UL: Record<string,string> = {
    ...DEFAULT_UL,
    ...Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.label]))
  };

  // المخزن الإجمالي = تجميع مخزن الشركات نفسه (مصدر واحد) — بدل طلب منفصل من السيرفر
  // يضمن أن أي تحديث لمخازن الشركات ينعكس فوراً على المخزن الإجمالي بدون أي طلب إضافي
  const totalInventory = aggregateCompanyInventory(companyInventory, TYPES);
  // مديونية المعدات (إجمالي) = قيمة المتبقي بالمخزن + قيمة الكروت المسددة من الطيارين
  // (كانت تحسب المتبقي فقط بدون إضافة المسدد، فتظهر أقل من الحقيقي)
  const remainingInventoryValue = TYPES.reduce((s: number, t: string) => s + (totalInventory?.[t]?.totalValue || 0), 0);
  const equipmentDebtTotal = remainingInventoryValue + paidInventoryTotal;

  function renderIcon(icon: string | undefined, size: number = 48) {
    if (!icon) return <span style={{ fontSize: size * 0.6 }}>📦</span>;
    if (icon.startsWith('data:') || icon.startsWith('http')) {
      return <img src={icon} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return <span style={{ fontSize: size * 0.6 }}>{icon}</span>;
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    if (!token || role !== 'supervisor') { router.replace('/'); return; }
    init();
  }, []);

  useEffect(() => {
    if (activeSection === 'inventory' || activeSection === 'dashboard') {
      apiGet('getSupervisorStats').then(res => {
        if (res.success) setStats(res);
      });
      refreshUnpaidInventory();
    }
    if (activeSection === 'dashboard' || activeSection === 'inventory') {
      apiGet('getSupervisorPaidInventory').then(res => {
        if (res.success) {
          setPaidInventoryTotal(res.totalValue || 0);
          setPaidInventoryByType(res.data || {});
        }
      });
    }
  }, [activeSection]);

  async function refreshUnpaidInventory() {
    const res = await apiGet('getSupervisorUnpaidInventory');
    if (res.success) setUnpaidInventory(res.data || {});
  }



  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }
  function openModal(name: string, data: any = {}) { setPrevModal(null); setModal(name); setModalData(data); setModalErr(''); }
  function openSubModal(name: string, data: any = {}) { setPrevModal({ name: modal, data: modalData }); setModal(name); setModalData(data); setModalErr(''); }
  function closeModal() { setPrevModal(null); setModal(''); setModalData({}); setModalErr(''); }
  function goBack() {
    if (prevModal) {
      if (prevModal.name === 'pilotDetail' && prevModal.data?.pilotId) {
        invalidatePilotCache(prevModal.data.pilotId);
        openPilotDetail(prevModal.data.pilotId, true);
      } else {
        setModal(prevModal.name); setModalData(prevModal.data); setModalErr('');
      }
      setPrevModal(null);
    } else { closeModal(); }
  }

  async function init(showLoading = true) {
    if (showLoading) setLoading(true);
    const [statsRes, pilRes, regRes, eqTypesRes, compInvRes, myCompRes, allCompRes] = await Promise.all([
      apiGet('getSupervisorStats'),
      apiGet('getPilots'),
      apiGet('getRegions'),
      apiGet('getEquipmentTypes'),
      apiGet('getSupervisorCompanyInventory'),
      apiGet('getMyCompanies'),
      apiGet('getCompanies'),
    ]);
    if (!statsRes.success) { router.replace('/'); return; }
    setStats(statsRes);
    if (statsRes.session) {
      setProfileData({
        success: true,
        name: statsRes.session.name || '',
        username: statsRes.session.username || '',
        phone: statsRes.session.phone || '',
        region: statsRes.session.region || '',
        baseSalary: statsRes.session.baseSalary || 0,
      });
    }
    setPilots(pilRes.data || []);
    setRegions(regRes.data || []);
    if (eqTypesRes.success && eqTypesRes.data?.length > 0) setEquipmentTypes(eqTypesRes.data);
    if (compInvRes.success) setCompanyInventory(compInvRes.data || []);
    if (myCompRes.success) setRequestCompanies(myCompRes.data || []);
    if (allCompRes.success) setAllCompanies(allCompRes.data || []);
    loadTransferNotifs();
    loadNotifications(statsRes.session?.id);
    setLoading(false);
  }

  async function loadTransferNotifs() {
    const res = await apiGet('getPilotTransferNotifs');
    setTransferNotifs(res.data || []);
  }

  function notifSeenKey(supId: string) { return `badaya_notif_seen__${supId}`; }

  async function loadNotifications(supIdArg?: string) {
    setNotifLoading(true);
    const res = await apiGet('getSupervisorNotifications');
    if (res.success) setNotifications(res.data || []);
    const supId = supIdArg || stats?.session?.id;
    if (supId) {
      const raw = localStorage.getItem(notifSeenKey(supId));
      setNotifLastSeen(raw ? Number(raw) : 0);
    }
    setNotifLoading(false);
  }

  function openNotifications() {
    openModal('notifications');
    const supId = stats?.session?.id;
    if (supId) {
      const now = Date.now();
      localStorage.setItem(notifSeenKey(supId), String(now));
      setNotifLastSeen(now);
    }
  }

  async function loadRequestsLog() {
    setRequestsLogLoading(true);
    const [reqRes, retRes] = await Promise.all([
      apiGet('getRequests'),
      apiGet('getSupervisorReturnRequests'),
    ]);
    const reqRows = (reqRes.data || []).map((r: any) => ({ ...r, kind: 'request' }));
    const retRows = (retRes.data || []).map((r: any) => ({
      id: r.id,
      kind: 'return',
      status: r.status,
      date: r.created_at,
      items: Array.isArray(r.items) ? r.items : [],
      approved_by: r.approved_by,
      approved_at: r.approved_at,
      rejected_by: r.rejected_by,
      rejected_at: r.rejected_at,
    }));
    const merged = [...reqRows, ...retRows].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    setRequestsLog(merged);
    setRequestsLogLoading(false);
  }

  async function loadReturnsLog() {
    setReturnsLogLoading(true);
    const res = await apiGet("getSupervisorReturns");
    setReturnsLog(res.data || []);
    setReturnsLogLoading(false);
  }

  async function loadFundingLog() {
    setFundingLogLoading(true);
    const res = await apiGet('getFunding');
    const rows = (res.data || []).sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    setFundingLog(rows);
    setFundingLogLoading(false);
  }

  async function openSupervisorReturnModal(type: string) {
    const d = totalInventory?.[type] || {};
    const priceBatches: any[] = d.priceBatches || [];
    const remaining = d.remaining ?? 0;
    // بناء الحالة الابتدائية للعناصر
    const initItems: Record<string, { qty: number; price: number; condition: string; company_id: string; company_name: string }> = {};
    if (priceBatches.length > 0) {
      priceBatches.forEach((b: any, idx: number) => {
        const key = `batch_${idx}`;
        initItems[key] = { qty: 0, price: b.price || 0, condition: b.condition || 'new', company_id: b.company_id || '', company_name: b.company_name || '' };
      });
    } else {
      initItems['batch_0'] = { qty: 0, price: 0, condition: 'new', company_id: '', company_name: '' };
    }
    setSupReturnItems(initItems);
    openModal('supervisorReturn', { type, priceBatches, remaining, label: UL[type] || type, icon: UI[type] || '📦' });
  }

  async function doSupervisorReturn() {
    const { type } = modalData;
    const itemsList: any[] = [];
    for (const key of Object.keys(supReturnItems)) {
      const item = supReturnItems[key];
      if ((item.qty || 0) <= 0) continue;
      itemsList.push({
        type,
        qty: item.qty,
        price: item.price,
        condition: item.condition,
        company_id: item.company_id || '',
        company_name: item.company_name || '',
      });
    }
    if (itemsList.length === 0) { setModalErr('أدخل كمية واحدة على الأقل'); return; }
    setModalLoading(true);
    const res = await api('requestSupervisorReturn', { items: itemsList });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إرسال طلب المرتجع بنجاح، في انتظار موافقة المدير');
    setSupReturnItems({});
    // تحديث الإحصائيات
    const newStats = await apiGet('getSupervisorStats');
    if (newStats.success) setStats(newStats);
    refreshCompanyInventory();
    closeModal();
  }

  async function loadSupReturnRequests() {
    setSupReturnRequestsLoading(true);
    const res = await apiGet('getSupervisorReturnRequests');
    setSupReturnRequests(res.data || []);
    setSupReturnRequestsLoading(false);
  }


  async function openPilotDetail(pilotId: string, forceRefresh = false) {
    openModal('pilotDetail', { pilotId });
    setItemsSearch('');
    if (!forceRefresh && pilotCache.current[pilotId]) {
      setPilotDetail(pilotCache.current[pilotId]);
      setPilotLoading(false);
      return;
    }
    setPilotLoading(true);
    const res = await apiGet('getPilotDetails', { pilotId });
    if (res?.success) pilotCache.current[pilotId] = res;
    if (res?.success) {
      setClosedPilotIds(prev => {
        const s = new Set(prev);
        if (res.summary?.closed) s.add(pilotId); else s.delete(pilotId);
        return s;
      });
    }
    setPilotDetail(res);
    setPilotLoading(false);
  }

  function invalidatePilotCache(pilotId?: string) {
    if (pilotId) delete pilotCache.current[pilotId];
    else pilotCache.current = {};
  }

  async function refreshCompanyInventory() {
    const res = await apiGet('getSupervisorCompanyInventory');
    if (res.success) setCompanyInventory(res.data || []);
  }

  function openCompanyInventoryModal() {
    openModal('companyInventory');
    refreshCompanyInventory();
  }

  function openProfile() {
    setActiveSection('profile');
    localStorage.setItem('badaya_sup_section', 'profile');
    setProfileErr('');
    setProfileOldPass(''); setProfileNewPass(''); setProfileNewPass2('');
  }

  async function doChangePassword() {
    if (!profileOldPass || !profileNewPass) { setProfileErr('أدخل كلمة المرور القديمة والجديدة'); return; }
    if (profileNewPass !== profileNewPass2) { setProfileErr('كلمة المرور الجديدة غير متطابقة'); return; }
    if (profileNewPass.length < 4) { setProfileErr('كلمة المرور الجديدة قصيرة جداً'); return; }
    setProfileLoading(true);
    setProfileErr('');
    const res = await api('changePassword', { oldPass: profileOldPass, newPass: profileNewPass });
    setProfileLoading(false);
    if (!res.success) { setProfileErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تغيير كلمة المرور');
    setProfileOldPass(''); setProfileNewPass(''); setProfileNewPass2('');
    setProfileTab('info');
  }

  async function doAddPilot() {
    if (!modalData.name?.trim()) { setModalErr('أدخل اسم الطيار'); return; }
    if (!modalData.phone?.trim()) { setModalErr('أدخل رقم الهاتف'); return; }
    if (!modalData.whatsapp?.trim()) { setModalErr('أدخل رقم الواتساب'); return; }
    if (!modalData.baseSalary || Number(modalData.baseSalary) <= 0) { setModalErr('أدخل الراتب الأساسي'); return; }
    if (!modalData.region) { setModalErr('اختر المنطقة'); return; }
    if (!modalData.companyId) { setModalErr('اختر الشركة'); return; }
    setModalLoading(true);
    const res = await api('addPilot', {
      name: modalData.name, phone: modalData.phone || '',
      whatsapp: modalData.whatsapp || '',
      region: modalData.region || '', baseSalary: Number(modalData.baseSalary || 0),
      companyId: modalData.companyId || '',
    });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إضافة الطيار · كود: ' + res.code);
    closeModal(); init(false);
  }

  async function doUpdatePilot() {
    if (!modalData.name?.trim()) { setModalErr('أدخل اسم الطيار'); return; }
    if (!modalData.phone?.trim()) { setModalErr('أدخل رقم الهاتف'); return; }
    if (!modalData.region) { setModalErr('اختر المنطقة'); return; }
    if (!modalData.companyId) { setModalErr('اختر الشركة'); return; }
    setModalLoading(true);
    const res = await api('updatePilot', {
      pilotId: modalData.pilotId,
      name: modalData.name, phone: modalData.phone || '',
      region: modalData.region || '', companyId: modalData.companyId || '',
    });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تحديث بيانات الطيار');
    invalidatePilotCache(modalData.pilotId);
    if (prevModal?.name === 'pilotDetail') {
      setPrevModal(null);
      await openPilotDetail(modalData.pilotId, true);
    } else {
      closeModal(); init(false);
    }
  }

  async function doAddAdvance() {
    if (!modalData.amount) { setModalErr('أدخل المبلغ'); return; }
    setModalLoading(true);
    const res = await api('addAdvance', { pilotId: modalData.pilotId, amount: Number(modalData.amount), reason: modalData.reason || '' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تسجيل السلفة');
    invalidatePilotCache(modalData.pilotId);
    closeModal(); openPilotDetail(modalData.pilotId, true);
  }

  async function doAddDeduction() {
    if (!modalData.amount) { setModalErr('أدخل المبلغ'); return; }
    setModalLoading(true);
    const res = await api('addDeduction', { pilotId: modalData.pilotId, amount: Number(modalData.amount), reason: modalData.reason || '' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تسجيل الخصم');
    invalidatePilotCache(modalData.pilotId);
    closeModal(); openPilotDetail(modalData.pilotId, true);
  }

  async function doAddBonus() {
    if (!modalData.amount) { setModalErr('أدخل المبلغ'); return; }
    setModalLoading(true);
    const res = await api('addBonus', { pilotId: modalData.pilotId, amount: Number(modalData.amount), reason: modalData.reason || '' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تسجيل المكافأة');
    invalidatePilotCache(modalData.pilotId);
    closeModal(); openPilotDetail(modalData.pilotId, true);
  }

  async function doRecordUniform() {
    if (!modalData.selectedCompanyId) { setModalErr('اختر الشركة أولاً'); return; }
    if (!modalData.type) { setModalErr('اختر نوع المعدة'); return; }
    if (!modalData.qty || Number(modalData.qty) <= 0) { setModalErr('أدخل الكمية'); return; }
    if (modalData.priceOptionsCount > 1 && !modalData.priceBatchKey) { setModalErr('اختر السعر'); return; }
    // تحقق فوري من رصيد دفعة السعر/الحالة المحددة نفسها (مش الرقم الإجمالي للنوع)
    // قبل إرسال الطلب — عشان المشرف ياخد رسالة واضحة فورًا من غير رحلة سيرفر.
    if (modalData.selectedPrice !== undefined) {
      const companyEntry = companyInventory.find((c: any) => c.companyId === modalData.selectedCompanyId);
      const batches = (companyEntry?.inventory?.[modalData.type]?.priceBatches || []);
      const key = modalData.priceBatchKey;
      const matching = key
        ? batches.filter((b: any) => `${b.price}_${b.condition}` === key)
        : batches.filter((b: any) => Number(b.price) === Number(modalData.selectedPrice));
      const batchAvail = matching.reduce((s: number, b: any) => s + (Number(b.remaining) || 0), 0);
      if (Number(modalData.qty) > batchAvail) {
        setModalErr(`المتاح فقط ${batchAvail} قطعة بهذا السعر`);
        return;
      }
    }
    setModalLoading(true);
    try {
      const res = await api('recordUniform', {
        pilotId: modalData.pilotId, type: modalData.type, qty: Number(modalData.qty),
        price: modalData.selectedPrice !== undefined ? Number(modalData.selectedPrice) : undefined,
        condition: modalData.selectedCondition || undefined,
        companyId: modalData.selectedCompanyId || '',
      });
      if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
      showToast('✅ تم تسجيل المعدة');
      invalidatePilotCache(modalData.pilotId);
        refreshCompanyInventory();
      closeModal(); openPilotDetail(modalData.pilotId, true);
    } finally {
      setModalLoading(false);
    }
  }

  async function doSendFundingRequest() {
    if (!modalData.fundingAmount || Number(modalData.fundingAmount) <= 0) { setModalErr('أدخل المبلغ المطلوب'); return; }
    setModalLoading(true);
    const note = modalData.fundingNote ? `${modalData.fundingNote} - ${modalData.fundingAmount} ج` : `${modalData.fundingAmount} ج`;
    const res = await api('sendRequest', { type: 'funding', qty: Number(modalData.fundingAmount), note });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ في إرسال الطلب'); return; }
    invalidateCache(['getRequests', 'getManagerStats']);
    showToast('✅ تم إرسال طلب التمويل');
    closeModal();
    loadRequestsLog();
  }

  async function openRequestModal() {
    openModal('requestInv', { companyLoading: true });
    const res = await apiGet('getMyCompanies');
    const freshList = res.success ? (res.data || []) : [];
    setRequestCompanies(freshList);
    setModalData((p: any) => ({ ...p, companyLoading: false, companyId: freshList.length === 1 ? freshList[0].companyId : (p.companyId || '') }));
  }

  async function doSendRequest() {
    if (!modalData.type || !modalData.qty) { setModalErr('اختر النوع والكمية'); return; }
    if (modalData.companyLoading) { setModalErr('برجاء الانتظار جاري تحميل الشركات'); return; }
    if (requestCompanies.length > 0 && !modalData.companyId) { setModalErr('اختر الشركة'); return; }
    setModalLoading(true);
    const res = await api('sendRequest', { type: modalData.type, qty: Number(modalData.qty), note: modalData.note || '', companyId: modalData.companyId || '' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ في إرسال الطلب'); return; }
    invalidateCache(['getRequests', 'getManagerStats']);
    showToast('✅ تم إرسال الطلب');
    closeModal();
    // تحديث سجل الطلبات في الخلفية
    loadRequestsLog();
  }

  async function doTransferPilot() {
    if (!modalData.pilotId || !modalData.targetSupId) { setModalErr('اختر الطيار والمشرف'); return; }
    setModalLoading(true);
    const res = await api('transferPilot', { pilotId: modalData.pilotId, targetSupervisorId: modalData.targetSupId });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إرسال طلب التحويل');
    closeModal();
  }

  async function doRespondTransfer(notifId: string, accept: boolean) {
    const res = await api('respondTransfer', { notifId, accept });
    if (!res.success) { showToast('❌ خطأ'); return; }
    showToast(accept ? '✅ تم القبول' : '❌ تم الرفض');
    loadTransferNotifs(); loadNotifications(); init(false);
  }

  async function doCloseAccounts() {
    if (!pilotDetail?.pilot) return;
    const p = pilotDetail.pilot;
    const s = pilotDetail.summary || {};
    const advances = (pilotDetail.advances || []).filter((x:any) => !x.settled && !x.deleted);
    const deductions = (pilotDetail.deductions || []).filter((x:any) => !x.settled && !x.deleted);
    const bonuses = (pilotDetail.bonuses || []).filter((x:any) => !x.settled && !x.deleted);
    const uniforms = (pilotDetail.uniforms || []).filter((x:any) => !x.settled);
    // المعدات تُستثنى افتراضياً - المشرف يضيفها يدوياً
    const uniformIds = uniforms.map((u: any) => u.id);
    setCloseConfirmData({ pilotId: p.id, pilotName: p.name, whatsapp: p.whatsapp || p.phone || '', baseSalary: s.baseSalary || 0, advances, deductions, bonuses, uniforms, excludeIds: uniformIds });
  }

  async function doCloseAccountsConfirm() {
    if (!closeConfirmData) return;
    setModalLoading(true);
    const res = await api('supervisorCloseAccounts', { pilotId: closeConfirmData.pilotId, excludeIds: closeConfirmData.excludeIds });
    setModalLoading(false);
    if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
    showToast('✅ تم التقفيل');
    const data = closeConfirmData;
    setClosedPilotIds(prev => new Set(prev).add(data.pilotId));
    const excl = new Set(data.excludeIds);
    const includedAdvances = data.advances.filter((a: any) => !excl.has(a.id));
    const includedDeductions = data.deductions.filter((d: any) => !excl.has(d.id));
    const includedBonuses = data.bonuses.filter((b: any) => !excl.has(b.id));
    const includedUniforms = data.uniforms.filter((u: any) => !excl.has(u.id));
    const totalAdvances = includedAdvances.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);
    const totalDeductions = includedDeductions.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    const totalBonuses = includedBonuses.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
    const uniformCost = includedUniforms.reduce((sum: number, u: any) => sum + (Number(u.qty) || 0) * (Number(u.price) || 0), 0);
    const netSalary = (data.baseSalary || 0) - totalAdvances - totalDeductions + totalBonuses - uniformCost;
    invalidatePilotCache(data.pilotId);
    setCloseConfirmData(null);
    init(false);
    await openPilotDetail(data.pilotId, true);
    const confirmWA = window.confirm('هل تريد إرسال التقرير للطيار عبر واتساب؟');
    if (confirmWA && data.whatsapp) {
      const num = data.whatsapp.replace(/[^0-9]/g, '');
      const intlNum = num.startsWith('0') ? '2' + num : num;
      const lines = [
        `📋 تقرير تقفيل الحساب`,
        `👤 الطيار: ${data.pilotName}`,
        `💰 الراتب الأساسي: ${data.baseSalary || 0} ج`,
        `📊 صافي الراتب: ${netSalary} ج`,
        `💵 إجمالي السلف: ${totalAdvances} ج`,
        `✂️ الخصومات: ${totalDeductions} ج`,
        `🎁 المكافآت: ${totalBonuses} ج`,
        `👕 المعدات: ${uniformCost} ج`,
        `✅ تم التقفيل بتاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
      ];
      const msg = encodeURIComponent(lines.join('\n'));
      window.open(`https://wa.me/${intlNum}?text=${msg}`, '_blank');
    }
  }

  async function refreshSettledHistory(pilotId: string) {
    setSettledHistoryLoading(true);
    const histRes = await apiGet('getPilotSettledHistory', { pilotId });
    setSettledHistory(histRes.data || []);
    setSettledHistoryLoading(false);
  }

  function doUndoSettlement(session: any) {
    if (!pilotDetail?.pilot?.id) return;
    const pilotId = pilotDetail.pilot.id;
    setDeleteConfirm({
      title: 'تراجع عن التقفيل',
      icon: '↩️',
      confirmLabel: 'نعم، تراجع',
      message: 'هل أنت متأكد من التراجع عن هذا التقفيل؟ ستعود كل العناصر إلى حالة غير مقفلة ويمكنك عمل تقفيل جديد من صفحة الطيار.',
      onConfirm: async () => {
        const res = await api('undoSettlement', { pilotId, dateKey: session.dateKey });
        if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
        showToast('✅ تم التراجع عن التقفيل');
        setClosedPilotIds(prev => { const s = new Set(prev); s.delete(pilotId); return s; });
        invalidatePilotCache(pilotId);
        await openPilotDetail(pilotId, true);
        await refreshSettledHistory(pilotId);
      }
    });
  }

  async function doDeleteAdvance(advanceId: string, addedByRole: string) {
    if (addedByRole === 'admin') { showToast('❌ لا يمكنك حذف سلفة أضافها الأدمن'); return; }
    setDeleteConfirm({ message: 'هل أنت متأكد من حذف هذه السلفة؟', onConfirm: async () => {
      const res = await api('deleteAdvance', { advanceId });
      if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
      showToast('🗑️ تم حذف السلفة');
      invalidatePilotCache(pilotDetail.pilot.id);
      openPilotDetail(pilotDetail.pilot.id, true);
    }});
  }

  async function doDeleteDeduction(deductionId: string, addedByRole: string) {
    if (addedByRole === 'admin') { showToast('❌ لا يمكنك حذف خصم أضافه الأدمن'); return; }
    setDeleteConfirm({ message: 'هل أنت متأكد من حذف هذا الخصم؟', onConfirm: async () => {
      const res = await api('deleteDeduction', { deductionId });
      if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
      showToast('🗑️ تم حذف الخصم');
      invalidatePilotCache(pilotDetail.pilot.id);
      openPilotDetail(pilotDetail.pilot.id, true);
    }});
  }

  async function doDeleteBonus(bonusId: string, addedByRole: string) {
    if (addedByRole === 'admin') { showToast('❌ لا يمكنك حذف مكافأة أضافها الأدمن'); return; }
    setDeleteConfirm({ message: 'هل أنت متأكد من حذف هذه المكافأة؟', onConfirm: async () => {
      const res = await api('deleteBonus', { bonusId });
      if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
      showToast('🗑️ تم حذف المكافأة');
      invalidatePilotCache(pilotDetail.pilot.id);
      openPilotDetail(pilotDetail.pilot.id, true);
    }});
  }

  async function doCardReturn() {
    if (!cardReturnModal) return;
    if (!cardReturnQty || cardReturnQty <= 0) { setCardReturnErr('أدخل الكمية'); return; }
    const pilotId = cardReturnModal.pilotId;
    const pilotUniforms = (pilotDetail?.uniforms || []).filter((u: any) => !u.settled && !u.frozen && u.type === cardReturnModal.type);
    if (pilotUniforms.length === 0) { setCardReturnErr('لا توجد معدات متاحة لهذا النوع'); return; }
    let remaining = cardReturnQty;
    const selectedItems: any[] = [];
    for (const uni of pilotUniforms) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(uni.qty));
      selectedItems.push({
        uniform_id: uni.id,
        type: uni.type,
        qty: take,
        price: cardReturnPrice,
        condition: uni.condition || 'good',
        company_id: uni.company_id || '',
        company_name: uni.company_name || '',
      });
      remaining -= take;
    }
    if (selectedItems.length === 0) { setCardReturnErr('لم يتم اختيار أي معدات'); return; }
    setCardReturnLoading(true);
    const res = await api('requestReturn', { pilotId, selectedItems });
    setCardReturnLoading(false);
    if (!res.success) { setCardReturnErr(res.message || 'خطأ في إرسال الطلب'); return; }
    setCardReturnDone(prev => new Set(prev).add(cardReturnModal.cardKey));
    setCardReturnModal(null);
    showToast('✅ تم إرجاع المعدة لمخزن المشرف');
    invalidatePilotCache(pilotId);
    refreshCompanyInventory();
    openPilotDetail(pilotId, true);
  }

  async function doRequestReturn() {
    const pilotId = pilotDetail?.pilot?.id || modalData.pilotId;
    if (!pilotId) { setModalErr('خطأ: لم يتم تحديد الطيار'); return; }
    const pilotUniforms = (pilotDetail?.uniforms || []).filter((u: any) => !u.settled && !u.frozen);
    // بناء قائمة العناصر المختارة
    const selectedItemsList: any[] = [];
    for (const uni of pilotUniforms) {
      if (!returnSelectedItems[uni.id]) continue;
      const qty = returnItemQty[uni.id] ?? Number(uni.qty);
      if (qty <= 0) continue;
      if (qty > Number(uni.qty)) { setModalErr(`الكمية أكبر من المتاحة للمعدة ${UL[uni.type] || uni.type}`); return; }
      selectedItemsList.push({
        uniform_id: uni.id,
        type: uni.type,
        qty,
        price: Number(uni.price) || 0,
        condition: uni.condition || 'good',
        company_id: uni.company_id || '',
        company_name: uni.company_name || '',
      });
    }
    if (selectedItemsList.length === 0) { setModalErr('لم يتم اختيار أي معدات'); return; }
    setModalLoading(true);
    const res = await api('requestReturn', { pilotId, selectedItems: selectedItemsList });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إرجاع المعدة لمخزن المشرف');
    setReturnSelectedItems({});
    setReturnItemQty({});
    invalidatePilotCache(pilotId);
    refreshCompanyInventory();
    closeModal(); openPilotDetail(pilotId, true);
  }

  function doLogout() {
    invalidateAllCache(); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY);
    router.push('/');
  }

  async function loadSupervisors() {
    const res = await apiGet('getSupervisors');
    setSupervisors(res.data || []);
  }

  function openAddPilotModal() {
    const defaultCompanyId = requestCompanies.length > 0 ? requestCompanies[0].companyId : '';
    const defaultRegion = stats?.session?.region || '';
    openModal('addPilot', { companyId: defaultCompanyId, region: defaultRegion });
  }

  function pilotCompanyName(p: any): string {
    const cid = (p?.company_id || '').split(',')[0].trim();
    if (!cid) return '-';
    const found = requestCompanies.find((c: any) => c.companyId === cid);
    return found?.companyName || '-';
  }

  const filteredPilots = pilots.filter(p =>
    (!searchQ ||
      p.name?.includes(searchQ) ||
      p.pilot_code?.includes(searchQ) ||
      p.phone?.includes(searchQ)) &&
    (!regionFilter || p.region === regionFilter)
  );

  const netSalary = (stats?.totalFunding || 0) - (stats?.totalAdvances || 0);

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:16,background:'transparent',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',zIndex:9999}}>
        <div style={{width:42,height:42,borderRadius:'50%',border:'4px solid rgba(37,99,235,0.2)',borderTopColor:'#2563EB',animation:'spin .8s linear infinite'}} />
        <div style={{fontSize:14,color:'#111827',fontWeight:600}}>جارٍ التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="app-layout">

        {/* ===== MOBILE MENU TOGGLE ===== */}
        {sidebarOpen && <div className="sidebar-overlay-bg" onClick={() => setSidebarOpen(false)} />}

        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">✈️</div>
            <div>
              <div className="sidebar-logo-text">بداية</div>
              <div className="sidebar-logo-sub">لوحة المشرف</div>
            </div>
          </div>

          <span className="sidebar-section-label">القائمة الرئيسية</span>

          {[
            { key:'dashboard', icon:'📊', label:'لوحة التحكم' },
            { key:'pilots', icon:'✈️', label:'الطيارين' },
            { key:'inventory', icon:'📦', label:'المخزن' },
            { key:'finance', icon:'💰', label:'الماليات' },
          ].map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.key); localStorage.setItem('badaya_sup_section', item.key); setSidebarOpen(false); }}
            >
              <span className="si-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}



          <div className="sidebar-footer">
            <div className="sidebar-user" style={{ cursor:'pointer' }} onClick={() => { setActiveSection('profile'); localStorage.setItem('badaya_sup_section','profile'); setSidebarOpen(false); }}>
              <div className="sidebar-avatar">{(stats?.session?.name || 'م')[0]}</div>
              <div>
                <div className="sidebar-user-name">{stats?.session?.name || 'المشرف'}</div>
                <div className="sidebar-user-role" style={{ color: activeSection==='profile' ? 'var(--primary)' : undefined }}>{activeSection==='profile' ? '← الملف الشخصي' : (stats?.session?.region || 'المنطقة')}</div>
              </div>
            </div>
            {requestCompanies.length > 0 && (
              <div className="sidebar-companies">
                {requestCompanies.map((c: any) => (
                  <span key={c.companyId} className="sidebar-company-badge">🏢 {c.companyName}</span>
                ))}
              </div>
            )}
            <button className="btn-logout" onClick={doLogout}>
              🚪 تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <div className="main-content">

          {/* ===== STICKY TOP (UPGRADE BAR + HEADER) ===== */}
          <div className="sticky-top-wrap">
            {/* ===== UPGRADE BAR ===== */}
            <div className="main-upgrade-bar">
              <span className="main-upgrade-bar-text">✨ احصل على مزايا إضافية ومميزات متقدمة</span>
              <button className="main-upgrade-bar-btn">ترقية الخطة</button>
            </div>

            {/* ===== HEADER ===== */}
            <header className="header">
              <div className="header-right" style={{display:'flex',alignItems:'center',gap:12}}>
                <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                <div>
                  <div className="header-title">{activeSection === 'dashboard' ? 'لوحة التحكم' : activeSection === 'pilots' ? 'الطيارين' : activeSection === 'inventory' ? 'المخزن' : activeSection === 'profile' ? 'الملف الشخصي' : 'الماليات'}</div>
                  <div className="header-subtitle">{activeSection === 'dashboard' ? 'مرحباً بعودتك، ابدأ يومك بإنجاز' : activeSection === 'pilots' ? 'إدارة ومتابعة الطيارين' : activeSection === 'inventory' ? 'المعدات والمخزون' : activeSection === 'profile' ? 'بياناتك الشخصية وإعدادات الحساب' : 'الملخص المالي'}</div>
                </div>
              </div>
              <div className="header-left">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    placeholder="البحث عن طيار..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)} autoComplete="off" />
                </div>

                <div
                  className="header-action"
                  title="الإشعارات"
                  onClick={openNotifications}
                >
                  🔔
                  {(() => {
                    const unseenCount = notifications.filter((n: any) => new Date(n.date || 0).getTime() > notifLastSeen).length;
                    return unseenCount > 0 && <span className="notif-badge">{unseenCount}</span>;
                  })()}
                </div>
              </div>
            </header>
          </div>

          {/* ===== PAGE BODY ===== */}
          <div className="page-body">

            {/* ===== لوحة التحكم ===== */}
            {activeSection === 'dashboard' && (
              <div>
                {/* بطاقات الملخص */}
                <div className="dash-summary-grid">
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon blue">✈️</div>
                      <span className="summary-label">طيارون نشطون</span>
                    </div>
                    <div className="summary-value blue">{pilots.length}</div>
                    <div className="summary-desc">مسجلون تحت إشرافك</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon green">💰</div>
                      <span className="summary-label">صافي رواتب الفريق</span>
                    </div>
                    <div className="summary-value green">{fmt(stats?.netSalaries)} <small>ج</small></div>
                    <div className="summary-desc">الرواتب - السلف - الخصومات + المكافآت - المعدات الغير مسددة (غير المقفولة)</div>
                  </div>
                  <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => { loadFundingLog(); openModal('fundingLog'); }}>
                    <div className="summary-card-top">
                      <div className="summary-icon blue">💵</div>
                      <span className="summary-label">إجمالي رصيد التمويل</span>
                    </div>
                    <div className="summary-value blue">{fmt(stats?.totalFunding)} <small>ج</small></div>
                    <div className="summary-desc">تمويل مُرسل من المدير + طلبات موافَق عليها</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon">📦</div>
                      <span className="summary-label">مديونية المعدات</span>
                    </div>
                    <div className="summary-value">
                      {fmt(equipmentDebtTotal)} <small>ج</small>
                    </div>
                    <div className="summary-desc">قيمة المعدات المسلَّمة + المتبقية بالمخزن</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon green">✅</div>
                      <span className="summary-label">معدات مسددة من الطيارين</span>
                    </div>
                    <div className="summary-value green">
                      {fmt(paidInventoryTotal)} <small>ج</small>
                    </div>
                    <div className="summary-desc">قيمة المعدات التي تم تحصيلها</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon orange">⚠️</div>
                      <span className="summary-label">صافي مديونية المعدات</span>
                    </div>
                    <div className="summary-value orange">
                      {fmt(equipmentDebtTotal - paidInventoryTotal)} <small>ج</small>
                    </div>
                    <div className="summary-desc">مديونية المعدات ناقص المسدد من الطيارين</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon blue">🧾</div>
                      <span className="summary-label">مستحقات المدير</span>
                    </div>
                    <div className="summary-value blue">
                      {fmt(equipmentDebtTotal + (stats?.totalFunding || 0))} <small>ج</small>
                    </div>
                    <div className="summary-desc">مديونية المعدات + إجمالي رصيد التمويل</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-top">
                      <div className="summary-icon green">📊</div>
                      <span className="summary-label">شيتة الرواتب</span>
                    </div>
                    <div className="summary-value green">{fmt(0)} <small>ج</small></div>
                    <div className="excel-sheet-mini">
                      <div className="excel-sheet-row excel-sheet-head">
                        <span>A</span><span>B</span><span>C</span><span>D</span>
                      </div>
                      <div className="excel-sheet-row">
                        <span>1</span><span></span><span></span><span></span>
                      </div>
                      <div className="excel-sheet-row">
                        <span>2</span><span></span><span></span><span></span>
                      </div>
                      <div className="excel-sheet-row">
                        <span>3</span><span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ===== قسم الطيارين ===== */}
            {activeSection === 'pilots' && (
              <div>
                <div className="section-header">
                  <div>
                    <div className="section-title">الطيارين</div>
                    <div className="section-subtitle">{filteredPilots.length} من {pilots.length} طيار مسجل تحت إشرافك</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-secondary" onClick={() => { openModal('transferPilot'); loadSupervisors(); }}>
                      🔄 تحويل طيار
                    </button>
                    <button className="btn btn-primary" onClick={openAddPilotModal}>
                      + إضافة طيار
                    </button>
                  </div>
                </div>

                <div className="table-card">
                  <div className="pilots-toolbar">
                    <div className="search-box-inline">
                      <span className="search-icon">🔍</span>
                      <input
                        placeholder="بحث بالاسم أو الكود أو الهاتف..."
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)} autoComplete="off" />
                    </div>
                    <select className="form-select" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                      <option value="">كل المناطق</option>
                      {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>

                  {filteredPilots.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">✈️</div>
                      <div className="empty-title">لا يوجد طيارون</div>
                      <div className="empty-desc">{pilots.length === 0 ? 'أضف أول طيار للبدء في إدارة الفريق' : 'لا توجد نتائج مطابقة للبحث أو الفلتر'}</div>
                      {pilots.length === 0 && <button className="btn btn-primary" onClick={openAddPilotModal}>إضافة طيار</button>}
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>الطيار</th>
                            <th>الكود</th>
                            <th>الهاتف</th>
                            <th>المنطقة</th>
                            <th>الشركة</th>
                            <th>الراتب الأساسي</th>
                            <th>الحالة</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPilots.map(p => (
                            <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPilotDetail(p.id)}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div className="table-avatar">✈️</div>
                                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                                </div>
                              </td>
                              <td><span className="pilot-code">{p.pilot_code}</span></td>
                              <td>{p.phone || '-'}</td>
                              <td>{p.region || '-'}</td>
                              <td>{pilotCompanyName(p)}</td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(p.base_salary)} ج</td>
                              <td><span className="badge badge-green">نشط</span></td>
                              <td onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openPilotDetail(p.id)}>عرض</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openModal('editPilot', {
                                    pilotId: p.id, name: p.name, phone: p.phone || '',
                                    region: p.region || (stats?.session?.region || ''),
                                    companyId: (p.company_id || '').split(',')[0].trim() || (requestCompanies.length > 0 ? requestCompanies[0].companyId : ''),
                                  })}>✏️</button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openModal('addAdvance', { pilotId: p.id })}>💵</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== قسم المخزن ===== */}
            {activeSection === 'inventory' && (
              <div>
                <div className="section-header">
                  <div>
                    <div className="section-title">المخزن</div>
                    <div className="section-subtitle">المعدات المتاحة وأرصدتها الحالية</div>
                  </div>
                </div>
                <div className="section-card">
                  <div className="section-card-header inv-total-header">
                    <div className="section-card-title inv-total-title">📦 المخزن الإجمالي {totalInventory && <span className="inv-total-value" style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', marginRight: 8 }}>إجمالي القيمة: {fmt(TYPES.reduce((s:number, t:string) => s + (totalInventory?.[t]?.totalValue || 0), 0))} ج</span>}</div>
                    <div className="section-card-actions">
                      <button className="btn btn-primary btn-sm" onClick={openRequestModal}>+ طلب معدة</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { loadRequestsLog(); openModal('requestsLog'); }}>📋 سجل الطلبات</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { loadReturnsLog(); openModal('returnsLog'); }}>🔄 سجل المرتجعات</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { loadSupReturnRequests(); openModal('supReturnLog'); }}>↩️ مرتجع للمدير</button>
                      <button className="btn btn-secondary btn-sm" onClick={openCompanyInventoryModal}>🏢 مخزن الشركات</button>
                    </div>
                  </div>
                  <div className="section-card-body">
                    <div className="inv-grid">
                      {TYPES.map(t => {
                        const d = totalInventory?.[t] || { remaining: 0, total: 0, distributed: 0, totalValue: 0, priceBatches: [], conditionBreakdown: { new: 0, good: 0, damaged: 0 }, frozenQty: 0 };
                        const cb = d.conditionBreakdown || { new: 0, good: 0, damaged: 0 };
                        const hasConditions = (cb.new || 0) + (cb.good || 0) + (cb.damaged || 0) > 0;
                        const frozen = d.frozenQty || 0;
                        const paid = paidInventoryByType?.[t] || { qty: 0, value: 0 };
                        const paidValue = paid.value || 0;
                        const paidQty = paid.qty || 0;
                        const unpaidValue = Math.max((d.totalValue || 0) - paidValue, 0);
                        const unpaidQty = Math.max((d.distributed || 0) - paidQty, 0);
                        return (
                          <div
                            key={t}
                            className="inv-item"
                            onClick={openCompanyInventoryModal}
                          >
                            <div className="inv-icon">
                              {renderIcon(UI[t], 48)}
                            </div>
                            <div className="inv-label">{UL[t]}</div>
                            <div className="inv-qty" style={{ color: d.remaining < 0 ? 'var(--danger)' : d.remaining === 0 ? 'var(--warning)' : 'var(--success)' }}>{d.remaining ?? 0}</div>
                            {frozen > 0 && (
                              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#B45309', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                                🔒 مجمد: {frozen}
                              </div>
                            )}
                            {hasConditions && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {(cb.new || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '2px 7px' }}>جديد: {cb.new}</span>}
                                {(cb.good || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#2563eb', borderRadius: 6, padding: '2px 7px' }}>جيدة: {cb.good}</span>}
                                {(cb.damaged || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 7px' }}>تالف: {cb.damaged}</span>}
                              </div>
                            )}

                            <div style={{ marginTop: 8, width: '100%', background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '2px 0' }}>
                                <span>مستلم</span><span style={{ direction: 'ltr' }}>{d.total ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '2px 0' }}>
                                <span>موزع</span><span style={{ direction: 'ltr' }}>{d.distributed ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--accent)', padding: '2px 0' }}>
                                <span>الإجمالي</span><span style={{ direction: 'ltr' }}>{(d.totalValue || 0).toLocaleString('en-US')} ج</span>
                              </div>
                            </div>

                            <div style={{ marginTop: 6, width: '100%', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '6px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#16a34a', padding: '2px 0' }}>
                                <span>المسدد</span><span style={{ direction: 'ltr' }}>{paidQty} ({paidValue.toLocaleString('en-US')} ج)</span>
                              </div>
                            </div>

                            <div style={{ marginTop: 6, width: '100%', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '6px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#DC2626', padding: '2px 0' }}>
                                <span>لم يسدد</span><span style={{ direction: 'ltr' }}>{unpaidQty} ({unpaidValue.toLocaleString('en-US')} ج)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== قسم الماليات ===== */}
            {activeSection === 'finance' && (
              <div>
                <div className="section-header">
                  <div>
                    <div className="section-title">الماليات</div>
                    <div className="section-subtitle">ملخص التمويل والرواتب والمستحقات</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openModal('requestFunding')}>💰 طلب تمويل</button>
                </div>

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap kpi-icon-green">💵</div>
                    <div>
                      <div className="kpi-accent-line kpi-line-green"></div>
                      <div className="kpi-value green">{fmt(stats?.totalFunding)}</div>
                      <div className="kpi-label">إجمالي التمويل المستلم · ج</div>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap kpi-icon-blue">📊</div>
                    <div>
                      <div className="kpi-accent-line kpi-line-blue"></div>
                      <div className="kpi-value blue">{fmt(stats?.mySalary)}</div>
                      <div className="kpi-label">راتبي الصافي · ج</div>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap kpi-icon-orange">📋</div>
                    <div>
                      <div className="kpi-accent-line kpi-line-orange"></div>
                      <div className="kpi-value orange">{fmt(stats?.totalAdvances)}</div>
                      <div className="kpi-label">إجمالي السلف · ج</div>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-icon-wrap kpi-icon-accent">✂️</div>
                    <div>
                      <div className="kpi-accent-line kpi-line-accent"></div>
                      <div className="kpi-value">{fmt(stats?.totalDeductions)}</div>
                      <div className="kpi-label">إجمالي الخصومات · ج</div>
                    </div>
                  </div>
                </div>

                <div className="table-card" style={{ marginTop: 24 }}>
                  <div className="table-card-header">
                    <div className="table-card-title">رواتب الطيارين</div>
                  </div>
                  <div className="table-wrap" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>الطيار</th>
                          <th>الراتب الأساسي</th>
                          <th>المنطقة</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pilots.length === 0 ? (
                          <tr><td colSpan={4} className="table-empty">لا يوجد طيارون</td></tr>
                        ) : pilots.map(p => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPilotDetail(p.id)}>
                            <td style={{ fontWeight: 700 }}>{p.name}</td>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(p.base_salary)} ج</td>
                            <td>{p.region || '-'}</td>
                            <td><span className="badge badge-green">نشط</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


            {activeSection === 'profile' && (
              <div>
                <div className="section-header">
                  <div>
                    <div className="section-title">الملف الشخصي</div>
                    <div className="section-subtitle">بياناتك الشخصية وإعدادات الحساب</div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:24, maxWidth:860 }}>

                  {/* بطاقة البيانات */}
                  <div className="table-card">
                    <div className="table-card-header">
                      <div className="table-card-title">👤 البيانات الشخصية</div>
                    </div>
                    <div style={{ padding:'8px 0' }}>
                      {profileLoading && <div style={{ textAlign:'center', padding:24, color:'var(--muted)' }}>جاري التحميل...</div>}
                      {!profileLoading && profileData && (
                        <div>
                          <div className="profile-info-row">
                            <span className="profile-info-icon">👤</span>
                            <div><div className="profile-info-label">الاسم</div><div className="profile-info-value">{profileData.name}</div></div>
                          </div>
                          <div className="profile-info-row">
                            <span className="profile-info-icon">🔑</span>
                            <div><div className="profile-info-label">اسم المستخدم</div><div className="profile-info-value">{profileData.username}</div></div>
                          </div>
                          <div className="profile-info-row">
                            <span className="profile-info-icon">📞</span>
                            <div><div className="profile-info-label">رقم الهاتف</div><div className="profile-info-value">{profileData.phone || '—'}</div></div>
                          </div>
                          <div className="profile-info-row">
                            <span className="profile-info-icon">📍</span>
                            <div><div className="profile-info-label">المنطقة</div><div className="profile-info-value">{profileData.region || '—'}</div></div>
                          </div>
                          <div className="profile-info-row" style={{ borderBottom:'none' }}>
                            <span className="profile-info-icon">💰</span>
                            <div><div className="profile-info-label">الراتب الأساسي</div><div className="profile-info-value">{Number(profileData.baseSalary || 0).toLocaleString('ar-EG')} ج.م</div></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* بطاقة تغيير الباسورد */}
                  <div className="table-card">
                    <div className="table-card-header">
                      <div className="table-card-title">🔐 تغيير كلمة المرور</div>
                    </div>
                    <div style={{ padding:'16px 0 8px' }}>
                      <div className="form-group">
                        <label className="form-label">كلمة المرور الحالية</label>
                        <input className="form-input" type="password" placeholder="أدخل كلمة المرور الحالية" value={profileOldPass} onChange={e => setProfileOldPass(e.target.value)} autoComplete="off" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">كلمة المرور الجديدة</label>
                        <input className="form-input" type="password" placeholder="أدخل كلمة المرور الجديدة" value={profileNewPass} onChange={e => setProfileNewPass(e.target.value)} autoComplete="off" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">تأكيد كلمة المرور الجديدة</label>
                        <input className="form-input" type="password" placeholder="أعد إدخال كلمة المرور الجديدة" value={profileNewPass2} onChange={e => setProfileNewPass2(e.target.value)} autoComplete="off" />
                      </div>
                      {profileErr && <div className="modal-err">{profileErr}</div>}
                      <button className="btn btn-primary" style={{ width:'100%', marginTop:4 }} disabled={profileLoading} onClick={doChangePassword}>{profileLoading ? 'جاري الحفظ...' : '✅ حفظ كلمة المرور الجديدة'}</button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>{/* end page-body */}
        </div>{/* end main-content */}
      </div>{/* end app-layout */}

      {/* =================== MODALS =================== */}

      {/* تفاصيل طيار */}
      {modal === 'pilotDetail' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg">
            {pilotLoading ? <div className="spinner spinner-lg"></div> : (!pilotDetail || !pilotDetail.pilot) ? <div style={{padding:32,textAlign:'center',color:'var(--muted)'}}>تعذر تحميل بيانات الطيار</div> : (
              <>
                <div className="modal-header">
                  <div className="modal-icon">✈️</div>
                  <div>
                    <div className="modal-title">{pilotDetail.pilot?.name}</div>
                    <div className="modal-subtitle">
                      <span className="badge badge-blue">{pilotDetail.pilot?.pilot_code}</span>
                      {' '}
                      <span className="badge badge-green">نشط</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                  {(closedPilotIds.has(pilotDetail.pilot?.id) ? [
                    { label: 'الراتب الأساسي', val: fmt(0) + ' ج', color: 'var(--primary)' },
                    { label: 'صافي الراتب', val: fmt(-(pilotDetail.summary?.uniformCost || 0)) + ' ج', color: (pilotDetail.summary?.uniformCost || 0) > 0 ? 'var(--danger)' : 'var(--active)' },
                    { label: 'إجمالي السلف', val: fmt(0) + ' ج', color: 'var(--danger)' },
                    { label: 'الخصومات', val: fmt(0) + ' ج', color: 'var(--pending)' },
                    { label: 'المكافآت', val: fmt(0) + ' ج', color: 'var(--active)' },
                    { label: 'المعدات', val: fmt(pilotDetail.summary?.uniformCost) + ' ج', color: 'var(--muted)' },
                  ] : [
                    { label: 'الراتب الأساسي', val: fmt(pilotDetail.pilot?.base_salary) + ' ج', color: 'var(--primary)' },
                    { label: 'صافي الراتب', val: fmt(pilotDetail.summary?.netSalary) + ' ج', color: 'var(--active)' },
                    { label: 'إجمالي السلف', val: fmt(pilotDetail.summary?.totalAdvances) + ' ج', color: 'var(--danger)' },
                    { label: 'الخصومات', val: fmt(pilotDetail.summary?.totalDeductions) + ' ج', color: 'var(--pending)' },
                    { label: 'المكافآت', val: fmt(pilotDetail.summary?.totalBonuses) + ' ج', color: 'var(--active)' },
                    { label: 'المعدات', val: fmt(pilotDetail.summary?.uniformCost) + ' ج', color: 'var(--muted)' },
                  ]).map(item => (
                    <div key={item.label} style={{ background: 'var(--bg)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 700 }}>{item.label}</div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: item.color }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { openSubModal('editPilot', {
                    pilotId: pilotDetail.pilot.id, name: pilotDetail.pilot.name, phone: pilotDetail.pilot.phone || '',
                    region: pilotDetail.pilot.region || (stats?.session?.region || ''),
                    companyId: (pilotDetail.pilot.company_id || '').split(',')[0].trim() || (requestCompanies.length > 0 ? requestCompanies[0].companyId : ''),
                  }); }}>✏️ تعديل البيانات</button>
                  <div className="pilot-quick-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => { openSubModal('addAdvance', { pilotId: pilotDetail.pilot.id }); }}>💵 سلفة</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { openSubModal('addDeduction', { pilotId: pilotDetail.pilot.id }); }}>✂️ خصم</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { openSubModal('addBonus', { pilotId: pilotDetail.pilot.id }); }}>🎁 مكافأة</button>
                  </div>
                  <div className="pilot-quick-actions-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => { refreshCompanyInventory(); openSubModal('recordUniform', { pilotId: pilotDetail.pilot.id }); }}>📦 تسليم معدة للطيار</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { openSubModal('requestReturn', { pilotId: pilotDetail.pilot.id }); }}>🔄 مرتجع</button>
                    <button className="btn-danger-outline" onClick={doCloseAccounts}>{modalLoading ? '...' : '🔒 تقفيل'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                      const pilotId = pilotDetail.pilot.id;
                      setSettledHistoryLoading(true);
                      openSubModal('settledHistory', {});
                      const [histRes] = await Promise.all([
                        apiGet('getPilotSettledHistory', { pilotId }),
                        (async () => {
                          const fresh = await apiGet('getPilotDetails', { pilotId });
                          if (fresh?.success) { pilotCache.current[pilotId] = fresh; setPilotDetail(fresh); }
                        })(),
                      ]);
                      setSettledHistory(histRes.data || []);
                      setSettledHistoryLoading(false);
                    }}>📋 سجل التقفيلات</button>
                  </div>
                </div>

                {/* كروت المعدات التي استلمها الطيار */}
                {(() => {
                  const allUniforms = (pilotDetail.uniforms || []);
                  // Group by type
                  const grouped: Record<string, { totalQty: number; totalValue: number; entries: any[]; type: string; settled: boolean }> = {};
                  allUniforms.forEach((u: any) => {
                    const key = u.type + (u.settled ? '__settled' : '');
                    if (!grouped[key]) grouped[key] = { totalQty: 0, totalValue: 0, entries: [], type: u.type, settled: !!u.settled };
                    grouped[key].totalQty += Number(u.qty) || 0;
                    grouped[key].totalValue += (Number(u.qty) || 0) * (Number(u.price) || 0);
                    grouped[key].entries.push(u);
                  });
                  const types = Object.keys(grouped);
                  if (types.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🎒</span> المعدات المستلمة
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
                        {types.map(key => {
                          const g = grouped[key];
                          const t = g.type;
                          const isSettled = g.settled;
                          const condCount: Record<string, number> = {};
                          const companies = new Set<string>();
                          const prices = new Set<number>();
                          g.entries.forEach((e: any) => {
                            const cond = e.condition || 'new';
                            condCount[cond] = (condCount[cond] || 0) + (Number(e.qty) || 0);
                            if (e.company_name) companies.add(e.company_name);
                            if (Number(e.price) > 0) prices.add(Number(e.price));
                          });
                          const hasMultiPrices = prices.size > 1;
                          const condLabels: Record<string, string> = { new: 'جديد', good: 'جيد', damaged: 'تالف' };
                          const cardKey = `${pilotDetail.pilot.id}_${key}`;
                          const isReturnDone = cardReturnDone.has(cardKey);
                          return (
                            <div
                              key={key}
                              style={{ background: isSettled ? 'var(--bg2)' : 'var(--active-bg)', border: isSettled ? '1.5px solid var(--border)' : '1.5px solid var(--active-border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center', position: 'relative', transition: 'all .2s', overflow: 'hidden' }}
                            >
                              <div
                                onClick={() => setUniformDetailModal({ type: t, label: UL[t] || t, icon: UI[t] || '👕', grouped: g, condLabels })}
                                style={{ opacity: isSettled ? 0.5 : 1, cursor: 'pointer' }}
                              >
                                <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 14, color: isSettled ? 'var(--muted)' : 'var(--active)' }}>{isSettled ? '💰' : '✅'}</div>
                                <div style={{ fontSize: 26, marginBottom: 4 }}>{UI[t] || '👕'}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{UL[t] || t}</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--active)', marginBottom: 3 }}>{g.totalQty}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>{fmt(g.totalValue)} ج</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {Object.entries(condCount).map(([c, qty]) => (
                                    <div key={c} style={{ fontSize: 10, color: 'var(--muted)', background: 'rgba(0,0,0,.04)', borderRadius: 4, padding: '1px 4px' }}>
                                      {condLabels[c] || c}: {qty}
                                    </div>
                                  ))}
                                </div>
                                {companies.size > 0 && (
                                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>🏢 {Array.from(companies).join('، ')}</div>
                                )}
                                {hasMultiPrices && !isSettled && <div style={{ fontSize: 9, color: 'var(--primary)', marginTop: 2 }}>أسعار متعددة ▾</div>}
                              </div>
                              {!isSettled && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    const firstPrice = prices.size > 0 ? Array.from(prices)[0] : 0;
                                    setCardReturnModal({ type: t, label: UL[t] || t, icon: UI[t] || '👕', grouped: g, pilotId: pilotDetail.pilot.id, cardKey, maxQty: g.totalQty, defaultPrice: firstPrice, prices: Array.from(prices) });
                                    setCardReturnQty(g.totalQty);
                                    setCardReturnPrice(firstPrice);
                                    setCardReturnErr('');
                                  }}
                                  style={{
                                    marginTop: 8, width: '100%', fontSize: 11, fontWeight: 700,
                                    padding: '5px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: isReturnDone ? 'var(--active)' : 'var(--danger)',
                                    color: '#fff', transition: 'all .2s'
                                  }}
                                >
                                  {isReturnDone ? '↩️ مرتجع لمخزن المشرف' : '🔄 مرتجع'}
                                </button>
                              )}
                              {isSettled && (
                                <div style={{
                                  position: 'absolute', top: '38%', left: '-18%', width: '136%',
                                  transform: 'rotate(-32deg)', textAlign: 'center',
                                  fontSize: 16, fontWeight: 900, color: '#16A34A',
                                  letterSpacing: 0.5, zIndex: 5, pointerEvents: 'none',
                                  opacity: 1, textShadow: '0 1px 0 rgba(255,255,255,.7)'
                                }}>
                                  تم التسديد
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="tabs">
                  {['advances','deductions','bonuses','uniforms'].map(tab => (
                    <button
                      key={tab}
                      className={`tab ${(itemsTab[pilotDetail.pilot?.id] || 'advances') === tab ? 'active' : ''}`}
                      onClick={() => setItemsTab(p => ({ ...p, [pilotDetail.pilot.id]: tab }))}
                    >
                      {tab === 'advances' ? 'السلف' : tab === 'deductions' ? 'الخصومات' : tab === 'bonuses' ? 'المكافآت' : 'المعدات'}
                    </button>
                  ))}
                </div>

                {(() => {
                  const activeTab = itemsTab[pilotDetail.pilot?.id] || 'advances';
                  const rawItems = activeTab === 'uniforms'
                    ? (pilotDetail.uniforms || [])
                    : (pilotDetail[activeTab] || []);
                  const filteredItems = rawItems.filter((item: any) => {
                    const matchSearch = !itemsSearch || (item.reason || '').includes(itemsSearch) || String(item.amount || '').includes(itemsSearch) || (item.type || '').includes(itemsSearch);
                    if (activeTab === 'uniforms') return matchSearch;
                    return matchSearch && !item.settled;
                  });
                  return (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', flex: 1, minWidth: 120 }}>
                          <span style={{ color: 'var(--muted)', fontSize: 14 }}>🔍</span>
                          <input style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text)' }} placeholder="بحث..." value={itemsSearch} onChange={e => setItemsSearch(e.target.value)} autoComplete="off" />
                        </div>
                      </div>
                      {!filteredItems.length
                        ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>لا توجد بيانات</div>
                        : (
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {filteredItems.map((item: any) => {
                              const isUniSettled = activeTab === 'uniforms' && item.settled;
                              return (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, background: isUniSettled ? 'var(--bg2)' : (item.deleted ? 'transparent' : '#f8f8f8'), borderRadius: 6, marginBottom: 4, position: 'relative' }}>
                                <div style={{ opacity: isUniSettled ? 0.5 : 1 }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    {activeTab === 'uniforms' ? `${UI[item.type] || '👕'} ${UL[item.type] || item.type} × ${item.qty}` : fmt(item.amount) + ' ج'}
                                  </span>
                                  <div style={{ color: 'var(--muted)', marginTop: 3, fontSize: 12 }}>{item.reason || item.type || '-'} · {fmtDate(item.date)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isUniSettled ? 0.5 : 1 }}>
                                  {!isUniSettled && (
                                    <span className={item.deleted ? 'badge badge-gray' : 'badge badge-orange'}>
                                      {item.deleted ? 'محذوف' : 'لم يتم التقفيل'}
                                    </span>
                                  )}
                                  {!item.deleted && activeTab !== 'uniforms' && (
                                    <button
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--danger)', padding: '2px 4px', opacity: item.added_by_role === 'admin' ? 0.4 : 1 }}
                                      title={item.added_by_role === 'admin' ? 'أضافه الأدمن - لا يمكن الحذف' : 'حذف'}
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (activeTab === 'advances') doDeleteAdvance(item.id, item.added_by_role || '');
                                        else if (activeTab === 'deductions') doDeleteDeduction(item.id, item.added_by_role || '');
                                        else if (activeTab === 'bonuses') doDeleteBonus(item.id, item.added_by_role || '');
                                      }}
                                    >🗑️</button>
                                  )}
                                </div>
                                {isUniSettled && (
                                  <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%,-50%) rotate(-18deg)',
                                    fontSize: 17, fontWeight: 900, color: '#16A34A',
                                    letterSpacing: 0.5, zIndex: 5, pointerEvents: 'none',
                                    whiteSpace: 'nowrap', textShadow: '0 1px 0 rgba(255,255,255,.7)'
                                  }}>
                                    تم التسديد
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        )
                      }
                    </>
                  );
                })()}

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>إغلاق</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* تفاصيل معدات الطيار */}
      {/* مرتجع من كارت المعدة */}
      {cardReturnModal && (
        <div className="overlay" style={{ zIndex: 10002 }} onClick={e => e.target === e.currentTarget && setCardReturnModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-icon">{cardReturnModal.icon}</div>
              <div>
                <div className="modal-title">مرتجع: {cardReturnModal.label}</div>
                <div className="modal-subtitle" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  ✈️ {pilotDetail?.pilot?.name}
                </div>
              </div>
            </div>
            {cardReturnErr && <div className="alert alert-error">⚠️ {cardReturnErr}</div>}
            <div className="form-group">
              <label className="form-label">السعر (ج) *</label>
              {cardReturnModal.prices.length > 1 ? (
                <select className="form-select" value={cardReturnPrice} onChange={e => setCardReturnPrice(Number(e.target.value))}>
                  {cardReturnModal.prices.map((p: number) => (
                    <option key={p} value={p}>{fmt(p)} ج</option>
                  ))}
                </select>
              ) : (
                <div className="form-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  {fmt(cardReturnModal.defaultPrice)} ج
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">الكمية المرجعة *</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={cardReturnModal.maxQty}
                value={cardReturnQty === 0 ? '' : cardReturnQty}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') { setCardReturnQty(0); return; } // اسمح بالحقل الفاضي مؤقتًا أثناء الكتابة
                  let v = Number(raw);
                  if (isNaN(v)) return;
                  if (v < 0) v = 0;
                  if (v > cardReturnModal.maxQty) v = cardReturnModal.maxQty;
                  setCardReturnQty(v);
                }}
                onBlur={() => {
                  if (!cardReturnQty || cardReturnQty < 1) setCardReturnQty(cardReturnModal.maxQty);
                }} autoComplete="off" />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>الحد الأقصى: {cardReturnModal.maxQty}</div>
            </div>
            {cardReturnQty > 0 && cardReturnPrice >= 0 && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--danger-bg, #FEF2F2)', borderRadius: 10, border: '1px solid var(--danger-border, #FECACA)' }}>
                <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
                  📋 ملخص: {cardReturnModal.label} × {cardReturnQty} — قيمة {fmt(cardReturnPrice * cardReturnQty)} ج
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }}
                disabled={cardReturnLoading || cardReturnQty <= 0}
                onClick={doCardReturn}
              >
                {cardReturnLoading ? '...' : '↩️ مرتجع لمخزن المشرف'}
              </button>
              <button className="btn btn-secondary" onClick={() => setCardReturnModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {uniformDetailModal && (
        <div className="overlay" style={{ zIndex: 10001 }} onClick={e => e.target === e.currentTarget && setUniformDetailModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">{uniformDetailModal.icon}</div>
              <div>
                <div className="modal-title">{uniformDetailModal.label}</div>
                <div className="modal-subtitle">إجمالي الكمية: {uniformDetailModal.grouped.totalQty} · القيمة: {fmt(uniformDetailModal.grouped.totalValue)} ج</div>
              </div>
            </div>
            {/* تفاصيل حسب السعر */}
            {(() => {
              const entries: any[] = uniformDetailModal.grouped.entries || [];
              const byPrice: Record<string, { qty: number; conditions: Record<string, number>; company: string; price: number; settled: boolean }> = {};
              entries.forEach((e: any) => {
                const pr = Number(e.price) || 0;
                const settled = !!e.settled;
                const key = `${pr}_${settled ? 's' : 'u'}`;
                if (!byPrice[key]) byPrice[key] = { qty: 0, conditions: {}, company: e.company_name || '', price: pr, settled };
                byPrice[key].qty += Number(e.qty) || 0;
                const cond = e.condition || 'new';
                byPrice[key].conditions[cond] = (byPrice[key].conditions[cond] || 0) + (Number(e.qty) || 0);
                if (e.company_name && !byPrice[key].company) byPrice[key].company = e.company_name;
              });
              const priceKeys = Object.keys(byPrice).sort((a, b) => byPrice[b].price - byPrice[a].price);
              const condLabels: Record<string, string> = { new: 'جديد', good: 'جيد', damaged: 'تالف' };
              const condColors: Record<string, string> = { new: '#10B981', good: '#2563EB', damaged: '#EF4444' };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {priceKeys.map(key => {
                    const d = byPrice[key];
                    const price = d.price;
                    return (
                      <div key={key} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, border: '1.5px solid var(--border)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>{price > 0 ? fmt(price) + ' ج / قطعة' : 'بدون سعر'}</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>الكمية: {d.qty}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          {Object.entries(d.conditions).map(([c, qty]) => (
                            <div key={c} style={{ fontSize: 11, fontWeight: 700, background: condColors[c] + '18', color: condColors[c], border: `1px solid ${condColors[c]}44`, borderRadius: 6, padding: '2px 8px' }}>
                              {condLabels[c] || c}: {qty}
                            </div>
                          ))}
                          {d.settled && (
                            <div style={{ fontSize: 11, fontWeight: 800, background: '#16A34A18', color: '#16A34A', border: '1px solid #16A34A44', borderRadius: 6, padding: '2px 8px' }}>
                              ✅ تم التسديد
                            </div>
                          )}
                        </div>
                        {d.company && <div style={{ fontSize: 11, color: 'var(--muted)' }}>🏢 {d.company}</div>}
                        {price > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginTop: 4 }}>القيمة الإجمالية: {fmt(price * d.qty)} ج</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setUniformDetailModal(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* تفاصيل المعدة */}
      {invDetailModal && (
        <div className="overlay" style={{ zIndex: 10000 }} onClick={e => e.target === e.currentTarget && setInvDetailModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>
                {renderIcon(invDetailModal.icon, 36)}
              </span>
              {invDetailModal.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 14 }}>
              المتبقي: <strong style={{ color: invDetailModal.remaining < 0 ? 'var(--danger)' : invDetailModal.remaining === 0 ? 'var(--warning)' : 'var(--success)' }}>{invDetailModal.remaining}</strong>
              {' · '}إجمالي القيمة: <strong style={{ color: 'var(--accent)' }}>{fmt(invDetailModal.totalValue)} ج</strong>
            </div>

            {invDetailModal.mismatchWarning && (
              <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                {invDetailModal.mismatchWarning}
              </div>
            )}

            {invDetailModal.priceBatches.length === 0 || invDetailModal.priceBatches.every(p => p.remaining === 0) ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>لا توجد دفعات مسجلة لهذا النوع</div>
            ) : (
              <>
                <table className="modal-table" style={{ width: '100%', marginBottom: 16 }}>
                  <thead>
                    <tr>
                      <th>العدد المتاح</th>
                      <th>سعر الواحدة</th>
                      <th>الحالة</th>
                      <th>إجمالي القيمة</th>
                      <th>لم يسدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invDetailModal.priceBatches.map((p, i) => {
                      const lineVal = (Number(p.remaining) || 0) * (Number(p.price) || 0);
                      const cond = p.condition || 'new';
                      const condLabel = cond === 'good' ? 'جيدة' : cond === 'damaged' ? 'تالف' : 'جديد';
                      const condBg    = cond === 'good' ? '#dbeafe' : cond === 'damaged' ? '#fee2e2' : '#dcfce7';
                      const condColor = cond === 'good' ? '#2563eb' : cond === 'damaged' ? '#dc2626' : '#16a34a';
                      const unpaidType = invDetailModal.type ? (unpaidInventory?.[invDetailModal.type] || { byPrice: [] }) : { byPrice: [] };
                      const unpaidForPrice = (unpaidType.byPrice || []).find((bp: any) => Number(bp.price) === Number(p.price));
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, fontSize: 16 }}>{(Number(p.remaining) || 0).toLocaleString('en-US')}</td>
                          <td style={{ direction: 'ltr', fontWeight: 600 }}>{(Number(p.price) || 0).toLocaleString('en-US')} ج</td>
                          <td><span style={{ fontSize: 12, fontWeight: 700, background: condBg, color: condColor, borderRadius: 6, padding: '2px 8px' }}>{condLabel}</span></td>
                          <td style={{ direction: 'ltr', fontWeight: 700, color: 'var(--accent)' }}>{lineVal.toLocaleString('en-US')} ج</td>
                          <td>
                            {unpaidForPrice && unpaidForPrice.qty > 0 ? (
                              <span
                                onClick={() => setUnpaidPilotsModal({ label: invDetailModal.label, price: Number(p.price), pilots: unpaidForPrice.pilots || [] })}
                                style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', borderRadius: 6, padding: '2px 8px', textDecoration: 'underline' }}
                              >
                                {unpaidForPrice.qty} ({(unpaidForPrice.value || 0).toLocaleString('en-US')} ج)
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {invDetailModal.priceBatches.length > 1 && (
                  <div style={{ background: 'var(--accent-bg)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text2)' }}>الإجمالي الكلي</span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)', direction: 'ltr' }}>
                      {invDetailModal.priceBatches.reduce((s, p) => s + ((Number(p.remaining) || 0) * (Number(p.price) || 0)), 0).toLocaleString('en-US')} ج
                    </span>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {invDetailModal.type && (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { const t = invDetailModal.type as string; setInvDetailModal(null); openSupervisorReturnModal(t); }}>
                  📤 طلب مرتجع لمخزن المدير
                </button>
              )}
              <button className="btn-secondary" style={{ flex: invDetailModal.type ? undefined : 1, width: invDetailModal.type ? undefined : '100%' }} onClick={() => setInvDetailModal(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* الطيارين الغير مسددين لسعر معين */}
      {unpaidPilotsModal && (
        <div className="overlay" style={{ zIndex: 10001 }} onClick={e => e.target === e.currentTarget && setUnpaidPilotsModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-title">⚠️ طيارين لم يسددوا — {unpaidPilotsModal.label}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 14 }}>
              سعر الوحدة: <strong style={{ color: 'var(--accent)' }}>{unpaidPilotsModal.price.toLocaleString('en-US')} ج</strong>
            </div>
            {unpaidPilotsModal.pilots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>لا يوجد طيارين</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {unpaidPilotsModal.pilots.map((pl) => (
                  <div
                    key={pl.pilotId}
                    onClick={() => { setUnpaidPilotsModal(null); setInvDetailModal(null); closeModal(); openPilotDetail(pl.pilotId); }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, cursor: 'pointer', background: 'var(--bg2)' }}
                  >
                    <span style={{ fontWeight: 700 }}>👤 {pl.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', direction: 'ltr' }}>{pl.qty} · {(pl.value || 0).toLocaleString('en-US')} ج</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setUnpaidPilotsModal(null)}>إغلاق</button>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {deleteConfirm && (
        <div className="overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <div className="modal-icon">{deleteConfirm.icon || '🗑️'}</div>
              <div>
                <div className="modal-title">{deleteConfirm.title || 'تأكيد الحذف'}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20, textAlign: 'center' }}>
              {deleteConfirm.message}
            </div>
            <div className="modal-actions">
              <button className="btn-danger-outline" style={{ flex: 1, padding: '10px 16px' }} onClick={() => { const fn = deleteConfirm.onConfirm; setDeleteConfirm(null); fn(); }}>{deleteConfirm.confirmLabel || 'نعم، احذف'}</button>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* تأكيد التقفيل */}
      {closeConfirmData && (() => {
        const excl = new Set(closeConfirmData.excludeIds as string[]);
        const toggleExclude = (id: string) => {
          setCloseConfirmData((p: any) => ({
            ...p,
            excludeIds: p.excludeIds.includes(id) ? p.excludeIds.filter((x: string) => x !== id) : [...p.excludeIds, id],
          }));
        };
        const totalAdvances = closeConfirmData.advances.filter((a: any) => !excl.has(a.id)).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
        const totalDeductions = closeConfirmData.deductions.filter((d: any) => !excl.has(d.id)).reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0);
        const totalBonuses = closeConfirmData.bonuses.filter((b: any) => !excl.has(b.id)).reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
        const uniformCost = closeConfirmData.uniforms.filter((u: any) => !excl.has(u.id)).reduce((s: number, u: any) => s + (Number(u.qty) || 0) * (Number(u.price) || 0), 0);
        const netSalary = (closeConfirmData.baseSalary || 0) - totalAdvances - totalDeductions + totalBonuses - uniformCost;
        const itemRow = (item: any, label: string, amount: number) => {
          const excluded = excl.has(item.id);
          return (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, marginBottom: 4, background: excluded ? '#fff5f5' : 'var(--bg)', border: `1px solid ${excluded ? 'var(--danger)' : 'var(--border)'}`, fontSize: 12 }}>
              <span style={{ textDecoration: excluded ? 'line-through' : 'none', color: excluded ? 'var(--muted)' : 'var(--text)' }}>
                {fmt(amount)} ج - {label}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>📅 {fmtDate(item.date)}</div>
              </span>
              <button className={`btn btn-sm ${excluded ? 'btn-primary' : 'btn-danger-outline'}`} style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => toggleExclude(item.id)}>{excluded ? 'إعادة' : 'استثناء'}</button>
            </div>
          );
        };
        return (
          <div className="overlay" style={{ zIndex: 9999 }}>
            <div className="modal modal-lg">
              <div className="modal-header">
                <div className="modal-icon">🔒</div>
                <div>
                  <div className="modal-title">تقرير التقفيل</div>
                  <div className="modal-subtitle">👤 {closeConfirmData.pilotName}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                {[
                  { label: 'الراتب الأساسي', val: fmt(closeConfirmData.baseSalary) + ' ج' },
                  { label: 'إجمالي السلف المعلقة', val: fmt(totalAdvances) + ' ج' },
                  { label: 'الخصومات المعلقة', val: fmt(totalDeductions) + ' ج' },
                  { label: 'المكافآت المعلقة', val: fmt(totalBonuses) + ' ج' },
                  { label: 'المعدات', val: fmt(uniformCost) + ' ج' },
                  { label: 'صافي الراتب', val: fmt(netSalary) + ' ج' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 700 }}>{row.val}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>يمكنك استثناء أي بند قبل التقفيل فيبقى معلقاً ولا يدخل في هذا التقفيل.</div>
              {closeConfirmData.advances.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>السلف المعلقة ({closeConfirmData.advances.length})</div>
                  {closeConfirmData.advances.map((a: any) => itemRow(a, a.reason || '-', a.amount))}
                </div>
              )}
              {closeConfirmData.deductions.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>الخصومات المعلقة ({closeConfirmData.deductions.length})</div>
                  {closeConfirmData.deductions.map((d: any) => itemRow(d, d.reason || '-', d.amount))}
                </div>
              )}
              {closeConfirmData.bonuses.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>المكافآت المعلقة ({closeConfirmData.bonuses.length})</div>
                  {closeConfirmData.bonuses.map((b: any) => itemRow(b, b.reason || '-', b.amount))}
                </div>
              )}
              {closeConfirmData.uniforms.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>المعدات المعلقة ({closeConfirmData.uniforms.length})</div>
                  {closeConfirmData.uniforms.map((u: any) => itemRow(u, `${UL[u.type] || u.type} × ${u.qty}`, Number(u.qty) * Number(u.price)))}
                </div>
              )}
              <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 700, marginBottom: 16, padding: '10px', background: '#fff5f5', borderRadius: 8 }}>
                ⚠️ هل أنت متأكد من تقفيل حساب {closeConfirmData.pilotName}؟ سيتم تسوية جميع البنود المعلقة غير المستثناة.
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doCloseAccountsConfirm}>{modalLoading ? '...' : '✅ نعم، تأكيد التقفيل'}</button>
                <button className="btn btn-secondary" onClick={() => setCloseConfirmData(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* سجل التقفيلات */}
      {modal === 'settledHistory' && (
        <div className="overlay overlay-flush" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-icon">📋</div>
              <div>
                <div className="modal-title">سجل التقفيلات</div>
                <div className="modal-subtitle">👤 {pilotDetail?.pilot?.name}</div>
              </div>
            </div>
            {settledHistoryLoading ? (
              <div className="spinner" style={{ margin: '30px auto' }}></div>
            ) : settledHistory.length === 0 ? (
              <div className="empty">لا توجد تقفيلات سابقة</div>
            ) : settledHistory.map((session: any, idx: number) => {
              const typeLabel: Record<string,string> = { advance: 'سلفة', deduction: 'خصم', bonus: 'مكافأة', uniform: 'معدة' };
              const typeColor: Record<string,string> = { advance: 'var(--danger)', deduction: 'var(--danger)', bonus: 'var(--success)', uniform: 'var(--warning,#f59e0b)' };
              const typeSign: Record<string,string> = { advance: '-', deduction: '-', bonus: '+', uniform: '-' };
              return (
                <div key={idx} style={{ border: '1.5px solid var(--border2)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ background: 'var(--accent-bg,#f0faf5)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>📅 {fmtDate(session.date)}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: session.total >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {session.total >= 0 ? '+' : ''}{fmt(session.total)} ج
                      </span>
                      {idx === 0 && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8 }}
                          onClick={() => doUndoSettlement(session)}
                        >↩️ تراجع عن التقفيل</button>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '8px 14px' }}>
                    {session.items.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', borderBottom: i < session.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                        <span style={{ color: 'var(--muted)' }}>
                          {typeLabel[item.type] || item.type} {item.details ? `· ${item.details}` : ''}
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>📅 {fmtDate(item.item_date || item.date)}</div>
                        </span>
                        <span style={{ fontWeight: 700, color: typeColor[item.type] || 'var(--text)' }}>{typeSign[item.type]}{fmt(item.amount)} ج</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={goBack}>إغلاق</button>
          </div>
        </div>
      )}

      {/* إضافة طيار */}
      {modal === 'addPilot' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">✈️</div>
              <div>
                <div className="modal-title">إضافة طيار جديد</div>
                <div className="modal-subtitle">أدخل بيانات الطيار</div>
              </div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group">
              <label className="form-label">الاسم الكامل *</label>
              <input className="form-input" placeholder="أدخل اسم الطيار" value={modalData.name || ''} onChange={e => setModalData((p: any) => ({ ...p, name: e.target.value }))} autoComplete="off" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">رقم الهاتف *</label>
                <input className="form-input" placeholder="01XXXXXXXXX" value={modalData.phone || ''} onChange={e => setModalData((p: any) => ({ ...p, phone: e.target.value }))} autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الواتساب *</label>
                <input className="form-input" placeholder="01XXXXXXXXX" value={modalData.whatsapp || ''} onChange={e => setModalData((p: any) => ({ ...p, whatsapp: e.target.value }))} autoComplete="off" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الراتب الأساسي *</label>
                <input className="form-input" type="number" placeholder="0" value={modalData.baseSalary || ''} onChange={e => setModalData((p: any) => ({ ...p, baseSalary: e.target.value }))} autoComplete="off" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">المنطقة *</label>
              <select className="form-select" value={modalData.region || ''} onChange={e => setModalData((p: any) => ({ ...p, region: e.target.value }))}>
                <option value="">اختر المنطقة</option>
                {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الشركة *</label>
              <select className="form-select" value={modalData.companyId || ''} onChange={e => setModalData((p: any) => ({ ...p, companyId: e.target.value }))}>
                <option value="">اختر الشركة</option>
                {allCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doAddPilot}>{modalLoading ? '...' : 'إضافة الطيار'}</button>
              <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* تعديل بيانات طيار */}
      {modal === 'editPilot' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">✏️</div>
              <div>
                <div className="modal-title">تعديل بيانات الطيار</div>
                <div className="modal-subtitle">تحديث بيانات الطيار</div>
              </div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group">
              <label className="form-label">الاسم الكامل *</label>
              <input className="form-input" placeholder="أدخل اسم الطيار" value={modalData.name || ''} onChange={e => setModalData((p: any) => ({ ...p, name: e.target.value }))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">رقم الهاتف *</label>
              <input className="form-input" placeholder="01XXXXXXXXX" value={modalData.phone || ''} onChange={e => setModalData((p: any) => ({ ...p, phone: e.target.value }))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">المنطقة *</label>
              <select className="form-select" value={modalData.region || ''} onChange={e => setModalData((p: any) => ({ ...p, region: e.target.value }))}>
                <option value="">اختر المنطقة</option>
                {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الشركة *</label>
              <select className="form-select" value={modalData.companyId || ''} onChange={e => setModalData((p: any) => ({ ...p, companyId: e.target.value }))}>
                <option value="">اختر الشركة</option>
                {allCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doUpdatePilot}>{modalLoading ? '...' : 'حفظ التعديلات'}</button>
              <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إضافة سلفة */}
      {modal === 'addAdvance' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">💵</div>
              <div><div className="modal-title">تسجيل سلفة</div></div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group"><label className="form-label">المبلغ *</label><input className="form-input" type="number" placeholder="0" value={modalData.amount || ''} onChange={e => setModalData((p: any) => ({ ...p, amount: e.target.value }))} autoComplete="off" /></div>
            <div className="form-group"><label className="form-label">السبب</label><input className="form-input" placeholder="سبب السلفة" value={modalData.reason || ''} onChange={e => setModalData((p: any) => ({ ...p, reason: e.target.value }))} autoComplete="off" /></div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doAddAdvance}>{modalLoading ? '...' : 'تسجيل'}</button>
              <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إضافة خصم */}
      {modal === 'addDeduction' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">✂️</div>
              <div><div className="modal-title">تسجيل خصم</div></div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group"><label className="form-label">المبلغ *</label><input className="form-input" type="number" placeholder="0" value={modalData.amount || ''} onChange={e => setModalData((p: any) => ({ ...p, amount: e.target.value }))} autoComplete="off" /></div>
            <div className="form-group"><label className="form-label">السبب</label><input className="form-input" placeholder="سبب الخصم" value={modalData.reason || ''} onChange={e => setModalData((p: any) => ({ ...p, reason: e.target.value }))} autoComplete="off" /></div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doAddDeduction}>{modalLoading ? '...' : 'تسجيل'}</button>
              <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إضافة مكافأة */}
      {modal === 'addBonus' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">🎁</div>
              <div><div className="modal-title">تسجيل مكافأة</div></div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group"><label className="form-label">المبلغ *</label><input className="form-input" type="number" placeholder="0" value={modalData.amount || ''} onChange={e => setModalData((p: any) => ({ ...p, amount: e.target.value }))} autoComplete="off" /></div>
            <div className="form-group"><label className="form-label">السبب</label><input className="form-input" placeholder="سبب المكافأة" value={modalData.reason || ''} onChange={e => setModalData((p: any) => ({ ...p, reason: e.target.value }))} autoComplete="off" /></div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doAddBonus}>{modalLoading ? '...' : 'تسجيل'}</button>
              <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* تسجيل معدة */}
      {modal === 'recordUniform' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">📦</div>
              <div><div className="modal-title">تسليم معدة للطيار</div><div className="modal-subtitle">✈️ {pilotDetail?.pilot?.name}</div></div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}

            {/* خطوة 1: اختيار الشركة */}
            {(() => {
              const availableCompanies = companyInventory.filter((c: any) =>
                TYPES.some(t => (c.inventory?.[t]?.priceBatches || []).some((b: any) => b.remaining > 0))
              );
              if (availableCompanies.length === 0) {
                return <div className="alert alert-error">⚠️ لا يوجد مخزون متاح في أي شركة</div>;
              }
              if (availableCompanies.length === 1 && !modalData.selectedCompanyId) {
                setTimeout(() => setModalData((p: any) => ({ ...p, selectedCompanyId: availableCompanies[0].companyId, type: '', priceBatchKey: '', selectedPrice: undefined, selectedCondition: undefined, priceOptionsCount: 0 })), 0);
              }
              return (
                <div className="form-group">
                  <label className="form-label">الشركة *</label>
                  {availableCompanies.length === 1 ? (
                    <div className="form-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>🏢 {availableCompanies[0].companyName}</div>
                  ) : (
                    <select className="form-select" value={modalData.selectedCompanyId || ''} onChange={e => {
                      setModalData((p: any) => ({ ...p, selectedCompanyId: e.target.value, type: '', priceBatchKey: '', selectedPrice: undefined, selectedCondition: undefined, priceOptionsCount: 0 }));
                    }}>
                      <option value="">اختر الشركة</option>
                      {availableCompanies.map((c: any) => (
                        <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })()}

            {/* خطوة 2: اختيار النوع بناءً على الشركة */}
            {modalData.selectedCompanyId && (() => {
              const companyEntry = companyInventory.find((c: any) => c.companyId === modalData.selectedCompanyId);
              const availableTypes = TYPES.filter(t => {
                const batches = (companyEntry?.inventory?.[t]?.priceBatches || []).filter((b: any) => b.remaining > 0);
                return batches.length > 0;
              });
              if (availableTypes.length === 0) {
                return <div className="alert alert-error">⚠️ لا يوجد مخزون متاح لهذه الشركة</div>;
              }
              return (
                <div className="form-group">
                  <label className="form-label">النوع *</label>
                  <select className="form-select" value={modalData.type || ''} onChange={e => {
                    setModalData((p: any) => ({ ...p, type: e.target.value, priceBatchKey: '', selectedPrice: undefined, selectedCondition: undefined, priceOptionsCount: 0 }));
                  }}>
                    <option value="">اختر النوع</option>
                    {availableTypes.map(t => {
                      const batches = (companyEntry?.inventory?.[t]?.priceBatches || []).filter((b: any) => b.remaining > 0);
                      const totalRemaining = batches.reduce((s: number, b: any) => s + (b.remaining || 0), 0);
                      return (
                        <option key={t} value={t}>{UI[t]} {UL[t]} · متاح {totalRemaining}</option>
                      );
                    })}
                  </select>
                </div>
              );
            })()}

            {/* خطوة 3: الكمية والسعر */}
            {modalData.selectedCompanyId && modalData.type && (() => {
              const companyEntry = companyInventory.find((c: any) => c.companyId === modalData.selectedCompanyId);
              const batches = (companyEntry?.inventory?.[modalData.type]?.priceBatches || []).filter((b: any) => b.remaining > 0);
              if (modalData.priceOptionsCount !== batches.length) {
                setTimeout(() => setModalData((p: any) => ({ ...p, priceOptionsCount: batches.length })), 0);
              }
              if (batches.length === 0) {
                return <div className="alert alert-error">⚠️ لا يوجد مخزون متاح لهذا النوع</div>;
              }
              const condLabel = (c: string) => c === 'new' ? 'جديد' : c === 'good' ? 'جيد' : c === 'damaged' ? 'تالف' : c;
              return (
                <>
                  <div className="form-group">
                    <label className="form-label">الكمية *</label>
                    <input className="form-input" type="number" placeholder="0" min={1} max={batches.reduce((s: number, b: any) => s + (Number(b.remaining) || 0), 0)} value={modalData.qty || ''} onChange={e => setModalData((p: any) => ({ ...p, qty: e.target.value }))} autoComplete="off" />
                  </div>
                  {batches.length === 1 ? (() => {
                    const b = batches[0];
                    if (modalData.selectedPrice !== b.price || modalData.priceBatchKey !== `${b.price}_${b.condition}`) {
                      setTimeout(() => setModalData((p: any) => ({ ...p, selectedPrice: b.price, priceBatchKey: `${b.price}_${b.condition}`, selectedCondition: b.condition })), 0);
                    }
                    return (
                      <div className="form-group">
                        <label className="form-label">السعر</label>
                        <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(b.price)} ج</span>
                          <span style={{ fontSize: 12 }}>· {condLabel(b.condition)} · متاح {b.remaining}</span>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="form-group">
                      <label className="form-label">السعر *</label>
                      <select className="form-select" value={modalData.priceBatchKey || ''} onChange={e => {
                        const key = e.target.value;
                        const b = batches.find((x: any) => `${x.price}_${x.condition}` === key);
                        setModalData((p: any) => ({ ...p, priceBatchKey: key, selectedPrice: b?.price, selectedCondition: b?.condition }));
                      }}>
                        <option value="">اختر السعر</option>
                        {batches.map((b: any) => (
                          <option key={`${b.price}_${b.condition}`} value={`${b.price}_${b.condition}`}>
                            {fmt(b.price)} ج · {condLabel(b.condition)} · متاح {b.remaining}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading || !modalData.selectedCompanyId || !modalData.type || !modalData.qty} onClick={doRecordUniform}>{modalLoading ? '...' : '✅ تسليم'}</button>
              <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* طلب مخزون */}
      {modal === 'requestInv' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">📤</div>
              <div>
                <div className="modal-title">طلب معدة من المخزن</div>
                <div className="modal-subtitle">سيتم إرسال الطلب للمدير</div>
              </div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            {modalData.companyLoading ? (
              <div className="form-group">
                <label className="form-label">الشركة</label>
                <div className="form-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>... جاري التحميل</div>
              </div>
            ) : (() => {
              const assignedCompanies = requestCompanies;
              if (assignedCompanies.length === 0) return null;
              if (assignedCompanies.length === 1) {
                return (
                  <div className="form-group">
                    <label className="form-label">الشركة</label>
                    <div className="form-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg, var(--card))', color: 'var(--text-secondary)' }}>🏢 {assignedCompanies[0].companyName}</div>
                  </div>
                );
              }
              return (
                <div className="form-group">
                  <label className="form-label">الشركة *</label>
                  <select className="form-select" value={modalData.companyId || ''} onChange={e => setModalData((p: any) => ({ ...p, companyId: e.target.value }))}>
                    <option value="">اختر الشركة</option>
                    {assignedCompanies.map((c: any) => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
                  </select>
                </div>
              );
            })()}
            <div className="form-group">
              <label className="form-label">النوع *</label>
              <select className="form-select" value={modalData.type || ''} onChange={e => setModalData((p: any) => ({ ...p, type: e.target.value }))}>
                <option value="">اختر النوع</option>
                {TYPES.map(t => <option key={t} value={t}>{UI[t]} {UL[t]}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">الكمية *</label><input className="form-input" type="number" placeholder="0" value={modalData.qty || ''} onChange={e => setModalData((p: any) => ({ ...p, qty: e.target.value }))} autoComplete="off" /></div>
            <div className="form-group"><label className="form-label">ملاحظة</label><input className="form-input" placeholder="ملاحظات إضافية" value={modalData.note || ''} onChange={e => setModalData((p: any) => ({ ...p, note: e.target.value }))} autoComplete="off" /></div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading || modalData.companyLoading} onClick={doSendRequest}>{modalLoading ? '...' : 'إرسال الطلب'}</button>
              <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* طلب تمويل */}
      {modal === 'requestFunding' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">💰</div>
              <div>
                <div className="modal-title">طلب تمويل</div>
                <div className="modal-subtitle">سيتم إرسال الطلب للمدير</div>
              </div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group">
              <label className="form-label">المبلغ المطلوب (ج) *</label>
              <input className="form-input" type="number" placeholder="0" value={modalData.fundingAmount || ''} onChange={e => setModalData((p: any) => ({ ...p, fundingAmount: e.target.value }))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظة</label>
              <input className="form-input" placeholder="سبب طلب التمويل" value={modalData.fundingNote || ''} onChange={e => setModalData((p: any) => ({ ...p, fundingNote: e.target.value }))} autoComplete="off" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doSendFundingRequest}>{modalLoading ? '...' : 'إرسال الطلب'}</button>
              <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* سجل الطلبات */}
      {modal === 'requestsLog' && (() => {
        const statusColor: Record<string,string> = { pending: '#F59E0B', approved: '#10B981', rejected: '#EF4444' };
        const statusLabel: Record<string,string> = { pending: 'قيد الانتظار', approved: 'مقبول', rejected: 'مرفوض' };
        const companyNameMap: Record<string, string> = {};
        companyInventory.forEach((c: any) => { if (c.companyId) companyNameMap[c.companyId] = c.companyName; });
        const filtered = requestsLog.filter((r: any) => {
          if (r.kind === 'return') {
            const items: any[] = r.items || [];
            const matchSearch = !requestsSearch
              || 'مرتجع'.includes(requestsSearch)
              || items.some((it: any) => (UL[it.type] || it.type || '').toLowerCase().includes(requestsSearch.toLowerCase()) || (it.company_name || '').toLowerCase().includes(requestsSearch.toLowerCase()));
            const matchStatus = !requestsStatusFilter || r.status === requestsStatusFilter;
            const matchType = !requestsTypeFilter || items.some((it: any) => it.type === requestsTypeFilter);
            return matchSearch && matchStatus && matchType;
          }
          const matchSearch = !requestsSearch || (r.note || '').toLowerCase().includes(requestsSearch.toLowerCase()) || (r.type || '').toLowerCase().includes(requestsSearch.toLowerCase());
          const matchStatus = !requestsStatusFilter || r.status === requestsStatusFilter;
          const matchType = !requestsTypeFilter || r.type === requestsTypeFilter;
          return matchSearch && matchStatus && matchType;
        });
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>
              {/* رأس */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 22 }}>📋</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>سجل الطلبات</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>طلبات المعدات والتمويل والمرتجعات المرسلة للمدير</div>
                </div>
              </div>
              {/* فلتر مضغوط */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  placeholder="🔍 بحث..."
                  value={requestsSearch}
                  onChange={e => setRequestsSearch(e.target.value)} autoComplete="off" />
                <select
                  style={{ fontSize: 12, padding: '5px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  value={requestsStatusFilter}
                  onChange={e => setRequestsStatusFilter(e.target.value)}
                >
                  <option value="">كل الحالات</option>
                  <option value="pending">⏳ انتظار</option>
                  <option value="approved">✅ مقبول</option>
                  <option value="rejected">❌ مرفوض</option>
                </select>
                <select
                  style={{ fontSize: 12, padding: '5px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  value={requestsTypeFilter}
                  onChange={e => setRequestsTypeFilter(e.target.value)}
                >
                  <option value="">كل الأنواع</option>
                  {TYPES.map(t => <option key={t} value={t}>{UI[t]} {UL[t]}</option>)}
                </select>
                {(requestsSearch || requestsStatusFilter || requestsTypeFilter) && (
                  <button onClick={() => { setRequestsSearch(''); setRequestsStatusFilter(''); setRequestsTypeFilter(''); }} style={{ fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕ مسح</button>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 'auto' }}>{filtered.length} طلب</span>
              </div>
              {/* القائمة */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {requestsLogLoading ? (
                  <div className="empty-state">جاري التحميل...</div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">لا توجد طلبات</div>
                ) : filtered.map((r: any, i: number) => r.kind === 'return' ? (
                  <div key={r.id || i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>↩️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>مرتجع للمدير</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {(r.items || []).map((it: any, idx: number) => (
                          <span key={idx} style={{ fontSize: 11, background: 'var(--input-bg, var(--card))', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-secondary)' }}>
                            {UI[it.type] || '📦'} {UL[it.type] || it.type} ×{it.qty}
                          </span>
                        ))}
                      </div>
                      {r.status === 'approved' && r.approved_by && (
                        <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>✅ قُبل بواسطة: {r.approved_by}</div>
                      )}
                      {r.status === 'rejected' && r.rejected_by && (
                        <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>❌ رُفض بواسطة: {r.rejected_by}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{r.date ? new Date(r.date).toLocaleString('ar-EG') : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}55`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {statusLabel[r.status] || r.status}
                      </div>
                      {r.status === 'pending' && (
                        <button
                          onClick={async () => {
                            if (!confirm('هل تريد إلغاء طلب المرتجع؟ سيتم فك تجميد المعدات.')) return;
                            const res = await api('cancelSupervisorReturn', { returnId: r.id });
                            if (res.success) { showToast('🗑️ تم إلغاء طلب المرتجع'); setRequestsLog((prev: any[]) => prev.filter(x => x.id !== r.id)); invalidateCache(['getSupervisorStats']); init(false); }
                            else showToast('❌ ' + (res.message || 'خطأ'));
                          }}
                          style={{ fontSize: 11, padding: '3px 9px', border: '1px solid #EF444455', borderRadius: 7, background: '#EF444411', color: '#EF4444', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >🗑️ إلغاء</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={r.id || i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{UI[r.type] || '📦'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{UL[r.type] || r.type} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>×{r.qty}</span></div>
                      {r.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {r.note}</div>}
                      {r.company_id && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>🏢 {r.company_name || companyNameMap[r.company_id] || 'شركة'}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{r.date ? new Date(r.date).toLocaleString('ar-EG') : ''}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ background: statusColor[r.status] + '22', color: statusColor[r.status], border: `1px solid ${statusColor[r.status]}55`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {statusLabel[r.status] || r.status}
                      </div>
                      {r.status === 'pending' && (
                        <button
                          onClick={async () => {
                            if (!confirm('هل تريد حذف هذا الطلب؟')) return;
                            const res = await api('deleteRequest', { requestId: r.id });
                            if (res.success) { showToast('🗑️ تم حذف الطلب'); setRequestsLog((prev: any[]) => prev.filter(x => x.id !== r.id)); }
                            else showToast('❌ ' + (res.message || 'خطأ'));
                          }}
                          style={{ fontSize: 11, padding: '3px 9px', border: '1px solid #EF444455', borderRadius: 7, background: '#EF444411', color: '#EF4444', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >🗑️ حذف</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* سجل التمويل */}
      {modal === 'fundingLog' && (() => {
        const filtered = fundingLog.filter((f: any) => {
          const isRequest = !!f.is_request;
          const matchSearch = !fundingSearch
            || (f.note || '').toLowerCase().includes(fundingSearch.toLowerCase())
            || (f.sent_by || '').toLowerCase().includes(fundingSearch.toLowerCase())
            || String(f.amount || '').includes(fundingSearch);
          const matchSource = !fundingSourceFilter || (fundingSourceFilter === 'request' ? isRequest : !isRequest);
          return matchSearch && matchSource;
        });
        const filteredTotal = filtered.reduce((s: number, f: any) => s + (Number(f.amount) || 0), 0);
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>
              {/* رأس */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 22 }}>💵</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>سجل التمويل</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>المبالغ التي دخلت من المدير (إرسال مباشر أو طلب موافَق عليه)</div>
                </div>
              </div>
              {/* فلتر + بحث في سطر واحد */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  placeholder="🔍 بحث بالمبلغ أو الملاحظة أو المرسل..."
                  value={fundingSearch}
                  onChange={e => setFundingSearch(e.target.value)} autoComplete="off" />
                <select
                  style={{ fontSize: 12, padding: '5px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  value={fundingSourceFilter}
                  onChange={e => setFundingSourceFilter(e.target.value)}
                >
                  <option value="">كل المصادر</option>
                  <option value="direct">📤 إرسال من المدير</option>
                  <option value="request">✅ طلب موافَق عليه</option>
                </select>
                {(fundingSearch || fundingSourceFilter) && (
                  <button onClick={() => { setFundingSearch(''); setFundingSourceFilter(''); }} style={{ fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕ مسح</button>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 'auto' }}>{filtered.length} عملية · {fmt(filteredTotal)} ج</span>
              </div>
              {/* القائمة */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fundingLogLoading ? (
                  <div className="empty-state">جاري التحميل...</div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">لا توجد عمليات تمويل</div>
                ) : filtered.map((f: any, i: number) => (
                  <div key={f.id || i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{f.is_request ? '✅' : '📤'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{f.is_request ? 'طلب تمويل موافَق عليه' : 'تمويل مُرسل من المدير'}</div>
                      {f.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {f.note}</div>}
                      {f.sent_by && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>👤 {f.sent_by}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{f.date ? new Date(f.date).toLocaleString('ar-EG') : ''}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#2563EB', whiteSpace: 'nowrap' }}>{fmt(f.amount)} ج</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* مخزن الشركات */}
      {modal === 'companyInventory' && (
        <div className="overlay overlay-tight" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg modal-company-inv" style={{ width: '98vw', maxWidth: '98vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>🏢 مخزن الشركات</div>
            {companyInventory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <div className="empty-title">لا توجد بيانات شركات بعد</div>
                <div className="empty-desc">لم يتم استلام مخزون مرتبط بشركة معينة حتى الآن</div>
              </div>
            ) : companyInventory.map((c: any) => (
              <div key={c.companyId || 'none'} className="company-box">
                <div className="company-box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏢 {c.companyName}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>إجمالي القيمة: {fmt(TYPES.reduce((s:number, t:string) => s + ((c.inventory?.[t]?.totalValue) || 0), 0))} ج</span>
                </div>
                <div className="inv-grid">
                  {TYPES.map(t => {
                    const d = c.inventory?.[t] || { remaining: 0, total: 0, distributed: 0, returned: 0, totalValue: 0, priceBatches: [], conditionBreakdown: { new: 0, good: 0, damaged: 0 }, frozenQty: 0 };
                    const cb = d.conditionBreakdown || { new: 0, good: 0, damaged: 0 };
                    const hasConditions = (cb.new || 0) + (cb.good || 0) + (cb.damaged || 0) > 0;
                    const frozen = d.frozenQty || 0;
                    const unpaid = unpaidInventory?.[t] || { qty: 0, value: 0, byPrice: [] };
                    const paidValue = (d.totalValue || 0) - (unpaid.value || 0);
                    const paidQty = (d.distributed || 0) - (unpaid.qty || 0);
                    return (
                      <div key={t} className="inv-item" onClick={() => setInvDetailModal({ type: t, label: UL[t], icon: UI[t], priceBatches: d.priceBatches || [], remaining: d.remaining || 0, totalValue: d.totalValue || 0, mismatchWarning: d.mismatchWarning || '' })}>
                        <div className="inv-icon">
                          {renderIcon(UI[t], 48)}
                        </div>
                        <div className="inv-label">{UL[t]}</div>
                        <div className="inv-qty" style={{ color: d.remaining < 0 ? 'var(--danger)' : d.remaining === 0 ? 'var(--warning)' : 'var(--success)' }}>{d.remaining ?? 0}</div>
                        {frozen > 0 && (
                          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#B45309', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                            🔒 مجمد: {frozen}
                          </div>
                        )}
                        {hasConditions && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {(cb.new || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '2px 7px' }}>جديد: {cb.new}</span>}
                            {(cb.good || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#2563eb', borderRadius: 6, padding: '2px 7px' }}>جيدة: {cb.good}</span>}
                            {(cb.damaged || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 7px' }}>تالف: {cb.damaged}</span>}
                          </div>
                        )}

                        <div style={{ marginTop: 8, width: '100%', background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '2px 0' }}>
                            <span>مستلم</span><span style={{ direction: 'ltr' }}>{d.total ?? 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text2)', padding: '2px 0' }}>
                            <span>موزع</span><span style={{ direction: 'ltr' }}>{d.distributed ?? 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--accent)', padding: '2px 0' }}>
                            <span>الإجمالي</span><span style={{ direction: 'ltr' }}>{(d.totalValue || 0).toLocaleString('en-US')} ج</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 6, width: '100%', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '6px 10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#16a34a', padding: '2px 0' }}>
                            <span>المسدد</span><span style={{ direction: 'ltr' }}>{paidQty} ({paidValue.toLocaleString('en-US')} ج)</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 6, width: '100%', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '6px 10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#DC2626', padding: '2px 0' }}>
                            <span>لم يسدد</span><span style={{ direction: 'ltr' }}>{unpaid.qty || 0} ({(unpaid.value || 0).toLocaleString('en-US')} ج)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* تحويل طيار */}
      {modal === 'transferPilot' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-icon">🔄</div>
              <div>
                <div className="modal-title">تحويل طيار</div>
                <div className="modal-subtitle">نقل طيار لمشرف آخر</div>
              </div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            <div className="form-group">
              <label className="form-label">الطيار</label>
              <select className="form-select" value={modalData.pilotId || ''} onChange={e => setModalData((p: any) => ({ ...p, pilotId: e.target.value }))}>
                <option value="">اختر الطيار</option>
                {pilots.map(p => <option key={p.id} value={p.id}>{p.name} · {p.pilot_code}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المشرف المستقبِل</label>
              <select className="form-select" value={modalData.targetSupId || ''} onChange={e => setModalData((p: any) => ({ ...p, targetSupId: e.target.value }))}>
                <option value="">اختر المشرف</option>
                {supervisors.filter(s => s.role === 'supervisor').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading} onClick={doTransferPilot}>{modalLoading ? '...' : 'إرسال طلب التحويل'}</button>
              <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* مركز الإشعارات الموحّد */}
      {modal === 'notifications' && (() => {
        const kindLabel: Record<string, string> = {
          inventory_send: '📦 إرسال مخزون',
          funding_send: '💰 تمويل مباشر',
          request_approved: '✅ طلب مقبول',
          pilot_transfer: '✈️ تحويل طيار',
        };
        const q = notifSearch.trim().toLowerCase();
        const filtered = notifications.filter((n: any) => {
          const matchKind = !notifKindFilter || n.kind === notifKindFilter;
          if (!matchKind) return false;
          if (!q) return true;
          const haystack = [
            n.kind === 'inventory_send' && (UL[n.type] || n.type),
            n.kind === 'inventory_send' && n.companyName,
            n.kind === 'inventory_send' && n.performedBy,
            n.kind === 'funding_send' && n.sentBy,
            n.kind === 'request_approved' && (n.requestType === 'funding' ? 'تمويل' : (UL[n.requestType] || n.requestType)),
            n.kind === 'request_approved' && n.companyName,
            n.kind === 'pilot_transfer' && n.pilotName,
            n.kind === 'pilot_transfer' && n.pilotRegion,
            n.note,
          ].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(q);
        });
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-lg" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 22 }}>🔔</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>الإشعارات</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>إرسال المدير وطلباتك المقبولة وتحويلات الطيارين</div>
                </div>
              </div>
              {/* فلتر وبحث */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  placeholder="🔍 بحث..."
                  value={notifSearch}
                  onChange={e => setNotifSearch(e.target.value)} autoComplete="off" />
                <select
                  style={{ fontSize: 12, padding: '5px 6px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--input-bg, var(--card))', color: 'var(--text)', outline: 'none' }}
                  value={notifKindFilter}
                  onChange={e => setNotifKindFilter(e.target.value)}
                >
                  <option value="">كل الإشعارات</option>
                  <option value="inventory_send">📦 إرسال مخزون</option>
                  <option value="funding_send">💰 تمويل مباشر</option>
                  <option value="request_approved">✅ طلبات مقبولة</option>
                  <option value="pilot_transfer">✈️ تحويل طيار</option>
                </select>
                {(notifSearch || notifKindFilter) && (
                  <button onClick={() => { setNotifSearch(''); setNotifKindFilter(''); }} style={{ fontSize: 11, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕ مسح</button>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 'auto' }}>{filtered.length} إشعار</span>
              </div>
              {/* القائمة */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifLoading ? (
                  <div className="empty-state">جاري التحميل...</div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">لا توجد إشعارات</div>
                ) : filtered.map((n: any) => {
                  if (n.kind === 'pilot_transfer') {
                    return (
                      <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontSize: 26 }}>✈️</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{kindLabel[n.kind]}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>الطيار: {n.pilotName || n.refId} {n.pilotRegion ? `· ${n.pilotRegion}` : ''}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{fmtDate(n.date)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn-success-outline" style={{ flex: 1 }} onClick={() => doRespondTransfer(n.notifId, true)}>✅ قبول</button>
                          <button className="btn-danger-outline" style={{ flex: 1 }} onClick={() => doRespondTransfer(n.notifId, false)}>❌ رفض</button>
                        </div>
                      </div>
                    );
                  }
                  const icon = n.kind === 'inventory_send' ? (UI[n.type] || '📦') : n.kind === 'funding_send' ? '💰' : '✅';
                  const title = n.kind === 'inventory_send'
                    ? `إرسال ${UL[n.type] || n.type} من المدير ×${fmt(n.qty)}`
                    : n.kind === 'funding_send'
                    ? `تمويل مباشر من المدير: ${fmt(n.amount)} ج.م`
                    : `تم قبول طلبك: ${n.requestType === 'funding' ? 'تمويل' : (UL[n.requestType] || n.requestType)}${n.requestType !== 'funding' ? ' ×' + fmt(n.qty) : ' ' + fmt(n.amount) + ' ج.م'}`;
                  return (
                    <div key={n.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 26 }}>{icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</div>
                        {n.companyName && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>🏢 {n.companyName}</div>}
                        {(n.performedBy || n.sentBy) && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>👤 {n.performedBy || n.sentBy}</div>}
                        {n.note && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {n.note}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{fmtDate(n.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-actions" style={{ marginTop: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* مرتجع معدة */}
      {modal === 'requestReturn' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && goBack()}>
          <div className="modal" style={{maxWidth:540}}>
            <div className="modal-header">
              <div className="modal-icon">📦</div>
              <div><div className="modal-title">طلب مرتجع معدات</div><div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{pilotDetail?.pilot?.name}</div></div>
            </div>
            {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
            {(() => {
              const pilotUniforms = (pilotDetail?.uniforms || []).filter((u: any) => !u.settled);
              if (pilotUniforms.length === 0) {
                return (
                  <>
                    <div style={{textAlign:'center',padding:'24px 0',color:'var(--muted)',fontSize:14}}>
                      <div style={{fontSize:40,marginBottom:10}}>📦</div>
                      لا يوجد معدات مستلمة لهذا الطيار
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-secondary" style={{flex:1}} onClick={goBack}>إغلاق</button>
                    </div>
                  </>
                );
              }
              const allIds = pilotUniforms.map((u: any) => u.id);
              const allSelected = allIds.every((id: string) => returnSelectedItems[id]);
              const selectedCount = allIds.filter((id: string) => returnSelectedItems[id]).length;
              return (
                <>
                  <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
                    <span style={{fontSize:13,color:'var(--muted)',flex:1}}>{selectedCount} من {pilotUniforms.length} معدة محددة</span>
                    <button style={{fontSize:12,padding:'4px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',cursor:'pointer',color:'var(--primary)',fontFamily:'var(--font)'}}
                      onClick={() => {
                        const next: Record<string,boolean> = {};
                        allIds.forEach((id: string) => { next[id] = !allSelected; });
                        setReturnSelectedItems(next);
                      }}>
                      {allSelected ? '☐ إلغاء الكل' : '☑ تحديد الكل'}
                    </button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:380,overflowY:'auto',paddingRight:2}}>
                    {pilotUniforms.map((u: any) => {
                      const isFrozen = u.frozen;
                      const isSelected = !!returnSelectedItems[u.id];
                      const maxQ = Number(u.qty);
                      const curQ = returnItemQty[u.id] ?? maxQ;
                      const condLabel = u.condition === 'new' ? 'جديد' : u.condition === 'good' ? 'جيد' : u.condition === 'damaged' ? 'تالف' : u.condition || '';
                      const condColor = u.condition === 'new' ? 'var(--active)' : u.condition === 'damaged' ? 'var(--danger)' : 'var(--pending)';
                      return (
                        <div key={u.id} style={{border: isFrozen ? '1.5px solid var(--pending-border)' : isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',borderRadius:14,padding:'12px 14px',background: isFrozen ? 'var(--pending-bg)' : isSelected ? 'var(--primary-light)' : 'var(--surface)',opacity: isFrozen ? 0.7 : 1,position:'relative'}}>
                          {isFrozen && <span style={{position:'absolute',top:8,left:8,fontSize:11,background:'var(--pending)',color:'#fff',borderRadius:6,padding:'2px 8px',fontWeight:700}}>🔒 مجمدة</span>}
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            {!isFrozen && (
                              <input type="checkbox" checked={isSelected} onChange={e => setReturnSelectedItems(p => ({...p,[u.id]:e.target.checked}))}
                                style={{width:18,height:18,cursor:'pointer',accentColor:'var(--primary)',flexShrink:0}} autoComplete="off" />
                            )}
                            <div style={{fontSize:22,flexShrink:0}}>{UI[u.type] || '📦'}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{UL[u.type] || u.type}</div>
                              <div style={{fontSize:12,color:'var(--muted)',marginTop:2,display:'flex',flexWrap:'wrap',gap:'4px 12px'}}>
                                <span>الكمية: <b style={{color:'var(--text)'}}>{maxQ}</b></span>
                                {Number(u.price) > 0 && <span>السعر: <b style={{color:'var(--text)'}}>{fmt(u.price)} ج</b></span>}
                                <span style={{color:condColor,fontWeight:600}}>{condLabel}</span>
                                {u.company_name && <span>🏢 {u.company_name}</span>}
                              </div>
                              {u.date && <div style={{fontSize:11,color:'var(--muted2)',marginTop:2}}>📅 {fmtDate(u.date)}</div>}
                            </div>
                          </div>
                          {isSelected && !isFrozen && (
                            <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                              <label style={{fontSize:13,color:'var(--muted)',whiteSpace:'nowrap'}}>الكمية المرجعة:</label>
                              <input type="number" min={1} max={maxQ} value={curQ}
                                onChange={e => {
                                  let v = Number(e.target.value);
                                  if (v < 1) v = 1;
                                  if (v > maxQ) v = maxQ;
                                  setReturnItemQty(p => ({...p,[u.id]:v}));
                                }}
                                style={{width:80,padding:'4px 10px',border:'1.5px solid var(--primary)',borderRadius:8,fontSize:14,fontFamily:'var(--font)',textAlign:'center'}} autoComplete="off" />
                              <span style={{fontSize:12,color:'var(--muted)'}}>من {maxQ}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedCount > 0 && (
                    <div style={{marginTop:12,padding:'10px 14px',background:'var(--primary-light)',borderRadius:10,border:'1px solid var(--primary-border)'}}>
                      <div style={{fontSize:13,color:'var(--primary)',fontWeight:600}}>
                        📋 ملخص الطلب: {selectedCount} نوع —{' '}
                        {pilotUniforms.filter((u: any) => returnSelectedItems[u.id]).map((u: any) => {
                          const q = returnItemQty[u.id] ?? Number(u.qty);
                          return `${UI[u.type]||''} ${UL[u.type]||u.type} (${q})`;
                        }).join('  •  ')}
                      </div>
                    </div>
                  )}
                  <div className="modal-actions" style={{marginTop:14}}>
                    <button className="btn btn-primary" style={{flex:1}} disabled={modalLoading || selectedCount === 0} onClick={doRequestReturn}>
                      {modalLoading ? '...' : `📤 إرسال الطلب (${selectedCount})`}
                    </button>
                    <button className="btn btn-secondary" onClick={goBack}>إلغاء</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}





      {/* سجل مرتجعات المشرف */}
      {modal === 'returnsLog' && (() => {
        const statusLabel = (s: string) => s === 'pending' ? 'قيد الانتظار' : s === 'approved' ? 'مقبول' : s === 'rejected' ? 'مرفوض' : s;
        const statusColor = (s: string) => s === 'pending' ? 'var(--pending)' : s === 'approved' ? 'var(--active)' : 'var(--danger)';
        const statusBg = (s: string) => s === 'pending' ? 'var(--pending-bg)' : s === 'approved' ? 'var(--active-bg)' : 'var(--danger-bg)';
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-wide">
              <div className="modal-header">
                <div className="modal-icon">🔄</div>
                <div><div className="modal-title">سجل المرتجعات</div></div>
              </div>
              {returnsLogLoading ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>جاري التحميل...</div>
              ) : returnsLog.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>
                  <div style={{fontSize:36,marginBottom:8}}>🔄</div>
                  لا توجد طلبات مرتجعات
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:500,overflowY:'auto'}}>
                  {returnsLog.map((r: any) => {
                    const items: any[] = Array.isArray(r.items) ? r.items : [];
                    return (
                      <div key={r.id} style={{border:'1.5px solid var(--border)',borderRadius:14,padding:'12px 14px',background:'var(--surface)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <div style={{fontSize:13,color:'var(--muted)'}}>📅 {fmtDate(r.date)}</div>
                          <span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:8,background:statusBg(r.status),color:statusColor(r.status)}}>
                            {statusLabel(r.status)}
                          </span>
                        </div>
                        <div style={{fontSize:13,color:'var(--muted)',marginBottom:6}}>✈️ الطيار: <b style={{color:'var(--text)'}}>{r.pilot_name || r.pilot_id}</b></div>
                        {items.length > 0 ? (
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            {items.map((item: any, idx: number) => (
                              <div key={idx} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 10px',background:'var(--bg)',borderRadius:8,fontSize:13}}>
                                <span style={{fontSize:18}}>{UI[item.type]||'📦'}</span>
                                <span style={{fontWeight:600,color:'var(--text)'}}>{UL[item.type]||item.type}</span>
                                <span style={{color:'var(--muted)'}}>× {item.qty}</span>
                                {item.price > 0 && <span style={{color:'var(--muted)'}}>— {fmt(item.price)} ج</span>}
                                {item.condition && <span style={{fontSize:11,padding:'2px 6px',borderRadius:5,background:'var(--border)',color:'var(--text2)'}}>{item.condition==='new'?'جديد':item.condition==='good'?'جيد':'تالف'}</span>}
                                {item.company_name && <span style={{fontSize:11,color:'var(--muted)'}}>🏢 {item.company_name}</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{fontSize:13,color:'var(--muted)'}}>النوع: {UL[r.type]||r.type} × {r.qty}</div>
                        )}
                        {r.status === 'approved' && r.approved_by && (
                          <div style={{fontSize:12,color:'var(--active)',marginTop:6}}>✅ قُبل بواسطة: {r.approved_by} — {fmtDate(r.approved_at)}</div>
                        )}
                        {r.status === 'rejected' && r.rejected_by && (
                          <div style={{fontSize:12,color:'var(--danger)',marginTop:6}}>❌ رُفض بواسطة: {r.rejected_by} — {fmtDate(r.rejected_at)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="modal-actions" style={{marginTop:14}}>
                <button className="btn btn-secondary" style={{flex:1}} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* مودال: إرجاع معدة من المشرف إلى المدير */}
      {modal === 'supervisorReturn' && (() => {
        const { type, priceBatches, remaining, label, icon } = modalData;
        const condLabel = (c: string) => c === 'new' ? 'جديد' : c === 'good' ? 'جيد' : c === 'damaged' ? 'تالف' : c;
        const condColor = (c: string) => c === 'new' ? '#16a34a' : c === 'damaged' ? '#dc2626' : '#2563eb';
        const totalQtySelected = Object.values(supReturnItems).reduce((s, v) => s + (v.qty || 0), 0);
        const availableTotal = (remaining || 0) - (totalInventory?.[type]?.frozenQty || 0);
        return (
          <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <div className="modal-icon">{icon || '📦'}</div>
                <div>
                  <div className="modal-title">إرجاع {label} إلى المدير</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>المتاح: {availableTotal} · المجمد: {totalInventory?.[type]?.frozenQty || 0}</div>
                </div>
              </div>
              {modalErr && <div className="alert alert-error">⚠️ {modalErr}</div>}
              {availableTotal <= 0 ? (
                <>
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 14 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
                    لا يوجد مخزون متاح لهذه المعدة
                    {(totalInventory?.[type]?.frozenQty || 0) > 0 && (
                      <div style={{ marginTop: 8, fontSize: 13, color: '#B45309' }}>🔒 يوجد {totalInventory?.[type]?.frozenQty} مجمد في طلبات معلقة</div>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>إغلاق</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 2 }}>
                    {priceBatches && priceBatches.length > 0 ? (
                      priceBatches.map((b: any, idx: number) => {
                        const key = `batch_${idx}`;
                        const item = supReturnItems[key] || { qty: 0, price: b.price, condition: b.condition, company_id: b.company_id || '', company_name: b.company_name || '' };
                        const batchAvail = b.remaining || 0;
                        return (
                          <div key={key} style={{ border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px 14px', background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <div style={{ fontSize: 22 }}>{icon || '📦'}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                                  {b.price > 0 && <span>السعر: <b style={{ color: 'var(--text)' }}>{fmt(b.price)} ج</b></span>}
                                  <span style={{ color: condColor(b.condition), fontWeight: 600 }}>{condLabel(b.condition)}</span>
                                  <span>المتاح: <b style={{ color: batchAvail > 0 ? 'var(--active)' : 'var(--danger)' }}>{batchAvail}</b></span>
                                  {b.company_name && <span>🏢 {b.company_name}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>الكمية المرجعة:</label>
                              <input
                                type="number" min={0} max={batchAvail}
                                value={item.qty}
                                onChange={e => {
                                  let v = Number(e.target.value);
                                  if (v < 0) v = 0;
                                  if (v > batchAvail) v = batchAvail;
                                  setSupReturnItems(prev => ({ ...prev, [key]: { ...item, qty: v } }));
                                }}
                                style={{ width: 90, padding: '6px 10px', border: '1.5px solid var(--primary)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font)', textAlign: 'center' }} autoComplete="off" />
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>من {batchAvail}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // لا توجد دفعات — إدخال بسيط
                      <div style={{ border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ fontSize: 22 }}>{icon || '📦'}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>المتاح: <b>{availableTotal}</b></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>الكمية المرجعة:</label>
                          <input
                            type="number" min={0} max={availableTotal}
                            value={supReturnItems['batch_0']?.qty || 0}
                            onChange={e => {
                              let v = Number(e.target.value);
                              if (v < 0) v = 0;
                              if (v > availableTotal) v = availableTotal;
                              setSupReturnItems(prev => ({ ...prev, batch_0: { ...prev['batch_0'], qty: v } }));
                            }}
                            style={{ width: 90, padding: '6px 10px', border: '1.5px solid var(--primary)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font)', textAlign: 'center' }} autoComplete="off" />
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>من {availableTotal}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {totalQtySelected > 0 && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 10, border: '1px solid var(--primary-border)' }}>
                      <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                        📋 إجمالي الكمية المرجعة: <b>{totalQtySelected}</b> قطعة من {label}
                      </div>
                    </div>
                  )}
                  <div className="modal-actions" style={{ marginTop: 14 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={modalLoading || totalQtySelected === 0} onClick={doSupervisorReturn}>
                      {modalLoading ? '...' : `📤 إرسال الطلب (${totalQtySelected})`}
                    </button>
                    <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* سجل طلبات مرتجع المشرف */}
      {modal === 'supReturnLog' && (() => {
        const statusLabel = (s: string) => s === 'pending' ? 'قيد الانتظار' : s === 'approved' ? 'مقبول' : s === 'rejected' ? 'مرفوض' : s;
        const statusColor = (s: string) => s === 'pending' ? 'var(--pending)' : s === 'approved' ? 'var(--active)' : 'var(--danger)';
        const statusBg = (s: string) => s === 'pending' ? 'var(--pending-bg)' : s === 'approved' ? 'var(--active-bg)' : 'var(--danger-bg)';
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-wide">
              <div className="modal-header">
                <div className="modal-icon">↩️</div>
                <div><div className="modal-title">سجل طلبات المرتجع للمدير</div></div>
              </div>
              {supReturnRequestsLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>جاري التحميل...</div>
              ) : supReturnRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>↩️</div>
                  لا توجد طلبات مرتجعات للمدير
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                  {supReturnRequests.map((r: any) => {
                    const items: any[] = Array.isArray(r.items) ? r.items : [];
                    return (
                      <div key={r.id} style={{ border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px 14px', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>📅 {fmtDate(r.created_at)}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: statusBg(r.status), color: statusColor(r.status) }}>
                            {statusLabel(r.status)}
                          </span>
                        </div>
                        {items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.map((item: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                                <span style={{ fontSize: 18 }}>{UI[item.type] || '📦'}</span>
                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{UL[item.type] || item.type}</span>
                                <span style={{ color: 'var(--muted)' }}>× {item.qty}</span>
                                {item.price > 0 && <span style={{ color: 'var(--muted)' }}>— {fmt(item.price)} ج</span>}
                                {item.condition && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 5, background: 'var(--border)', color: 'var(--text2)' }}>{item.condition === 'new' ? 'جديد' : item.condition === 'good' ? 'جيد' : 'تالف'}</span>}
                                {item.company_name && <span style={{ fontSize: 11, color: 'var(--muted)' }}>🏢 {item.company_name}</span>}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {r.status === 'approved' && r.approved_by && (
                          <div style={{ fontSize: 12, color: 'var(--active)', marginTop: 6 }}>✅ قُبل بواسطة: {r.approved_by} — {fmtDate(r.approved_at)}</div>
                        )}
                        {r.status === 'rejected' && r.rejected_by && (
                          <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>❌ رُفض بواسطة: {r.rejected_by} — {fmtDate(r.rejected_at)}</div>
                        )}
                        {r.status === 'pending' && (
                          <div style={{ marginTop: 8 }}>
                            <button
                              onClick={async () => {
                                if (!confirm('هل تريد إلغاء طلب المرتجع؟ سيتم فك تجميد المعدات.')) return;
                                const res = await api('cancelSupervisorReturn', { returnId: r.id });
                                if (res.success) {
                                  showToast('🗑️ تم إلغاء طلب المرتجع');
                                  setSupReturnRequests((prev: any[]) => prev.filter((x: any) => x.id !== r.id));
                                  invalidateCache(['getSupervisorStats']); init(false);
                                } else showToast('❌ ' + (res.message || 'خطأ'));
                              }}
                              style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #EF444455', borderRadius: 8, background: '#EF444411', color: '#EF4444', cursor: 'pointer' }}
                            >🗑️ إلغاء الطلب</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOAST */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </>
  );
}
