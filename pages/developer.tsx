import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api, apiGet, TOKEN_KEY, ROLE_KEY, invalidateAllCache } from '../lib/api';
import { useBackClose } from '../lib/backNav';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

export default function DeveloperPage() {
  const router = useRouter();
  const [view, setView] = useState<'profile' | 'reset' | 'addManager' | 'loginui'>('profile');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [devUsername, setDevUsername] = useState('');
  const [devName, setDevName] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [managers, setManagers] = useState<any[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [confirmStep, setConfirmStep] = useState<'select' | 'confirm'>('select');
  const [confirmText, setConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [newMgrName, setNewMgrName] = useState('');
  const [newMgrUsername, setNewMgrUsername] = useState('');
  const [newMgrPassword, setNewMgrPassword] = useState('');
  const [newMgrPhone, setNewMgrPhone] = useState('');
  const [addMgrErr, setAddMgrErr] = useState('');
  const [addMgrLoading, setAddMgrLoading] = useState(false);

  // ======= واجهة تسجيل الدخول — مخزّنة في قاعدة البيانات فتظهر لأي حد يفتح لينك التطبيق =======
  const [loginIcon, setLoginIcon] = useState('');
  const [loginTitle, setLoginTitle] = useState('تسجيل الدخول');
  const [loginSubtitle, setLoginSubtitle] = useState('قم بتسجيل الدخول للوصول إلى لوحة التحكم');
  const [loginBg, setLoginBg] = useState('');
  const [loginSettingsLoading, setLoginSettingsLoading] = useState(false);
  const [loginSettingsLoaded, setLoginSettingsLoaded] = useState(false);
  const [loginSettingsSaving, setLoginSettingsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    if (!token || role !== 'developer') { router.replace('/'); return; }
    setDevName(localStorage.getItem('badaya_dev_name') || '');
    setDevUsername(localStorage.getItem('badaya_dev_username') || '');
    setLoading(false);
  }, []);

  useEffect(() => { if (view === 'reset') loadManagers(); }, [view]);
  useEffect(() => { if (view === 'loginui' && !loginSettingsLoaded) loadLoginSettings(); }, [view]);
  useBackClose(sidebarOpen, () => setSidebarOpen(false));

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  function confirmLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem('badaya_dev_name');
    localStorage.removeItem('badaya_dev_username');
    invalidateAllCache();
    router.replace('/');
  }

  async function loadManagers() {
    setManagersLoading(true);
    const res = await apiGet('getManagersForDeveloper');
    setManagersLoading(false);
    if (res.success) setManagers(res.managers || []);
    else showToast('❌ ' + (res.message || 'فشل تحميل المديرين'));
  }

  async function loadLoginSettings() {
    setLoginSettingsLoading(true);
    const res = await apiGet('getLoginSettings');
    setLoginSettingsLoading(false);
    if (res.success) {
      setLoginIcon(res.icon || '');
      setLoginTitle(res.title || 'تسجيل الدخول');
      setLoginSubtitle(res.subtitle || 'قم بتسجيل الدخول للوصول إلى لوحة التحكم');
      setLoginBg(res.bgImage || '');
      setLoginSettingsLoaded(true);
    } else {
      showToast('❌ ' + (res.message || 'فشل تحميل إعدادات واجهة تسجيل الدخول'));
    }
  }

  function handleLoginIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { showToast('❌ حجم الصورة كبير — أقل من 200KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLoginIcon(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleLoginBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showToast('❌ حجم الصورة كبير — أقل من 1MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLoginBg(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function saveLoginSettings() {
    setLoginSettingsSaving(true);
    const res = await api('updateLoginSettings', { icon: loginIcon, title: loginTitle, subtitle: loginSubtitle, bgImage: loginBg });
    setLoginSettingsSaving(false);
    if (res.success) showToast('✅ تم حفظ واجهة تسجيل الدخول — هتظهر لأي حد يفتح لينك التطبيق');
    else showToast('❌ ' + (res.message || 'فشل الحفظ'));
  }

  async function saveDevProfile() {
    if (!devUsername) { setProfileErr('اليوزر مطلوب'); return; }
    if (!oldPass) { setProfileErr('أدخل كلمة المرور الحالية'); return; }
    if (newPass && newPass !== confirmPass) { setProfileErr('كلمة المرور الجديدة غير متطابقة'); return; }
    if (newPass && newPass.length < 4) { setProfileErr('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
    setProfileLoading(true); setProfileErr('');
    const res = await api('updateDeveloperProfile', { username: devUsername, oldPassword: oldPass, newPassword: newPass || undefined });
    setProfileLoading(false);
    if (res.success) {
      if (res.token) localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem('badaya_dev_username', res.username);
      setOldPass(''); setNewPass(''); setConfirmPass('');
      showToast('✅ تم تحديث بيانات المطور بنجاح');
    } else { setProfileErr(res.message || 'خطأ'); }
  }

  async function doAddManager() {
    if (!newMgrName || !newMgrUsername || !newMgrPassword) { setAddMgrErr('الاسم واليوزر وكلمة المرور مطلوبون'); return; }
    if (newMgrPassword.length < 4) { setAddMgrErr('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
    setAddMgrLoading(true); setAddMgrErr('');
    const res = await api('addManagerByDeveloper', { name: newMgrName, username: newMgrUsername, password: newMgrPassword, phone: newMgrPhone });
    setAddMgrLoading(false);
    if (res.success) {
      showToast('✅ تم إنشاء حساب المدير بنجاح');
      setNewMgrName(''); setNewMgrUsername(''); setNewMgrPassword(''); setNewMgrPhone('');
      loadManagers();
      setView('reset');
    } else { setAddMgrErr(res.message || 'خطأ'); }
  }

  function startDeleteManager(m: any) {
    setSelectedManager(m); setConfirmText(''); setConfirmStep('confirm');
  }

  async function doDeleteManager() {
    if (!selectedManager) return;
    if (confirmText !== selectedManager.username) { showToast('❌ اكتب يوزر المدير بالظبط للتأكيد'); return; }
    setDeleteLoading(true);
    const res = await api('developerDeleteManager', { managerId: selectedManager.id, confirmUsername: confirmText });
    setDeleteLoading(false);
    if (res.success) {
      showToast('✅ ' + res.message);
      setConfirmStep('select'); setSelectedManager(null); setConfirmText('');
      loadManagers();
    } else { showToast('❌ ' + (res.message || 'فشلت العملية')); }
  }

  if (loading) return (
    <>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, background: 'transparent', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', zIndex: 9999 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid rgba(37,99,235,0.2)', borderTopColor: '#2563EB', animation: 'spin .8s linear infinite' }} />
        <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>جارٍ التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay-bg" onClick={() => setSidebarOpen(false)} />}

      <div className="page-wrapper">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" style={{ background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛠️</div>
            <div>
              <div className="sidebar-logo-title">{devName || 'حساب المطوّر'}</div>
              <div className="sidebar-logo-sub">لوحة المطوّر</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { setView('profile'); setSidebarOpen(false); }}>
              <div className="nav-icon">👤</div>
              <span style={{ flex: 1, textAlign: 'right' }}>بروفايل المطوّر</span>
            </button>
            <button className={`nav-item ${view === 'addManager' ? 'active' : ''}`} onClick={() => { setView('addManager'); setSidebarOpen(false); }}>
              <div className="nav-icon">➕</div>
              <span style={{ flex: 1, textAlign: 'right' }}>إضافة مدير جديد</span>
            </button>
            <button className={`nav-item ${view === 'loginui' ? 'active' : ''}`} onClick={() => { setView('loginui'); setSidebarOpen(false); }}>
              <div className="nav-icon">🖼️</div>
              <span style={{ flex: 1, textAlign: 'right' }}>واجهة تسجيل الدخول</span>
            </button>
            <button className={`nav-item ${view === 'reset' ? 'active' : ''}`} onClick={() => { setView('reset'); setSidebarOpen(false); }}>
              <div className="nav-icon">🏭</div>
              <span style={{ flex: 1, textAlign: 'right' }}>إعادة ضبط مصنع للمديرين</span>
            </button>
            <button className="nav-item" onClick={confirmLogout}>
              <div className="nav-icon">🚪</div>
              <span>تسجيل الخروج</span>
            </button>
          </nav>
        </aside>

        <main className="main-content">
          <div className="main-body">
            <header className="top-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                <div>
                  <div className="header-title">
                    {view === 'profile' ? 'بروفايل المطوّر' : view === 'addManager' ? 'إضافة مدير جديد' : view === 'loginui' ? 'واجهة تسجيل الدخول' : 'إعادة ضبط مصنع للمديرين'}
                  </div>
                </div>
              </div>
            </header>
            <div className={`view ${view === 'profile' ? 'active' : ''}`}>
              <div style={{ maxWidth: 560 }}>
                <div className="section-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>اسم المستخدم (يوزر المطوّر)</label>
                      <input className="form-input" value={devUsername} onChange={e => setDevUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="off" />
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, border: '1.5px solid var(--border2)', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--muted)' }}>🔒 تغيير كلمة المرور</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>الباسورد الحالي</label>
                        <input className="form-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>الباسورد الجديد (اختياري)</label>
                        <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--muted)' }}>تأكيد الباسورد</label>
                        <input className="form-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                      </div>
                    </div>
                  </div>

                  {profileErr && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ {profileErr}</div>}
                  <button className="btn-primary" style={{ width: '100%' }} onClick={saveDevProfile} disabled={profileLoading}>
                    {profileLoading ? '⏳ جارٍ الحفظ...' : '💾 حفظ التعديلات'}
                  </button>
                </div>
              </div>
            </div>

            <div className={`view ${view === 'addManager' ? 'active' : ''}`}>
              <div style={{ maxWidth: 560 }}>
                <div className="section-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>اسم المدير</label>
                      <input className="form-input" value={newMgrName} onChange={e => setNewMgrName(e.target.value)} placeholder="اسم المدير" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>رقم التليفون (اختياري)</label>
                      <input className="form-input" value={newMgrPhone} onChange={e => setNewMgrPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>اسم المستخدم (يوزر)</label>
                      <input className="form-input" value={newMgrUsername} onChange={e => setNewMgrUsername(e.target.value)} placeholder="username" dir="ltr" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>كلمة المرور</label>
                      <input className="form-input" type="password" value={newMgrPassword} onChange={e => setNewMgrPassword(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                    </div>
                  </div>

                  {addMgrErr && <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ {addMgrErr}</div>}
                  <button className="btn-primary" style={{ width: '100%' }} onClick={doAddManager} disabled={addMgrLoading}>
                    {addMgrLoading ? '⏳ جارٍ الإنشاء...' : '➕ إنشاء حساب المدير'}
                  </button>
                </div>
              </div>
            </div>

            <div className={`view ${view === 'loginui' ? 'active' : ''}`}>
              <div style={{ maxWidth: 560 }}>
                <div className="section-card-body">
                  {loginSettingsLoading && !loginSettingsLoaded && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>⏳ جارٍ التحميل...</div>
                  )}

                  {(loginSettingsLoaded || !loginSettingsLoading) && (
                    <>
                      {/* أيقونة واجهة تسجيل الدخول */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 14, border: '1.5px solid var(--border2)' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', border: '2px solid var(--border2)', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                          {loginIcon ? <img src={loginIcon} alt="login icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '✈️'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>أيقونة شاشة تسجيل الدخول</div>
                          <label style={{ cursor: 'pointer', display: 'inline-block', background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 700 }}>
                            📷 رفع أيقونة
                            <input type="file" accept="image/*" onChange={handleLoginIconUpload} style={{ display: 'none' }} autoComplete="off" />
                          </label>
                          {loginIcon && <button onClick={() => setLoginIcon('')} style={{ marginRight: 8, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>حذف</button>}
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>أقل من 200KB — PNG أو JPG</div>
                        </div>
                      </div>

                      {/* نصوص الشاشة */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>الكلمة أسفل الأيقونة</label>
                        <input className="form-input" value={loginTitle} onChange={e => setLoginTitle(e.target.value)} placeholder="تسجيل الدخول" autoComplete="off" />
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 5, color: 'var(--muted)' }}>الجملة التوضيحية أسفلها</label>
                        <input className="form-input" value={loginSubtitle} onChange={e => setLoginSubtitle(e.target.value)} placeholder="قم بتسجيل الدخول للوصول إلى لوحة التحكم" autoComplete="off" />
                      </div>

                      {/* صورة الخلفية */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'var(--bg)', borderRadius: 14, border: '1.5px solid var(--border2)', marginBottom: 20 }}>
                        <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', border: '2px solid var(--border2)', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                          {loginBg ? <img src={loginBg} alt="login bg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>خلفية شاشة تسجيل الدخول</div>
                          <label style={{ cursor: 'pointer', display: 'inline-block', background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 700 }}>
                            📷 رفع خلفية
                            <input type="file" accept="image/*" onChange={handleLoginBgUpload} style={{ display: 'none' }} autoComplete="off" />
                          </label>
                          {loginBg && <button onClick={() => setLoginBg('')} style={{ marginRight: 8, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>حذف</button>}
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>أقل من 1MB — تظهر خلف كارت تسجيل الدخول بحجم الشاشة</div>
                        </div>
                      </div>

                      <button className="btn-primary" style={{ width: '100%' }} onClick={saveLoginSettings} disabled={loginSettingsSaving}>
                        {loginSettingsSaving ? '⏳ جارٍ الحفظ...' : '💾 حفظ ونشر لكل من يفتح لينك التطبيق'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={`view ${view === 'reset' ? 'active' : ''}`}>
              <div style={{ background: '#fff5f5', border: '1.5px solid #fecdd3', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>
                <strong style={{ color: 'var(--danger)' }}>⚠️ تحذير:</strong> حذف المدير من هنا يمسح حسابه وكل المشرفين والطيارين التابعين له وكل بياناتهم (سلف، خصومات، مخزن، مرتجعات... إلخ) <strong>نهائياً ولا يمكن التراجع.</strong>
              </div>

              {confirmStep === 'select' && (
                <>
                  {managersLoading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>⏳ جارٍ التحميل...</div>}
                  {!managersLoading && managers.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>لا يوجد مديرون مسجلون</div>
                  )}
                  <div style={{ display: 'grid', gap: 10 }}>
                    {managers.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--white)', border: '1.5px solid var(--border2)', borderRadius: 14, padding: '14px 16px' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{m.name} {!m.active && <span style={{ color: 'var(--danger)', fontSize: 11 }}>(غير مفعّل)</span>}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }} dir="ltr">@{m.username}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                            👥 {m.supervisorsCount} مشرف · ✈️ {m.pilotsCount} طيار · 📅 {fmtDate(m.createdAt)}
                          </div>
                        </div>
                        <button
                          style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                          onClick={() => startDeleteManager(m)}
                        >
                          🗑️ حذف نهائي
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {confirmStep === 'confirm' && selectedManager && (
                <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--danger)' }}>تأكيد نهائي — لا يمكن التراجع!</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
                    سيتم حذف المدير <strong>{selectedManager.name}</strong> (@{selectedManager.username}) وكل {selectedManager.supervisorsCount} مشرف و {selectedManager.pilotsCount} طيار تابعين له، وكل بياناتهم بالكامل.
                  </div>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                      اختر المدير من القائمة لتأكيد الحذف:
                    </label>
                    <select
                      className="form-input"
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                      dir="rtl"
                    >
                      <option value="">-- اختر المدير --</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.username}>{m.name} (@{m.username})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: confirmText === selectedManager.username ? 'var(--danger)' : 'var(--border2)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: (deleteLoading || confirmText !== selectedManager.username) ? 'not-allowed' : 'pointer' }}
                      onClick={doDeleteManager}
                      disabled={deleteLoading || confirmText !== selectedManager.username}
                    >
                      {deleteLoading ? '⏳ جارٍ الحذف...' : '🗑️ نعم، احذف نهائياً'}
                    </button>
                    <button
                      style={{ padding: '14px 20px', borderRadius: 12, border: '1.5px solid var(--border2)', background: 'var(--white)', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => { setConfirmStep('select'); setSelectedManager(null); setConfirmText(''); }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--text)', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}>
          {toast}
        </div>
      )}
    </>
  );
}
