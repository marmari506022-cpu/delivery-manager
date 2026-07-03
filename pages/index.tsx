import { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { api, TOKEN_KEY, ROLE_KEY, PILOT_ID_KEY, invalidateAllCache } from '../lib/api';
import { supabase } from '../lib/supabase';

type LoginPageProps = {
  loginIcon: string;
  loginTitle: string;
  loginSubtitle: string;
  loginBg: string;
};

// Runs on the server, on every request — so the HTML the browser first
// receives already has the developer's saved icon/title/subtitle/background
// baked in. Previously these were fetched client-side in a useEffect AFTER
// the page had already painted with hardcoded defaults, so every visitor
// saw a flash of the old default login screen before the real one replaced
// it a moment later. Reading straight from Supabase here (same table/query
// as pages/api/getLoginSettings.ts) removes that flash entirely, since
// there's no client-side fetch-then-swap step left for this content.
export const getServerSideProps: GetServerSideProps<LoginPageProps> = async () => {
  const fallback: LoginPageProps = {
    loginIcon: '',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'قم بتسجيل الدخول للوصول إلى لوحة التحكم',
    loginBg: '',
  };

  try {
    const { data, error } = await supabase
      .from('login_settings')
      .select('icon,title,subtitle,bg_image')
      .eq('id', 'default')
      .limit(1);

    if (error || !data?.[0]) return { props: fallback };

    const row = data[0];
    return {
      props: {
        loginIcon: row.icon || '',
        loginTitle: row.title || fallback.loginTitle,
        loginSubtitle: row.subtitle || fallback.loginSubtitle,
        loginBg: row.bg_image || '',
      },
    };
  } catch {
    // Supabase unreachable at request time — fail open to the hardcoded
    // defaults rather than breaking the login page entirely.
    return { props: fallback };
  }
};

export default function LoginPage(props: LoginPageProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetId, setResetId] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetError1, setResetError1] = useState('');
  const [resetError2, setResetError2] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [waLink, setWaLink] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Seeded from getServerSideProps, so first paint already shows the
  // developer's real branding — no client-side fetch needed for this.
  const [loginIcon, setLoginIcon] = useState(props.loginIcon);
  const [loginTitle, setLoginTitle] = useState(props.loginTitle);
  const [loginSubtitle, setLoginSubtitle] = useState(props.loginSubtitle);
  const [loginBg, setLoginBg] = useState(props.loginBg);

  useEffect(() => {
    document.documentElement.classList.add('login-view');
    return () => { document.documentElement.classList.remove('login-view'); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('has-login-bg', !!loginBg);
  }, [loginBg]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    if (token && role) {
      const pages: Record<string, string> = { manager: '/manager', supervisor: '/supervisor', pilot: '/pilot', developer: '/developer' };
      const target = pages[role];
      if (target) {
        router.replace(target);
      } else {
        // Unknown/stale role — clear the invalid session instead of
        // redirecting to a page that will just bounce back here.
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(PILOT_ID_KEY);
      }
    }
  }, []);

  async function doLogin() {
    if (!username || !password) { setError('الرجاء إدخال اسم المستخدم وكلمة المرور'); return; }
    setLoading(true); setError('');
    const res = await api('login', { username, password });
    setLoading(false);
    if (!res.success) { setError(res.message || 'خطأ في تسجيل الدخول'); return; }
    const pages: Record<string, string> = { manager: '/manager', supervisor: '/supervisor', pilot: '/pilot', developer: '/developer' };
    const target = pages[res.role];
    if (!target) {
      setError(`هذا الحساب له صلاحية غير مدعومة في الواجهة (${res.role || 'غير معروفة'}). تواصل مع المطوّر.`);
      return;
    }
    invalidateAllCache();
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(ROLE_KEY, res.role);
    if (res.pilotId) localStorage.setItem(PILOT_ID_KEY, res.pilotId);
    if (res.role === 'developer') {
      localStorage.setItem('badaya_dev_name', res.name || '');
      localStorage.setItem('badaya_dev_username', username);
    }
    router.push(target);
  }

  async function doRequestReset() {
    if (!resetId) { setResetError1('أدخل اسم المستخدم أو الهاتف'); return; }
    setResetLoading(true); setResetError1('');
    const res = await api('requestPasswordReset', { identifier: resetId });
    setResetLoading(false);
    if (!res.success) { setResetError1(res.message || 'خطأ'); return; }
    const phone = (res.phone || '').replace(/\D/g, '');
    const msg = encodeURIComponent('كود استعادة كلمة المرور - شركة بداية:\n' + res.code);
    setWaLink(`https://wa.me/${phone}?text=${msg}`);
    setResetStep(2);
  }

  async function doVerifyReset() {
    if (!resetCode || !newPass) { setResetError2('أدخل الكود وكلمة المرور الجديدة'); return; }
    setResetLoading(true); setResetError2('');
    const res = await api('verifyResetCode', { code: resetCode, newPass });
    setResetLoading(false);
    if (!res.success) { setResetError2(res.message || 'كود خاطئ'); return; }
    setResetSuccess('تم تغيير كلمة المرور! يمكنك تسجيل الدخول الآن.');
    setTimeout(() => {
      setResetOpen(false); setResetStep(1); setResetId('');
      setResetCode(''); setNewPass(''); setResetSuccess('');
    }, 2000);
  }

  const barData = [
    { h: 45, label: 'يناير', type: 'light' },
    { h: 62, label: 'فبراير', type: 'primary' },
    { h: 38, label: 'مارس', type: 'light' },
    { h: 75, label: 'أبريل', type: 'primary' },
    { h: 55, label: 'مايو', type: 'light' },
    { h: 80, label: 'يونيو', type: 'primary' },
    { h: 48, label: 'يوليو', type: 'light' },
  ];

  const pilots = [
    { name: 'أحمد محمد', id: 'PIL-001', status: 'نشط', statusClass: 'active', avatar: 'أ', avatarClass: 'a' },
    { name: 'خالد العمري', id: 'PIL-002', status: 'قيد المراجعة', statusClass: 'pending', avatar: 'خ', avatarClass: 'b' },
    { name: 'عمر الحسن', id: 'PIL-003', status: 'إجازة', statusClass: 'on-leave', avatar: 'ع', avatarClass: 'c' },
  ];

  return (
    <>
      <div className="login-page">
        {loginBg && <div className="login-bg-image" style={{ backgroundImage: `url(${loginBg})` }} />}
        {/* RIGHT - Auth Panel */}
        <div className="auth-section">
          <div className="auth-card">
            {/* Logo */}
            <div className="logo-area">
              <div className="logo-img">
                {loginIcon ? <img src={loginIcon} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : '✈️'}
              </div>
              <h1 className="logo-title">{loginTitle}</h1>
              <p className="logo-subtitle">{loginSubtitle}</p>
            </div>

            {/* Form */}
            <form className="auth-form" onSubmit={e => { e.preventDefault(); doLogin(); }}>
              {error && <div className="alert-box alert-error">⚠️ {error}</div>}

              {/* Email Field */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">البريد الإلكتروني</label>
                <div className="field-wrapper">
                  <span className="field-icon-right">✉️</span>
                  <input
                    id="login-email"
                    name="username"
                    className="auth-input"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="أدخل البريد الإلكتروني"
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="field-group">
                <label className="field-label" htmlFor="login-password">كلمة المرور</label>
                <div className="field-wrapper">
                  <span className="field-icon-right">🔒</span>
                  <input
                    id="login-password"
                    name="password"
                    className="auth-input has-left-icon"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                  />
                  <button type="button" className="field-icon-left" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="forgot-link">
                <a onClick={() => setResetOpen(true)}>نسيت كلمة المرور؟</a>
              </div>

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>

              {/* Bottom */}
              <div className="bottom-text">
                ليس لديك حساب؟
                <a>إنشاء حساب</a>
              </div>
            </form>
          </div>
        </div>

        {/* LEFT - Visual Panel */}
        <div className="visual-section">
          <div className="visual-inner">
            {/* Dashboard Header */}
            <div className="dash-header">
              <div className="dash-title-group">
                <div className="dash-icon">✈️</div>
                <div>
                  <div className="dash-title">لوحة تحكم بداية</div>
                  <div className="dash-sub">نظام إدارة الطيارين</div>
                </div>
              </div>
              <div className="dash-badge">مباشر الآن</div>
            </div>

            {/* Stats */}
            <div className="stat-row">
              <div className="stat-card">
                <div className="stat-icon-wrap blue">✈️</div>
                <div className="stat-value">١٢٤</div>
                <div className="stat-label">إجمالي الطيارين</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrap green">✅</div>
                <div className="stat-value">٩٨</div>
                <div className="stat-label">طيارون نشطون</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrap amber">📋</div>
                <div className="stat-value">١٨</div>
                <div className="stat-label">طلبات معلقة</div>
              </div>
            </div>

            {/* Chart */}
            <div className="chart-card">
              <div className="chart-label">
                إحصائيات الرواتب الشهرية
                <span className="chart-legend">٢٠٢٥</span>
              </div>
              <div className="chart-bars">
                {barData.map((b, i) => (
                  <div key={i} className="chart-bar-wrap">
                    <div
                      className={`chart-bar ${b.type}`}
                      style={{ height: `${b.h}%` }}
                    />
                    <span className="bar-label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pilots List */}
            <div className="pilot-card">
              {pilots.map((p, i) => (
                <div key={i} className="pilot-row">
                  <div className="pilot-info">
                    <div className={`pilot-avatar ${p.avatarClass}`}>{p.avatar}</div>
                    <div>
                      <div className="pilot-name">{p.name}</div>
                      <div className="pilot-id">{p.id}</div>
                    </div>
                  </div>
                  <span className={`pilot-status ${p.statusClass}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      {resetOpen && (
        <div className="overlay">
          <div className="modal">
            <h3>🔐 استعادة كلمة المرور</h3>
            {resetStep === 1 && (
              <>
                {resetError1 && <div className="alert-box alert-error" style={{marginBottom:'20px'}}>{resetError1}</div>}
                <div className="field-group" style={{marginBottom:'16px'}}>
                  <label className="field-label">اسم المستخدم أو رقم الهاتف</label>
                  <div className="field-wrapper">
                    <input className="auth-input" value={resetId} onChange={e => setResetId(e.target.value)} placeholder="أدخل اسم المستخدم أو الهاتف" />
                  </div>
                </div>
                <button className="submit-btn" style={{marginTop:'8px'}} disabled={resetLoading} onClick={doRequestReset}>
                  {resetLoading ? '...' : 'إرسال الكود'}
                </button>
                <button className="btn-outline" onClick={() => setResetOpen(false)}>إلغاء</button>
              </>
            )}
            {resetStep === 2 && (
              <>
                {resetError2 && <div className="alert-box alert-error" style={{marginBottom:'20px'}}>{resetError2}</div>}
                {resetSuccess && <div className="alert-box alert-success" style={{marginBottom:'20px'}}>{resetSuccess}</div>}
                <p style={{color:'var(--muted)',fontSize:'14px',textAlign:'center',marginBottom:'14px'}}>
                  تم إنشاء الكود. افتح الواتساب لإرساله.
                </p>
                <a href={waLink} className="wa-btn" target="_blank" rel="noreferrer">📱 فتح الواتساب لإرسال الكود</a>
                <div className="field-group" style={{marginBottom:'16px'}}>
                  <label className="field-label">كود التحقق (6 أرقام)</label>
                  <div className="field-wrapper">
                    <input className="auth-input" type="number" value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="أدخل الكود" maxLength={6} />
                  </div>
                </div>
                <div className="field-group" style={{marginBottom:'8px'}}>
                  <label className="field-label">كلمة المرور الجديدة</label>
                  <div className="field-wrapper">
                    <input className="auth-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة مرور جديدة" />
                  </div>
                </div>
                <button className="submit-btn" style={{marginTop:'8px'}} disabled={resetLoading} onClick={doVerifyReset}>
                  {resetLoading ? '...' : 'تأكيد وتغيير'}
                </button>
                <button className="btn-outline" onClick={() => setResetOpen(false)}>إلغاء</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
