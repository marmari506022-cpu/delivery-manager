import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TOKEN_KEY, ROLE_KEY } from '../lib/api';
import { useBackClose } from '../lib/backNav';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#F8FAFC;
  --white:#ffffff;
  --text:#111827;
  --text2:#374151;
  --muted:#6B7280;
  --muted2:#94A3B8;
  --border:#E5E7EB;
  --border2:#EEF2F7;
  --accent:#2563EB;
  --accent2:#1D4ED8;
  --accent-bg:#EEF4FF;
  --accent-light:#BFDBFE;
  --success:#10B981;
  --success-bg:#ECFDF5;
  --danger:#EF4444;
  --danger-bg:#FEF2F2;
  --warning:#F59E0B;
  --warning-bg:#FFFBEB;
  --font:'Cairo',sans-serif;
  --ease:cubic-bezier(0.16,1,0.3,1);
  --sidebar-w:320px;
}
html{direction:rtl;overscroll-behavior-y:contain;}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:calc(var(--vh, 1vh) * 100);-webkit-font-smoothing:antialiased;overscroll-behavior-y:contain;}

/* ======================== LAYOUT ======================== */
.page-wrapper{
  display:flex;
  min-height:calc(var(--vh, 1vh) * 100);
  padding:40px;
  gap:40px;
  background:var(--bg);
}

/* ======================== SIDEBAR ======================== */
.sidebar{
  width:var(--sidebar-w);
  min-width:var(--sidebar-w);
  background:var(--white);
  border-radius:24px;
  padding:32px;
  box-shadow:0 10px 40px rgba(0,0,0,.04);
  display:flex;
  flex-direction:column;
  height:calc(calc(var(--vh, 1vh) * 100) - 80px);
  position:sticky;
  top:40px;
  border:1px solid var(--border2);
  transition:transform 300ms var(--ease);
}

/* Logo Area */
.sidebar-logo{
  height:120px;
  display:flex;
  align-items:center;
  gap:20px;
  border-bottom:1px solid var(--border2);
  margin-bottom:40px;
  padding-bottom:24px;
}
.sidebar-logo-icon{
  width:72px;height:72px;
  background:var(--accent-bg);
  border-radius:20px;
  display:flex;align-items:center;justify-content:center;
  font-size:32px;
  flex-shrink:0;
}
.sidebar-logo-text{}
.sidebar-logo-title{font-size:20px;font-weight:700;color:var(--text);line-height:1.2;}
.sidebar-logo-sub{font-size:14px;color:var(--muted2);margin-top:4px;}

/* Nav */
.sidebar-nav{display:flex;flex-direction:column;gap:12px;flex:1;}
.nav-item{
  height:64px;
  border-radius:16px;
  display:flex;align-items:center;
  gap:16px;
  padding:0 22px;
  cursor:pointer;
  transition:all 250ms var(--ease);
  color:var(--muted);
  font-size:17px;
  font-weight:600;
  text-decoration:none;
  position:relative;
}
.nav-item:hover{background:var(--bg);color:var(--text2);}
.nav-item.active{
  background:var(--accent-bg);
  color:var(--accent);
  box-shadow:0 12px 28px rgba(37,99,235,.10);
}
.nav-item.active::before{
  content:'';
  position:absolute;
  right:0;top:12px;bottom:12px;
  width:4px;
  background:var(--accent);
  border-radius:4px 0 0 4px;
}
.nav-icon{
  width:44px;height:44px;
  border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;
  flex-shrink:0;
}
.nav-item.active .nav-icon{background:rgba(37,99,235,.12);}

/* Sidebar Bottom Upgrade Card */
.sidebar-upgrade{
  margin-top:auto;
  background:linear-gradient(135deg,#2563EB,#4F8CFF);
  border-radius:24px;
  padding:28px;
  color:#fff;
  margin-top:24px;
}
.sidebar-upgrade-title{font-size:18px;font-weight:700;margin-bottom:6px;}
.sidebar-upgrade-desc{font-size:14px;opacity:.85;margin-bottom:20px;}
.sidebar-upgrade-btn{
  width:100%;height:48px;
  background:#fff;
  color:var(--accent);
  border:none;
  border-radius:14px;
  font-family:var(--font);
  font-size:15px;font-weight:700;
  cursor:pointer;
  transition:all .2s;
}
.sidebar-upgrade-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.15);}

/* ======================== MAIN CONTENT ======================== */
.main-content{flex:1;display:flex;flex-direction:column;gap:0;min-width:0;}

/* ======================== TOP HEADER ======================== */
.top-header{
  height:88px;
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:32px;
}
.header-titles{}
.header-title{font-size:36px;font-weight:700;color:var(--text);line-height:1.1;}
.header-subtitle{font-size:16px;color:var(--muted);margin-top:4px;}
.header-actions{display:flex;align-items:center;gap:20px;}
.header-search{
  width:380px;height:52px;
  background:var(--white);
  border:1.5px solid var(--border);
  border-radius:16px;
  display:flex;align-items:center;
  gap:12px;
  padding:0 20px;
  font-size:15px;color:var(--muted2);
  box-shadow:0 2px 8px rgba(0,0,0,.03);
  cursor:text;
  transition:border-color .2s;
}
.header-search:hover{border-color:var(--accent-light);}
.header-search input{border:none;outline:none;background:transparent;font-family:var(--font);font-size:15px;color:var(--text);flex:1;}
.header-search input::placeholder{color:var(--muted2);}
.header-notif{
  width:52px;height:52px;
  background:var(--white);
  border:1.5px solid var(--border);
  border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-size:22px;
  cursor:pointer;
  transition:all .2s;
  position:relative;
  box-shadow:0 2px 8px rgba(0,0,0,.03);
}
.header-notif:hover{border-color:var(--accent-light);color:var(--accent);}
.notif-dot{
  position:absolute;top:10px;right:10px;
  width:8px;height:8px;background:var(--danger);border-radius:50%;
  border:2px solid var(--white);
}
.header-avatar{
  width:52px;height:52px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  border-radius:16px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:700;color:#fff;
  cursor:pointer;
  box-shadow:0 4px 16px rgba(37,99,235,.25);
}

/* ======================== STATS SECTION ======================== */
.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:24px;
  margin-bottom:32px;
}
.stat-card{
  background:var(--white);
  border-radius:24px;
  padding:32px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
  transition:transform .25s var(--ease),box-shadow .25s var(--ease);
  cursor:pointer;
}
.stat-card:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.09);}
.stat-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;}
.stat-icon{
  width:64px;height:64px;
  border-radius:18px;
  background:var(--accent-bg);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;
}
.stat-icon.green{background:#ECFDF5;}
.stat-icon.amber{background:#FFFBEB;}
.stat-icon.purple{background:#F5F3FF;}
.stat-change{
  font-size:13px;font-weight:600;
  color:var(--success);
  background:var(--success-bg);
  padding:4px 10px;
  border-radius:8px;
  display:flex;align-items:center;gap:4px;
}
.stat-change.down{color:var(--danger);background:var(--danger-bg);}
.stat-value{font-size:42px;font-weight:700;color:var(--text);line-height:1;letter-spacing:-1px;margin-bottom:8px;}
.stat-label{font-size:16px;color:var(--muted);font-weight:500;}

/* ======================== ANALYTICS SECTION ======================== */
.analytics-row{
  display:grid;
  grid-template-columns:70% 30%;
  gap:24px;
  margin-bottom:32px;
}

/* Chart Card */
.chart-card{
  background:var(--white);
  border-radius:24px;
  padding:32px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
}
.chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
.chart-title{font-size:20px;font-weight:700;color:var(--text);}
.chart-legend{display:flex;align-items:center;gap:20px;}
.legend-item{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted);}
.legend-dot{width:10px;height:10px;border-radius:50%;}
.legend-dot.blue{background:var(--accent);}
.legend-dot.light{background:#BFDBFE;}
.chart-area{height:280px;position:relative;}
.chart-svg{width:100%;height:100%;}

/* Right Panel Mini Cards */
.right-panel{display:flex;flex-direction:column;gap:20px;}
.mini-card{
  background:var(--white);
  border-radius:22px;
  padding:24px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
  flex:1;
}
.mini-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.mini-card-label{font-size:14px;color:var(--muted);font-weight:600;}
.mini-card-value{font-size:28px;font-weight:700;color:var(--text);}
.mini-card-change{font-size:13px;color:var(--success);font-weight:600;}
.mini-sparkline{display:flex;align-items:flex-end;gap:4px;height:36px;margin-top:12px;}
.spark-bar{flex:1;border-radius:3px 3px 0 0;background:var(--accent-bg);transition:background .2s;}
.spark-bar.filled{background:var(--accent);}

/* ======================== BOTTOM SECTION ======================== */
.bottom-row{
  display:grid;
  grid-template-columns:60% 40%;
  gap:24px;
}

/* Table Card */
.table-card{
  background:var(--white);
  border-radius:24px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
  overflow:hidden;
}
.table-header{
  padding:24px 32px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border2);
}
.table-title{font-size:18px;font-weight:700;color:var(--text);}
.table-btn{
  height:40px;
  padding:0 20px;
  border:1.5px solid var(--border);
  border-radius:12px;
  background:var(--white);
  font-family:var(--font);
  font-size:14px;font-weight:600;
  color:var(--text2);
  cursor:pointer;
  transition:all .2s;
}
.table-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-bg);}
.table-head{
  display:grid;
  grid-template-columns:2fr 1.5fr 1fr 1fr;
  padding:0 32px;
  height:56px;
  align-items:center;
  background:#F9FAFB;
  border-bottom:1px solid var(--border2);
}
.table-th{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;}
.table-row{
  display:grid;
  grid-template-columns:2fr 1.5fr 1fr 1fr;
  padding:0 32px;
  height:68px;
  align-items:center;
  border-bottom:1px solid var(--border2);
  transition:background .15s;
  cursor:pointer;
}
.table-row:hover{background:#FAFBFF;}
.table-row:last-child{border-bottom:none;}
.table-cell{font-size:15px;color:var(--text2);}
.table-cell.name{font-weight:700;color:var(--text);}
.table-cell.amount{font-weight:700;color:var(--accent);}
.table-status{
  display:inline-flex;align-items:center;
  padding:5px 14px;
  border-radius:20px;
  font-size:13px;font-weight:700;
}
.table-status.done{background:var(--success-bg);color:var(--success);}
.table-status.pending{background:#FFFBEB;color:var(--warning);}
.table-status.process{background:var(--accent-bg);color:var(--accent);}

/* Notifications Card */
.notif-card{
  background:var(--white);
  border-radius:24px;
  box-shadow:0 8px 30px rgba(0,0,0,.05);
  overflow:hidden;
}
.notif-header{
  padding:24px 28px;
  border-bottom:1px solid var(--border2);
  display:flex;align-items:center;justify-content:space-between;
}
.notif-title{font-size:18px;font-weight:700;color:var(--text);}
.notif-badge{
  background:var(--accent-bg);color:var(--accent);
  border-radius:8px;padding:3px 10px;
  font-size:13px;font-weight:700;
}
.notif-list{padding:20px;}
.notif-item{
  padding:18px 20px;
  border-radius:16px;
  margin-bottom:12px;
  cursor:pointer;
  transition:background .15s;
  position:relative;
  border:1px solid transparent;
}
.notif-item:hover{background:var(--bg);border-color:var(--border2);}
.notif-item.unread{background:var(--accent-bg);border-color:rgba(37,99,235,.1);}
.notif-item.unread::before{
  content:'';
  position:absolute;
  right:0;top:14px;bottom:14px;
  width:3px;background:var(--accent);
  border-radius:3px;
}
.notif-item-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;}
.notif-item-desc{font-size:13px;color:var(--muted);line-height:1.5;}
.notif-item-time{font-size:12px;color:var(--muted2);margin-top:6px;}

/* Sidebar Overlay for mobile */
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:90;}

@media(max-width:1100px){
  .stats-grid{grid-template-columns:repeat(2,1fr);}
  .analytics-row{grid-template-columns:1fr;}
  .right-panel{flex-direction:row;}
  .bottom-row{grid-template-columns:1fr;}
}
@media(max-width:900px){
  .page-wrapper{padding:20px;gap:0;}
  .sidebar{
    position:fixed;right:0;top:0;bottom:0;z-index:100;
    border-radius:0 0 0 24px;
    transform:translateX(100%);
    height:calc(var(--vh, 1vh) * 100);
  }
  .sidebar.open{transform:translateX(0);}
  .sidebar-overlay{display:block;}
  .main-content{padding-top:72px;}
  .mobile-menu-btn{
    display:flex;position:fixed;top:20px;right:20px;z-index:50;
    width:48px;height:48px;
    background:var(--white);border:1.5px solid var(--border);border-radius:14px;
    align-items:center;justify-content:center;font-size:20px;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.08);
  }
}
@media(min-width:901px){
  .mobile-menu-btn{display:none;}
}

/* ======================== MOBILE SCALE (30% smaller, fills screen) ======================== */
@media(max-width:900px){
  html{zoom:0.7;}
  body{min-height:142.86vh !important;}
  .page-wrapper{min-height:142.86vh !important;}
  .sidebar{height:142.86vh !important;}
}
`;

export default function DashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  // اجعل زر/سحبة الرجوع في الموبايل تُغلق القائمة الجانبية بدل الخروج من التطبيق
  useBackClose(sidebarOpen, () => setSidebarOpen(false));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { router.replace('/'); }
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
    { id: 'pilots', label: 'الطيارون', icon: '✈️' },
    { id: 'finance', label: 'العمليات المالية', icon: '💰' },
    { id: 'reports', label: 'التقارير', icon: '📈' },
    { id: 'notifications', label: 'الإشعارات', icon: '🔔' },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
    { id: 'profile', label: 'الملف الشخصي', icon: '👤' },
    { id: 'activity', label: 'سجل النشاط', icon: '📋' },
  ];

  const operations = [
    { name: 'محمد عبدالله', type: 'صرف راتب', amount: '٤٬٥٠٠ ج.م', date: '١٤ يونيو', status: 'done' },
    { name: 'خالد العمري', type: 'سلفة مالية', amount: '١٬٢٠٠ ج.م', date: '١٣ يونيو', status: 'pending' },
    { name: 'أحمد حسن', type: 'مكافأة أداء', amount: '٨٠٠ ج.م', date: '١٣ يونيو', status: 'done' },
    { name: 'عمر الشريف', type: 'خصم تأخير', amount: '٣٠٠ ج.م', date: '١٢ يونيو', status: 'process' },
    { name: 'يوسف إبراهيم', type: 'صرف راتب', amount: '٥٬١٠٠ ج.م', date: '١١ يونيو', status: 'done' },
  ];

  const statusLabel = (s: string) => {
    if (s === 'done') return { label: 'مكتمل', cls: 'done' };
    if (s === 'pending') return { label: 'قيد الانتظار', cls: 'pending' };
    return { label: 'جارٍ', cls: 'process' };
  };

  const notifications = [
    { title: 'طلب إجازة جديد', desc: 'طلب الطيار أحمد محمد إجازة لمدة ٣ أيام', time: 'منذ ٥ دقائق', unread: true },
    { title: 'تحويل طيار', desc: 'تم تحويل الطيار خالد إلى منطقة الجيزة', time: 'منذ ٢ ساعة', unread: true },
    { title: 'تقرير شهري جاهز', desc: 'تم إنشاء تقرير يونيو ٢٠٢٥', time: 'أمس', unread: false },
    { title: 'صرف رواتب', desc: 'تم صرف رواتب ٣٨ طيار بنجاح', time: '٢ أيام', unread: false },
  ];

  // SVG Chart
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس'];
  const data1 = [40, 65, 50, 80, 60, 90, 70, 85];
  const data2 = [25, 40, 30, 55, 42, 65, 48, 60];
  const W = 600, H = 200, pad = 30;
  const scaleX = (i: number) => pad + (i / (data1.length - 1)) * (W - 2 * pad);
  const scaleY = (v: number) => H - pad - ((v - 0) / 100) * (H - 2 * pad);
  const makePath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'C'} ${scaleX(i)},${scaleY(v)}`).join(' ');

  const smoothPath = (d: number[]) => {
    const pts = d.map((v, i) => [scaleX(i), scaleY(v)]);
    let p = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1][0] + pts[i][0]) / 2;
      p += ` C ${cp1x},${pts[i - 1][1]} ${cp1x},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
    }
    return p;
  };

  const areaPath = (d: number[]) => {
    const pts = d.map((v, i) => [scaleX(i), scaleY(v)]);
    let p = `M ${pts[0][0]},${H - pad}`;
    p += ` L ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1][0] + pts[i][0]) / 2;
      p += ` C ${cp1x},${pts[i - 1][1]} ${cp1x},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
    }
    p += ` L ${pts[pts.length - 1][0]},${H - pad} Z`;
    return p;
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Mobile Menu Button */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="page-wrapper">
        {/* ============== SIDEBAR ============== */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">✈️</div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">إدارة الطيارين</div>
              <div className="sidebar-logo-sub">لوحة الإدارة</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <a
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }}
              >
                <div className="nav-icon">{item.icon}</div>
                <span>{item.label}</span>
              </a>
            ))}
            <a className="nav-item" onClick={() => {
              localStorage.clear();
              router.push('/');
            }}>
              <div className="nav-icon">🚪</div>
              <span>تسجيل الخروج</span>
            </a>
          </nav>

          {/* Upgrade Card */}
          <div className="sidebar-upgrade">
            <div className="sidebar-upgrade-title">ترقية الخطة</div>
            <div className="sidebar-upgrade-desc">احصل على مزايا إضافية ومميزات متقدمة</div>
            <button className="sidebar-upgrade-btn">ترقية الآن</button>
          </div>
        </aside>

        {/* ============== MAIN CONTENT ============== */}
        <main className="main-content">
          {/* Top Header */}
          <header className="top-header">
            <div className="header-titles">
              <div className="header-title">لوحة التحكم</div>
              <div className="header-subtitle">مرحباً بعودتك، ابدأ يومك بإنجاز</div>
            </div>
            <div className="header-actions">
              <div className="header-search">
                <span>🔍</span>
                <input placeholder="البحث في النظام..." autoComplete="off" />
              </div>
              <div className="header-notif">
                🔔
                <span className="notif-dot"></span>
              </div>
              <div className="header-avatar">م</div>
            </div>
          </header>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon">✈️</div>
                <span className="stat-change">↑ ٨٪</span>
              </div>
              <div className="stat-value">١٢٤</div>
              <div className="stat-label">إجمالي الطيارين</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon green">🟢</div>
                <span className="stat-change">↑ ١٢٪</span>
              </div>
              <div className="stat-value">٣٨</div>
              <div className="stat-label">الرحلات النشطة</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon amber">💰</div>
                <span className="stat-change">↑ ٢٣٪</span>
              </div>
              <div className="stat-value">٢٨٦ألف</div>
              <div className="stat-label">الإيرادات الشهرية</div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon purple">📋</div>
                <span className="stat-change down">↓ ٥٪</span>
              </div>
              <div className="stat-value">١٧</div>
              <div className="stat-label">الطلبات الجديدة</div>
            </div>
          </div>

          {/* Analytics */}
          <div className="analytics-row">
            {/* Line Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">الإحصائيات الشهرية</div>
                <div className="chart-legend">
                  <div className="legend-item"><div className="legend-dot blue"></div>الإيرادات</div>
                  <div className="legend-item"><div className="legend-dot light"></div>الرحلات</div>
                </div>
              </div>
              <div className="chart-area">
                <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#93C5FD" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[20,40,60,80].map(v => (
                    <line key={v} x1={pad} y1={scaleY(v)} x2={W-pad} y2={scaleY(v)}
                      stroke="#F1F5F9" strokeWidth="1"/>
                  ))}
                  {/* Area fills */}
                  <path d={areaPath(data2)} fill="url(#grad2)"/>
                  <path d={areaPath(data1)} fill="url(#grad1)"/>
                  {/* Lines */}
                  <path d={smoothPath(data2)} fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d={smoothPath(data1)} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"/>
                  {/* Dots */}
                  {data1.map((v, i) => (
                    <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="4" fill="#2563EB" stroke="#fff" strokeWidth="2"/>
                  ))}
                  {/* Month labels */}
                  {months.map((m, i) => (
                    <text key={i} x={scaleX(i)} y={H - 4} textAnchor="middle"
                      fontSize="10" fill="#94A3B8" fontFamily="Cairo">{m}</text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Right Mini Cards */}
            <div className="right-panel">
              <div className="mini-card">
                <div className="mini-card-header">
                  <div className="mini-card-label">متوسط الراتب</div>
                  <span style={{fontSize:'20px'}}>💼</span>
                </div>
                <div className="mini-card-value">٤٬٢٠٠</div>
                <div className="mini-card-change">↑ ٧٪ هذا الشهر</div>
                <div className="mini-sparkline">
                  {[3,5,4,7,5,8,6,9].map((v,i) => (
                    <div key={i} className={`spark-bar ${i>5?'filled':''}`}
                      style={{height:`${v*12}%`}}/>
                  ))}
                </div>
              </div>
              <div className="mini-card">
                <div className="mini-card-header">
                  <div className="mini-card-label">نسبة الحضور</div>
                  <span style={{fontSize:'20px'}}>✅</span>
                </div>
                <div className="mini-card-value">٩٣٪</div>
                <div className="mini-card-change">↑ ٢٪ مقارنة بالشهر</div>
                <div className="mini-sparkline">
                  {[6,7,5,8,7,9,8,9].map((v,i) => (
                    <div key={i} className={`spark-bar ${i>4?'filled':''}`}
                      style={{height:`${v*12}%`}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row">
            {/* Operations Table */}
            <div className="table-card">
              <div className="table-header">
                <div className="table-title">العمليات الأخيرة</div>
                <button className="table-btn">عرض الكل</button>
              </div>
              <div className="table-head">
                <div className="table-th">الطيار</div>
                <div className="table-th">نوع العملية</div>
                <div className="table-th">المبلغ</div>
                <div className="table-th">الحالة</div>
              </div>
              {operations.map((op, i) => {
                const st = statusLabel(op.status);
                return (
                  <div key={i} className="table-row">
                    <div className="table-cell name">{op.name}</div>
                    <div className="table-cell">{op.type}</div>
                    <div className="table-cell amount">{op.amount}</div>
                    <div className="table-cell">
                      <span className={`table-status ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notifications */}
            <div className="notif-card">
              <div className="notif-header">
                <div className="notif-title">أحدث الإشعارات</div>
                <div className="notif-badge">٢ جديد</div>
              </div>
              <div className="notif-list">
                {notifications.map((n, i) => (
                  <div key={i} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-desc">{n.desc}</div>
                    <div className="notif-item-time">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
