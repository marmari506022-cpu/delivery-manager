import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { api, apiGet, TOKEN_KEY, ROLE_KEY, invalidateAllCache } from '../lib/api';
import { useBackClose } from '../lib/backNav';

// fallback defaults — يتم استبدالها بالبيانات من قاعدة البيانات عند التحميل
const DEFAULT_TYPES = ['pouch','tshirt','jacket','cap','helmet'];
const DEFAULT_UI: Record<string, string> = { pouch:'👜', tshirt:'👕', jacket:'🧥', cap:'🧢', helmet:'⛑️' };
const DEFAULT_UL: Record<string, string> = { pouch:'كيس', tshirt:'تيشيرت', jacket:'جاكيت', cap:'كاب', helmet:'خوذة' };
const fmt = (n: any) => Number(n||0).toLocaleString('en-US');
const fmtEGP = (n: any) => Number(n||0).toLocaleString('en-US') + ' ج';
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'}) : '-';

// مكتبة الأيقونات المدمجة للمعدات
const ICON_LIBRARY: { icon: string; label: string }[] = [
  { icon:'👜', label:'كيس' }, { icon:'👕', label:'تيشيرت' }, { icon:'🧥', label:'جاكيت' },
  { icon:'🧢', label:'كاب' }, { icon:'⛑️', label:'خوذة' }, { icon:'🦺', label:'صدرية' },
  { icon:'👟', label:'حذاء رياضي' }, { icon:'🧤', label:'قفازات' }, { icon:'🧣', label:'وشاح' },
  { icon:'🧦', label:'جوارب' }, { icon:'👔', label:'قميص رسمي' }, { icon:'👒', label:'قبعة' },
  { icon:'🎒', label:'حقيبة ظهر' }, { icon:'💼', label:'حقيبة عمل' }, { icon:'🩺', label:'سماعة طبية' },
  { icon:'🔧', label:'مفتاح ربط' }, { icon:'🔨', label:'مطرقة' }, { icon:'⚙️', label:'تروس' },
  { icon:'🛡️', label:'درع' }, { icon:'📦', label:'صندوق' }, { icon:'🎽', label:'زي رياضي' },
  { icon:'🩳', label:'شورت' }, { icon:'👖', label:'بنطلون' }, { icon:'🥾', label:'حذاء عمل' },
  { icon:'🥋', label:'زي كونج فو' }, { icon:'🩱', label:'بدلة سباحة' }, { icon:'🎿', label:'معدات ثلج' },
  { icon:'🏋️', label:'معدات رياضية' }, { icon:'🪖', label:'خوذة عسكرية' }, { icon:'🧰', label:'صندوق أدوات' },
  { icon:'🔦', label:'مصباح يدوي' }, { icon:'📡', label:'هوائي' }, { icon:'🎧', label:'سماعات' },
  { icon:'📷', label:'كاميرا' }, { icon:'🔭', label:'منظار' }, { icon:'🧪', label:'أنبوب اختبار' },
  { icon:'🚁', label:'مروحية' }, { icon:'✈️', label:'طائرة' }, { icon:'🛩️', label:'طائرة صغيرة' },
  { icon:'🪂', label:'مظلة هبوط' }, { icon:'🎯', label:'هدف' }, { icon:'📻', label:'جهاز راديو' },
];


export default function ManagerPage() {
  const router = useRouter();
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('badaya_mgr_view') || 'dash';
    return 'dash';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [allPilots, setAllPilots] = useState<any[]>([]);
  const [pilotSearch, setPilotSearch] = useState('');
  const [pilotFilterRegion, setPilotFilterRegion] = useState('');
  const [pilotFilterSup, setPilotFilterSup] = useState('');
  const [pilotFilterCompany, setPilotFilterCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [modal, setModal] = useState('');
  const [modalData, setModalData] = useState<any>({});
  const [modalErr, setModalErr] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{msg:string, onConfirm:()=>void} | null>(null);

  // اجعل زر/سحبة الرجوع في الموبايل تُغلق المودال أو القائمة الجانبية بدل الخروج من التطبيق
  useBackClose(!!modal, () => setModal(''));
  useBackClose(sidebarOpen, () => setSidebarOpen(false));

  // ======= إعدادات: نسخة احتياطية =======
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [backupSizes, setBackupSizes] = useState<Record<string,number>>({});
  const [backupTotalRows, setBackupTotalRows] = useState(0);
  const [backupSizeMB, setBackupSizeMB] = useState(0);
  const [backupDbMB, setBackupDbMB] = useState(0);       // حجم Supabase التقديري بالميجا
  const [backupSizesDB, setBackupSizesDB] = useState<Record<string,number>>({});
  const [backupGmailTarget, setBackupGmailTarget] = useState('');
  const [backupEmailSending, setBackupEmailSending] = useState(false);
  const [restoreStep, setRestoreStep] = useState<'idle'|'confirm'|'restoring'|'done'>('idle');
  const [restoreFile, setRestoreFile] = useState<any>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreSizeMB, setRestoreSizeMB] = useState(0);
  const [restoreResult, setRestoreResult] = useState('');

  // ======= إعدادات: إعادة ضبط المصنع =======
  const RESET_OPTIONS = [
    { key:'funding',        label:'التمويل',             warn:false },
    { key:'requests',       label:'الطلبات',             warn:false },
    { key:'inventory',      label:'المخزن وسجله',        warn:false },
    { key:'inventory_log',  label:'سجل المخزن فقط',      warn:false },
    { key:'balance',        label:'الرصيد',              warn:false },
    { key:'companies',      label:'الشركات',             warn:true  },
    { key:'regions',        label:'المناطق',             warn:true  },
    { key:'equipment_types',label:'أنواع المعدات',       warn:true  },
  ];
  const [resetChecked, setResetChecked] = useState<string[]>([]);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'select'|'confirm-backup'|'confirm-final'>('select');

  // ======= إعدادات: بروفايل الأدمن =======
  const [adminProfile, setAdminProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('badaya_admin_profile'); return s ? JSON.parse(s) : { name:'', username:'', phone:'' }; } catch {}
    }
    return { name:'', username:'', phone:'' };
  });
  const [adminOriginalProfile, setAdminOriginalProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('badaya_admin_profile'); return s ? JSON.parse(s) : { name:'', username:'', phone:'' }; } catch {}
    }
    return { name:'', username:'', phone:'' };
  });
  const [adminOldPass, setAdminOldPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string|null>(null);
  function toggleSettingsSection(key: string) { setSettingsSection(p => { const next = p === key ? null : key; if (next === 'dbsize') setTimeout(() => loadDbSize(), 0); return next; }); }
  const [adminProfileErr, setAdminProfileErr] = useState('');
  const [adminLogo, setAdminLogo] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('badaya_admin_logo') || '';
    return '';
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // الإجراءات السريعة — قابلة للتخصيص
  const ALL_ACTIONS = [
    { id:'addBalance',   icon:'💼', label:'إيداع وسحب رصيد',   action:() => openModal('addBalance') },
    { id:'addFunding',   icon:'💰', label:'إرسال تمويل',        action:() => openModal('addFunding') },
    { id:'balanceLog',   icon:'📋', label:'سجل الرصيد',         action:() => { loadBalanceLog(); openModal('balanceLogModal'); } },
    { id:'addInventory', icon:'📦', label:'إضافة مخزون',        action:() => openModal('addInventory') },
    { id:'sendInventory',icon:'📤', label:'إرسال مخزون',        action:() => { loadInvPrices(); openModal('sendInventory'); } },
    { id:'requests',     icon:'🔔', label:'الطلبات المعلقة',    action:() => { loadRequests('', { status: 'pending', type: '' }); } },
    { id:'supReturns',   icon:'↩️', label:'مرتجعات المشرفين',    action:() => loadSupervisorReturns() },
    { id:'companies',    icon:'🏢', label:'الشركات',             action:() => switchView('companies') },
    { id:'supervisors',  icon:'👮', label:'المشرفون',            action:() => switchView('supervisors') },
    { id:'pilots',       icon:'✈️', label:'الطيارون',            action:() => switchView('pilots-all') },
    { id:'inventory',    icon:'📦', label:'المخزن',              action:() => switchView('inventory') },
    { id:'finance',      icon:'💰', label:'العمليات المالية',   action:() => switchView('finance') },
    { id:'regions',      icon:'🗺️', label:'إدارة المناطق',      action:() => openModal('manageRegions') },
    { id:'settings',     icon:'⚙️', label:'الإعدادات',          action:() => switchView('settings') },
  ];
  const DEFAULT_QUICK = ['addFunding','requests','addBalance','sendInventory','supReturns'];
  const [quickActionIds, setQuickActionIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('badaya_quick_actions'); return s ? JSON.parse(s) : DEFAULT_QUICK; } catch { return DEFAULT_QUICK; }
  });
  function addQuickAction(id: string) {
    if (quickActionIds.includes(id)) return;
    const next = [...quickActionIds, id];
    setQuickActionIds(next);
    localStorage.setItem('badaya_quick_actions', JSON.stringify(next));
  }
  function removeQuickAction(id: string) {
    const next = quickActionIds.filter(x => x !== id);
    setQuickActionIds(next);
    localStorage.setItem('badaya_quick_actions', JSON.stringify(next));
  }
  const [pilotDetail, setPilotDetail] = useState<any>(null);
  const [supDetail, setSupDetail] = useState<any>(null);
  const [supDetailTab, setSupDetailTab] = useState('pilots');
  const [supRecFilter, setSupRecFilter] = useState({ kind: '', dateFrom: '', dateTo: '', pilot: '' });
  const [supFundFilter, setSupFundFilter] = useState({ dateFrom: '', dateTo: '' });
  const [supEquipCost, setSupEquipCost] = useState<any[]>([]);
  const [supEquipCostLoading, setSupEquipCostLoading] = useState(false);
  const [supLoading, setSupLoading] = useState(false);
  const [invHistory, setInvHistory] = useState<any[]>([]);
  const [invHistFilter, setInvHistFilter] = useState({ type: '', dateFrom: '', dateTo: '' });
  const [invLog, setInvLog] = useState<any[]>([]);
  const [invLogFilter, setInvLogFilter] = useState({ companyId: '', action: '', dateFrom: '', dateTo: '' });
  const [companyInvSummary, setCompanyInvSummary] = useState<Record<string, any>>({});
  const [selectedCompanyInv, setSelectedCompanyInv] = useState('');
  const [dbSizeData, setDbSizeData] = useState<any>(null);
  const [dbSizeLoading, setDbSizeLoading] = useState(false);
  const [fundingHistory, setFundingHistory] = useState<any[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [balanceLog, setBalanceLog] = useState<any[]>([]);
  const [balanceLogLoading, setBalanceLogLoading] = useState(false);
  const [balanceLogFilter, setBalanceLogFilter] = useState({ dateFrom: '', dateTo: '', type: '' });
  const [supFundLog, setSupFundLog] = useState<any[]>([]);
  const [supFundLogLoading, setSupFundLogLoading] = useState(false);
  const [supFundLogFilter, setSupFundLogFilter] = useState({ search: '', supervisorId: '', dateFrom: '', dateTo: '' });
  const [requests, setRequests] = useState<any[]>([]);
  const [reqFilter, setReqFilter] = useState({ status: 'pending', type: '', supervisor: '', search: '', dateFrom: '', dateTo: '' });
  const [supReturns, setSupReturns] = useState<any[]>([]);
  const [supReturnsLoading, setSupReturnsLoading] = useState(false);
  const [mgrReturnLog, setMgrReturnLog] = useState<any[]>([]);
  const [mgrReturnLogLoading, setMgrReturnLogLoading] = useState(false);
  const [mgrReturnLogFilter, setMgrReturnLogFilter] = useState({ status: '', supervisorId: '' });
  const [invPrices, setInvPrices] = useState<Record<string, any[]>>({});
  const [invDetailModal, setInvDetailModal] = useState<{type:string, label:string, icon:string, prices:any[], source:'store'|'company', companyName?:string} | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [showSuspendedTypes, setShowSuspendedTypes] = useState(false);
  const [eqTypeFilterCompany, setEqTypeFilterCompany] = useState<string>('');

  // أنواع المعدات الديناميكية — تُحدَّث من قاعدة البيانات
  // TYPES العام: الافتراضية + كل الأنواع من equipmentTypes + كل الأنواع اللي فيها بيانات فعلية في أي شركة
  const TYPES = (() => {
    const seen = new Set<string>(DEFAULT_TYPES);
    const result = [...DEFAULT_TYPES];
    // كل الأنواع من الـ DB
    equipmentTypes.forEach((t:any) => {
      if (!seen.has(t.key)) { seen.add(t.key); result.push(t.key); }
    });
    // كل الأنواع اللي فيها بيانات فعلية في أي شركة
    Object.values(companyInvSummary).forEach((c: any) => {
      Object.keys(c.inventory || {}).forEach((k: string) => {
        const d = c.inventory[k];
        if (!seen.has(k) && (d.total > 0 || d.remaining > 0)) { seen.add(k); result.push(k); }
      });
    });
    return result;
  })();

  // أنواع مخزن شركة معينة: الافتراضية + كل الأنواع من equipmentTypes + كل الأنواع اللي فيها بيانات في الشركة
  function getTypesForCompany(companyId: string): string[] {
    const seen = new Set<string>(DEFAULT_TYPES);
    const result = [...DEFAULT_TYPES];
    // كل الأنواع من الـ DB (عام أو مخصص لهذه الشركة)
    equipmentTypes
      .filter((t:any) => !t.company_id || t.company_id === companyId)
      .forEach((t:any) => {
        if (!seen.has(t.key)) { seen.add(t.key); result.push(t.key); }
      });
    // كل الأنواع اللي فيها بيانات فعلية في مخزون هذه الشركة (بغض النظر عن equipment_types)
    const compInv = companyInvSummary[companyId]?.inventory || {};
    Object.entries(compInv).forEach(([k, d]: [string, any]) => {
      if (!seen.has(k) && ((d as any).total > 0 || (d as any).remaining > 0)) { seen.add(k); result.push(k); }
    });
    return result;
  }
  const UI: Record<string,string> = {
    ...DEFAULT_UI,
    ...Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.icon]))
  };
  const UL: Record<string,string> = {
    ...DEFAULT_UL,
    ...Object.fromEntries(equipmentTypes.map((t:any) => [t.key, t.label]))
  };

  // helper: يعرض الأيقونة كـ <img> لو كانت base64/url، أو كـ emoji مباشرةً
  function renderIcon(icon: string, size: number = 36): JSX.Element {
    if (!icon) return <span style={{fontSize: Math.round(size * 0.75)}}>📦</span>;
    if (icon.startsWith('data:') || icon.startsWith('http'))
      return <img src={icon} style={{width: size, height: size, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle'}} />;
    return <span style={{fontSize: Math.round(size * 0.75)}}>{icon}</span>;
  }

  // helper: يرجع emoji آمن للعرض في <option> (لا يعرض base64)
  function iconText(icon: string): string {
    if (!icon) return '📦';
    if (icon.startsWith('data:') || icon.length > 10) return '🖼️';
    return icon;
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    if (!token || role !== 'manager') { router.replace('/'); return; }
    if (view === 'pilots-all') loadAllPilots();
    init();
    loadCompanyInvSummary();
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800); }
  function openModal(name: string, data: any = {}) { setModal(name); setModalData(data); setModalErr(''); }
  function closeModal() { setModal(''); setModalData({}); setModalErr(''); }
  function askConfirm(msg: string, onConfirm: () => void) { setConfirmDialog({ msg, onConfirm }); }
  function closeConfirm() { setConfirmDialog(null); }

  // ======= وظائف الإعدادات =======
  async function loadBackup() {
    setBackupLoading(true); setBackupData(null);
    const res = await apiGet('backupData');
    setBackupLoading(false);
    if (res.success) {
      setBackupData(res.data);
      setBackupSizes(res.sizes||{});
      setBackupSizesDB(res.sizesDB||{});
      setBackupTotalRows(res.totalRows||0);
      setBackupDbMB(res.totalDbMB||0);
      const jsonStr = JSON.stringify(res.data);
      setBackupSizeMB(parseFloat((new Blob([jsonStr]).size / (1024*1024)).toFixed(2)));
    }
    else showToast('❌ فشل تحميل البيانات: ' + (res.message||''));
  }

  function downloadBackupJSON() {
    if (!backupData) return;
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `badaya_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('✅ تم تنزيل ملف النسخة الاحتياطية');
  }

  async function sendBackupByEmail() {
    if (!backupGmailTarget || !backupData) { showToast('❌ أدخل الإيميل أولاً'); return; }
    if (!/\S+@\S+\.\S+/.test(backupGmailTarget)) { showToast('❌ الإيميل غير صحيح'); return; }
    setBackupEmailSending(true);
    // نفتح Gmail Compose مع البيانات في الـ body (JSON مضغوط)
    const subject = encodeURIComponent(`نسخة احتياطية - بداية - ${new Date().toLocaleDateString('ar-EG')}`);
    const body = encodeURIComponent(
      `مرفق بيانات النسخة الاحتياطية:\n\n` +
      `التاريخ: ${backupData.exportedAt}\n` +
      `إجمالي السجلات: ${backupTotalRows}\n\n` +
      `⚠️ هذا الملف JSON — يرجى نسخه وحفظه:\n\n` +
      JSON.stringify(backupData).slice(0, 2000) + (JSON.stringify(backupData).length > 2000 ? '...\n[مقتطع - نزّل الملف الكامل]' : '')
    );
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(backupGmailTarget)}&su=${subject}&body=${body}`, '_blank');
    // تنزيل الملف الكامل في نفس الوقت
    downloadBackupJSON();
    setBackupEmailSending(false);
    showToast('✅ تم فتح Gmail - انسخ الملف المنزّل كمرفق');
  }

  function handleRestoreFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreSizeMB(parseFloat((file.size / (1024*1024)).toFixed(2)));
    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.tables) { showToast('❌ الملف غير صحيح — يجب أن يكون ملف نسخة بداية'); return; }
        setRestoreFile(parsed);
        setRestoreStep('confirm');
      } catch { showToast('❌ الملف تالف أو غير صحيح'); }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  }

  async function doRestore() {
    if (!restoreFile?.tables) return;
    setRestoreStep('restoring');
    const res = await api('restoreBackup', { tables: restoreFile.tables });
    if (res.success) {
      invalidateAllCache();
      setRestoreResult('✅ ' + (res.message||'تمت الاستعادة بنجاح'));
      setRestoreStep('done');
      init(false);
    } else {
      setRestoreResult('❌ ' + (res.message||'فشلت الاستعادة'));
      setRestoreStep('done');
    }
  }

  function toggleResetCheck(key: string) {
    setResetChecked(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  }

  async function doReset() {
    // تجميع كل الجداول — inventory_log يأتي تلقائياً مع inventory
    let tables = [...resetChecked];
    if (tables.includes('inventory') && !tables.includes('inventory_log')) tables.push('inventory_log');
    setResetLoading(true);
    const res = await api('resetFactory', { tables });
    setResetLoading(false);
    if (res.success) {
      invalidateAllCache();
      showToast('✅ ' + (res.message||'تمت إعادة الضبط'));
      setResetChecked([]); setResetStep('select');
      init(false);
    } else {
      showToast('❌ ' + (res.message||'فشلت العملية'));
      setResetStep('select');
    }
  }

  async function loadAdminProfile() {
    const res = await apiGet('getAdminProfile');
    if (res.success) {
      const p = { name: res.name||'', username: res.username||'', phone: res.phone||'' };
      setAdminProfile(p);
      setAdminOriginalProfile(p);
      localStorage.setItem('badaya_admin_profile', JSON.stringify(p));
    }
  }

  async function saveAdminProfile() {
    if (!adminProfile.name || !adminProfile.username) { setAdminProfileErr('الاسم واليوزر مطلوبان'); return; }
    const hasProfileChange =
      adminProfile.name.trim() !== adminOriginalProfile.name.trim() ||
      adminProfile.username.trim() !== adminOriginalProfile.username.trim() ||
      adminProfile.phone.trim() !== adminOriginalProfile.phone.trim();
    const hasPassChange = !!adminNewPass;
    if (!hasProfileChange && !hasPassChange) { setAdminProfileErr('لا توجد تعديلات للحفظ'); return; }
    if (!adminOldPass) { setAdminProfileErr('يجب إدخال كلمة المرور الحالية لحفظ أي تعديل'); return; }
    if (hasPassChange && adminNewPass !== adminConfirmPass) { setAdminProfileErr('كلمة المرور الجديدة غير متطابقة'); return; }
    if (hasPassChange && adminNewPass.length < 4) { setAdminProfileErr('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
    setAdminProfileLoading(true); setAdminProfileErr('');
    const res = await api('updateAdminProfile', {
      name: adminProfile.name, username: adminProfile.username, phone: adminProfile.phone,
      oldPassword: adminOldPass, newPassword: adminNewPass || undefined,
    });
    setAdminProfileLoading(false);
    if (res.success) {
      if (res.token) localStorage.setItem(TOKEN_KEY, res.token);
      const p = { name: adminProfile.name, username: adminProfile.username, phone: adminProfile.phone };
      setAdminOriginalProfile(p);
      localStorage.setItem('badaya_admin_profile', JSON.stringify(p));
      setAdminOldPass(''); setAdminNewPass(''); setAdminConfirmPass('');
      showToast('✅ تم تحديث البروفايل بنجاح');
    } else { setAdminProfileErr(res.message||'خطأ'); }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200*1024) { showToast('❌ حجم الصورة كبير — أقل من 200KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setAdminLogo(data);
      localStorage.setItem('badaya_admin_logo', data);
      showToast('✅ تم رفع اللوجو');
    };
    reader.readAsDataURL(file);
  }

  async function init(showLoading = true) {
    if (showLoading) setLoading(true);
    const [statsRes, supRes, regRes, compRes, fundRes, eqTypesRes, profileRes, invPricesRes] = await Promise.all([
      apiGet('getManagerStats'), apiGet('getSupervisors'), apiGet('getRegions'), apiGet('getCompanies'), apiGet('getAllFunding'), apiGet('getEquipmentTypes'), apiGet('getAdminProfile'), apiGet('getInventoryPrices'),
    ]);
    if (!statsRes.success) { setLoading(false); router.replace('/'); return; }
    setStats(statsRes); setSupervisors(supRes.data || []); setRegions(regRes.data || []); setCompanies(compRes.data || []);
    setSupFundLog(fundRes.data || []);
    if (eqTypesRes.success) setEquipmentTypes(eqTypesRes.data || []);
    if (invPricesRes.success) setInvPrices(invPricesRes.data || {});
    if (profileRes.success) {
      const p = { name: profileRes.name||'', username: profileRes.username||'', phone: profileRes.phone||'' };
      setAdminProfile(p);
      setAdminOriginalProfile(p);
      localStorage.setItem('badaya_admin_profile', JSON.stringify(p));
    }
    setLoading(false);
  }

  async function loadAllPilots() {
    const res = await apiGet('getAllPilotsWithDetails');
    setAllPilots(res.data || []);
  }

  async function openSupDetail(supId: string) {
    setSupLoading(true); openModal('supDetail');
    const res = await apiGet('getSupervisorWithPilots', { supervisorId: supId });
    setSupDetail(res); setSupLoading(false);
  }

  async function openPilotDetail(pilotId: string) {
    openModal('pilotDetail');
    const res = await apiGet('getPilotDetails', { pilotId });
    setPilotDetail(res);
  }

  async function doAddFunding() {
    if (!modalData.supId || !modalData.amount) { setModalErr('اختر المشرف وأدخل المبلغ'); return; }
    askConfirm('هل تريد إرسال التمويل؟', async () => {
    setModalLoading(true);
    const res = await api('addFunding', { supervisorId: modalData.supId, amount: Number(modalData.amount), note: modalData.note || '', sentBy: 'المدير' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إرسال التمويل بنجاح'); closeModal(); init(false);
    });
  }

  async function doAddBalance() {
    if (!modalData.amount) { setModalErr('أدخل المبلغ'); return; }
    const isDeposit = (modalData.direction || 'in') === 'in';
    askConfirm(isDeposit ? 'هل تريد إيداع الرصيد؟' : 'هل تريد سحب الرصيد؟', async () => {
    setModalLoading(true);
    const res = await api('addManagerBalance', { amount: Number(modalData.amount), note: modalData.note || '', direction: modalData.direction || 'in' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تسجيل الرصيد'); closeModal(); init(false);
    });
  }

  async function doAddInventory() {
    if (!modalData.companyId) { setModalErr("يجب تحديد الشركة أولاً"); return; }
    if (!modalData.type || !modalData.qty || !modalData.price) { setModalErr('أدخل النوع والكمية والسعر'); return; }
    if (!modalData.condition) { setModalErr('يجب تحديد حالة المعدة'); return; }
    askConfirm('هل تريد إضافة المخزون؟', async () => {
    setModalLoading(true);
    const res = await api('addManagerInventory', { type: modalData.type, qty: Number(modalData.qty), price: Number(modalData.price), profitMargin: Number(modalData.profitMargin || 0), profitType: modalData.profitType || 'percent', companyId: modalData.companyId, condition: modalData.condition || 'new' });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إضافة المخزون'); closeModal(); init(false);
    });
  }

  async function doReturnCompanyInventory() {
    if (!modalData.retCompanyId) { setModalErr('يجب تحديد الشركة'); return; }
    if (!modalData.retType)      { setModalErr('يجب تحديد نوع المعدة'); return; }
    if (!modalData.retQty || Number(modalData.retQty) <= 0) { setModalErr('أدخل كمية صحيحة'); return; }
    if (!modalData.retCondition)  { setModalErr('يجب تحديد حالة المعدة'); return; }
    if (!modalData.retReason)    { setModalErr('يجب كتابة سبب المرتجع'); return; }
    setModalLoading(true);
    const res = await api('returnCompanyInventory', {
      companyId: modalData.retCompanyId,
      type: modalData.retType,
      qty: Number(modalData.retQty),
      condition: modalData.retCondition,
      reason: modalData.retReason,
      note: modalData.retNote || ''
    });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تسجيل المرتجع');
    closeModal();
    loadCompanyInvSummary();
  }

      async function doSendInventory() {
    if (!modalData.companyId) { setModalErr('يجب تحديد الشركة أولاً'); return; }
    if (!modalData.supId || !modalData.type || !modalData.qty) { setModalErr('أكمل جميع الحقول'); return; }
    askConfirm('هل تريد إرسال المخزون؟', async () => {
    const prices = (invPrices[modalData.type] || []).filter((pr: any) => pr.company_id === modalData.companyId);
    if (prices.length > 1 && modalData.selectedPrice === undefined) { setModalErr('يوجد أكثر من سعر لهذا النوع — يرجى تحديد السعر أولاً'); return; }
    setModalLoading(true);
    const items: any = {};
    items[modalData.type] = {
      qty: Number(modalData.qty),
      ...(modalData.selectedPrice !== undefined ? { selectedPrice: Number(modalData.selectedPrice), selectedCompanyId: modalData.companyId, selectedCondition: modalData.selectedCondition || '' } : {})
    };
    const res = await api('sendInventoryToSupervisor', { supervisorId: modalData.supId, companyId: modalData.companyId, items });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم الإرسال بنجاح'); closeModal(); init(false);
    });
  }

  async function doRespondRequest(reqId: string, status: string) {
    const confirmMsg = status === 'approved' ? 'هل تريد قبول هذا الطلب؟' : 'هل تريد رفض هذا الطلب؟';
    askConfirm(confirmMsg, async () => {
    const req = requests.find((r: any) => r.id === reqId);

    // طلبات المرتجع من المشرف — توجيه لنقطة نهاية مختلفة
    if (req && req.type === 'supervisor_return') {
      const endpoint = status === 'approved' ? 'approveSupervisorReturn' : 'rejectSupervisorReturn';
      const res = await api(endpoint, { returnRequestId: reqId });
      if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
      showToast(status === 'approved' ? '✅ تمت الموافقة ونقل المعدات للمخزن' : '❌ تم رفض الطلب');
      setRequests((prev: any[]) => prev.map((r: any) => r.id === reqId ? { ...r, status } : r));
      init(false);
      return;
    }

    if (status === 'approved') {
      if (req && req.type !== 'funding') {
        const prices = invPrices[req.type] || [];
        if (prices.length > 1 && modalData[`selectedPrice_${reqId}`] === undefined) {
          showToast('❌ يوجد أكثر من سعر لهذا النوع — يرجى تحديد السعر أولاً');
          return;
        }
      }
    }
    const selectedPrice = modalData[`selectedPrice_${reqId}`];
    const selectedCompanyId = modalData[`selectedCompanyId_${reqId}`];
    const res = await api('respondRequest', {
      requestId: reqId, status,
      discount: Number(modalData.discount || 0), discountType: modalData.discountType || 'fixed',
      ...(selectedPrice !== undefined ? { selectedPrice: Number(selectedPrice), selectedCompanyId: selectedCompanyId || '' } : {})
    });
    if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
    showToast(status === 'approved' ? '✅ تمت الموافقة' : '❌ تم الرفض');
    // نحدّث حالة الطلب محليًا بدل إعادة الجلب بفلتر "معلق" فقط،
    // حتى يبقى الطلب ظاهرًا في السجل بحالته الجديدة (مقبول/مرفوض) ولا يختفي
    setRequests((prev: any[]) => prev.map((r: any) => r.id === reqId ? { ...r, status } : r));
    loadInvPrices();
    init(false);
    });
  }

  async function doUpdateSupervisor() {
    if (!modalData.editName) { setModalErr('الاسم مطلوب'); return; }
    setModalLoading(true);
    const res = await api('updateSupervisor', {
      supervisorId: supDetail.supervisor?.id,
      name: modalData.editName, phone: modalData.editPhone || '',
      regions: modalData.editRegions || [],
      companyIds: modalData.editCompanyIds || [],
      baseSalary: modalData.editBaseSalary || 0,
    });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تحديث بيانات المشرف');
    const supId = supDetail.supervisor?.id;
    closeModal();
    // تحديث بيانات المشرفين وقائمة الطيارين معاً ثم إعادة فتح تفاصيل المشرف
    await Promise.all([init(false), loadAllPilots()]);
    // reload supDetail
    setSupLoading(true); openModal('supDetail');
    const r = await apiGet('getSupervisorWithPilots', { supervisorId: supId });
    setSupDetail(r); setSupLoading(false);
  }

  async function doAddCompany() {
    if (!modalData.companyName) { setModalErr('أدخل اسم الشركة'); return; }
    setModalLoading(true);
    const res = await api('addCompany', { name: modalData.companyName });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إضافة الشركة'); closeModal(); init(false);
  }

  async function doDeleteCompany(companyId: string) {
    askConfirm('هل تريد حذف هذه الشركة؟', async () => {
      const res = await api('deleteCompany', { companyId });
      if (!res.success) { showToast('❌ حدث خطأ'); return; }
      showToast('✅ تم حذف الشركة'); init(false);
    });
  }

  async function doAssignCompany(targetId: string, targetType: string, companyId: string, action?: string) {
    const res = await api('assignCompany', { targetId, targetType, companyId, action: action || 'set' });
    if (!res.success) { showToast('❌ حدث خطأ'); return; }
    showToast('✅ تم تعيين الشركة'); closeModal(); init(false);
  }

  async function doAddSupervisor() {
    if (!modalData.name || !modalData.username || !modalData.password) { setModalErr('أدخل الاسم ومعلومات الدخول'); return; }
    askConfirm('هل تريد إضافة هذا المشرف؟', async () => {
    setModalLoading(true);
    const res = await api('addUser', { name: modalData.name, username: modalData.username, password: modalData.password, role: 'supervisor', regions: modalData.regions || [], phone: modalData.phone || '', baseSalary: Number(modalData.baseSalary || 0), companyIds: modalData.companyIds || [] });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم إضافة المشرف'); closeModal(); init(false);
    });
  }

  async function doAddRegion() {
    if (!modalData.regionName) { setModalErr('أدخل اسم المنطقة'); return; }
    setModalLoading(true);
    const res = await api('addRegion', { name: modalData.regionName });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تمت إضافة المنطقة');
    const regRes = await apiGet('getRegions');
    setRegions(regRes.data || []); setModalData((p:any) => ({...p, regionName: '', editRegionId: null, editRegionName: ''}));
  }

  async function doUpdateRegion() {
    if (!modalData.editRegionName?.trim()) { setModalErr('أدخل الاسم الجديد'); return; }
    setModalLoading(true);
    const res = await api('updateRegion', { regionId: modalData.editRegionId, newName: modalData.editRegionName.trim() });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم تعديل المنطقة');
    const regRes = await apiGet('getRegions');
    setRegions(regRes.data || []); setModalData((p:any) => ({...p, editRegionId: null, editRegionName: ''}));
  }

  async function doDeleteRegion(regionId: string) {
    setModalLoading(true);
    const res = await api('deleteRegion', { regionId });
    setModalLoading(false);
    if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
    showToast('✅ تم حذف المنطقة');
    const regRes = await apiGet('getRegions');
    setRegions(regRes.data || []);
  }

  async function doToggleRegion(regionId: string, active: boolean) {
    setModalLoading(true);
    await api('toggleRegion', { regionId, active });
    setModalLoading(false);
    showToast(active ? '✅ تم تفعيل المنطقة' : '⏸ تم إيقاف المنطقة');
    const regRes = await apiGet('getRegions');
    setRegions(regRes.data || []);
  }

  async function loadRequests(type: string = '', extraFilter: Record<string,string> = {}) {
    const filter = { ...reqFilter, type: type || reqFilter.type, ...extraFilter };
    setReqFilter(filter as any);
    const res = await apiGet('getRequests', filter);
    setRequests(res.data || []);
    loadInvPrices();
    openModal('requests', { reqType: type });
  }

  async function reloadRequests(overrideFilter?: Record<string,string>) {
    const filter = overrideFilter || reqFilter;
    const res = await apiGet('getRequests', filter);
    setRequests(res.data || []);
  }

  async function loadInvPrices() {
    const res = await apiGet('getInventoryPrices', {});
    setInvPrices(res.data || {});
  }

  // إجمالي قيمة كل المخزن الرئيسي — مشتق دائماً من مخزن الشركات (companyInvSummary) — مشتق دائماً من مخزن الشركات (companyInvSummary)
  // نفس مصدر "إجمالي مخزن الشركات" بالضبط، حتى يتطابق الرقمان دائماً تلقائياً
  // بدون أي طلب بيانات منفصل (نفس العلاقة المطبَّقة في صفحة المشرف).
  function calcTotalStoreValue(): number {
    return calcAllCompaniesTotalValue();
  }

  // حساب قيمة نوع معين في شركة (priceBatches إن وُجد، وإلا remaining × lastPrice)
  function calcCompanyTypeValue(inv: any, type: string): number {
    const d = inv?.[type];
    if (!d) return 0;
    if (d.priceBatches && d.priceBatches.length > 0) {
      return d.priceBatches.reduce((s: number, p: any) => s + ((Number(p.remaining)||0) * (Number(p.price)||0)), 0);
    }
    return (Number(d.remaining)||0) * (Number(d.lastPrice)||0);
  }

  // إجمالي قيمة شركة — تأخذ companyId لتحسب فقط الأنواع المخصصة لها
  function calcCompanyTotalValue(inv: any, companyId?: string): number {
    const types = companyId ? getTypesForCompany(companyId) : TYPES;
    return types.reduce((sum, t) => sum + calcCompanyTypeValue(inv, t), 0);
  }

  // تجميع بيانات نوع معدة معين عبر كل مخازن الشركات (للعرض في بطاقات إجمالي مخزن الشركات)
  function calcAllCompaniesTypeStats(type: string) {
    let remaining = 0, total = 0, sent = 0, companyReturned = 0;
    const cc = { new: 0, good: 0, damaged: 0 };
    Object.values(companyInvSummary).forEach((c: any) => {
      const d = c?.inventory?.[type];
      if (!d) return;
      remaining += Number(d.remaining) || 0;
      total += Number(d.total) || 0;
      sent += Number(d.sent) || 0;
      companyReturned += Number(d.companyReturned) || 0;
      const dcc = d.conditionCounts || {};
      cc.new += Number(dcc.new) || 0;
      cc.good += Number(dcc.good) || 0;
      cc.damaged += Number(dcc.damaged) || 0;
    });
    return { remaining, total, sent, companyReturned, conditionCounts: cc };
  }

  // إجمالي قيمة نوع معدة عبر كل الشركات
  function calcAllCompaniesTypeValue(type: string): number {
    return Object.values(companyInvSummary).reduce((sum: number, c: any) => sum + calcCompanyTypeValue(c.inventory, type), 0);
  }

  // إجمالي قيمة مخازن كل الشركات
  function calcAllCompaniesTotalValue(): number {
    return Object.values(companyInvSummary).reduce((sum: number, c: any) => sum + calcCompanyTotalValue(c.inventory, c.companyId), 0);
  }

  // الكمية المتاحة من نوع معدة معين لشركة معينة في مخزون الأسعار (invPrices)
  function getCompanyTypeQty(companyId: string, type: string): number {
    if (!companyId || !type) return 0;
    return (invPrices[type] || []).filter((pr: any) => pr.company_id === companyId).reduce((s: number, pr: any) => s + (Number(pr.remaining) || 0), 0);
  }

  // فتح modal تفاصيل نوع في المخزن الرئيسي
  function openInvTypeDetail(type: string) {
    const prices = invPrices[type] || [];
    setInvDetailModal({ type, label: UL[type]||type, icon: UI[type]||'📦', prices, source: 'store' });
  }

  // فتح modal تفاصيل نوع في مخزن شركة
  function openCompanyInvTypeDetail(type: string, inv: any, companyName: string) {
    const d = inv?.[type] || { remaining: 0, total: 0, sent: 0, returned: 0, companyReturned: 0, lastPrice: 0, priceBatches: [] };
    // استخدام priceBatches إن وُجدت (بغض النظر عن remaining)، وإلا نبني من lastPrice
    let prices: any[] = [];
    if (d.priceBatches && d.priceBatches.length > 0) {
      prices = d.priceBatches;
    } else {
      // نبني صف واحد من البيانات الإجمالية حتى لو remaining=0
      prices = [{ price: Number(d.lastPrice)||0, remaining: Number(d.remaining)||0, total: Number(d.total)||0, sent: Number(d.sent)||0, returned: Number(d.returned)||0, companyReturned: Number(d.companyReturned)||0 }];
    }
    setInvDetailModal({ type, label: UL[type]||type, icon: UI[type]||'📦', prices, source: 'company', companyName });
  }

  async function loadSupervisorReturns() {
    setSupReturnsLoading(true);
    const res = await apiGet('getPendingSupervisorReturns');
    setSupReturns(res.data || []);
    setSupReturnsLoading(false);
    openModal('supervisorReturns');
  }

  async function doApproveSupervisorReturn(id: string) {
    askConfirm('هل تريد قبول طلب المرتجع ونقل المعدات لمخزن المدير؟', async () => {
    const res = await api('approveSupervisorReturn', { returnRequestId: id });
    if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
    showToast('✅ تمت الموافقة ونقل المعدات للمخزن'); loadSupervisorReturns();
    });
  }

  async function doRejectSupervisorReturn(id: string) {
    askConfirm('هل تريد رفض هذا الطلب؟ سيتم فك تجميد المعدات لدى المشرف.', async () => {
    const res = await api('rejectSupervisorReturn', { returnRequestId: id });
    if (!res.success) { showToast('❌ ' + (res.message || 'خطأ')); return; }
    showToast('❌ تم رفض الطلب وفك تجميد المعدات'); loadSupervisorReturns();
    });
  }

  async function loadManagerReturnLog(filter: { status?: string, supervisorId?: string } = {}) {
    setMgrReturnLogLoading(true);
    const f = { ...mgrReturnLogFilter, ...filter };
    setMgrReturnLogFilter(f as any);
    const res = await apiGet('getManagerReturnRequestsLog', f);
    setMgrReturnLog(res.data || []);
    setMgrReturnLogLoading(false);
  }

  async function loadDbSize() {
    setDbSizeLoading(true);
    const res = await apiGet('getDbSize');
    setDbSizeLoading(false);
    if (res.success) { setDbSizeData(res); }
  }

  async function loadFundingHistory() {
    const res = await apiGet('getAllFunding');
    setFundingHistory(res.data || []); openModal('fundingHistory');
  }

  async function loadSupFundLog(filter?: any) {
    setSupFundLogLoading(true);
    const f = filter || supFundLogFilter;
    const params: any = {};
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    const res = await apiGet('getAllFunding', params);
    setSupFundLog(res.data || []);
    setSupFundLogLoading(false);
  }

  async function loadBalanceLog(filter?: any) {
    setBalanceLogLoading(true);
    const f = filter || balanceLogFilter;
    const params: any = {};
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    const [balRes, fundRes] = await Promise.all([
      apiGet('getBalanceHistory', params),
      apiGet('getAllFunding', params),
    ]);
    const balEntries = (balRes.data || []).map((b: any) => ({
      ...b,
      _type: 'balance',
      _direction: b.direction,
      _label: b.direction === 'in' ? 'إيداع رصيد' : 'سحب رصيد',
    }));
    const fundEntries = (fundRes.data || []).map((f: any) => ({
      ...f,
      _type: 'funding',
      _direction: 'out',
      _label: 'تمويل مشرف',
    }));
    const merged = [...balEntries, ...fundEntries].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setBalanceLog(merged);
    setBalanceLogLoading(false);
  }

  async function loadBalanceHistory() {
    const res = await apiGet('getBalanceHistory');
    setBalanceHistory(res.data || []); openModal('balanceHistory');
  }

  async function loadInvHistory() {
    const res = await apiGet('getManagerInventoryHistory', invHistFilter);
    setInvHistory(res.data || []);
  }

  async function loadInvLog() {
    const res = await apiGet('getInventoryLog', invLogFilter);
    setInvLog(res.data || []);
  }

  async function loadCompanyInvSummary() {
    const res = await apiGet('getCompanyInventorySummary', {});
    setCompanyInvSummary(res.data || {});
  }

  function doLogout() { invalidateAllCache(); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); localStorage.removeItem('badaya_admin_profile'); router.push('/'); }
  function confirmLogout() { askConfirm('هل تريد تسجيل الخروج؟', doLogout); }
  function switchView(name: string) { setView(name); localStorage.setItem('badaya_mgr_view', name); setSidebarOpen(false); if (name === 'pilots-all') loadAllPilots(); if (name === 'supervisors') loadSupFundLog(); if (name === 'settings') loadAdminProfile(); }

  // Chart data (بيانات حقيقية: التمويل الشهري وعدد الطيارين الجدد لآخر 6 أشهر)
  const months = (stats?.monthlyLabels && stats.monthlyLabels.length) ? stats.monthlyLabels : ['-','-','-','-','-','-'];
  const rawFunding = (stats?.monthlyFunding && stats.monthlyFunding.length) ? stats.monthlyFunding : [0,0,0,0,0,0];
  const rawPilots  = (stats?.monthlyPilots && stats.monthlyPilots.length) ? stats.monthlyPilots : [0,0,0,0,0,0];
  const normalize = (arr: number[]) => {
    const max = Math.max(...arr, 0);
    if (max <= 0) return arr.map(() => 0);
    return arr.map(v => (v / max) * 100);
  };
  const data1 = normalize(rawFunding);
  const data2 = normalize(rawPilots);
  const W = 600, H = 200, pad = 30;
  const scaleX = (i: number) => pad + (i / (data1.length - 1)) * (W - 2 * pad);
  const scaleY = (v: number) => H - pad - ((v - 0) / 100) * (H - 2 * pad);
  const smoothPath = (d: number[]) => {
    const pts = d.map((v,i) => [scaleX(i), scaleY(v)]);
    let p = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i-1][0] + pts[i][0]) / 2;
      p += ` C ${cp1x},${pts[i-1][1]} ${cp1x},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
    }
    return p;
  };
  const areaPath = (d: number[]) => {
    const pts = d.map((v,i) => [scaleX(i), scaleY(v)]);
    let p = `M ${pts[0][0]},${H-pad} L ${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i-1][0] + pts[i][0]) / 2;
      p += ` C ${cp1x},${pts[i-1][1]} ${cp1x},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
    }
    p += ` L ${pts[pts.length-1][0]},${H-pad} Z`;
    return p;
  };

  const navItems = [
    { id:'dash',       label:'لوحة التحكم',     icon:'📊' },
    { id:'companies',  label:'الشركات',          icon:'🏢' },
    { id:'supervisors',label:'المشرفون',          icon:'👮' },
    { id:'pilots-all', label:'الطيارون',          icon:'✈️' },
    { id:'inventory',  label:'المخزن',            icon:'📦', badge: calcTotalStoreValue() > 0 ? calcTotalStoreValue().toLocaleString('en-US') + ' ج' : null },
    { id:'finance',    label:'العمليات المالية',  icon:'💰' },
    { id:'reports',    label:'التقارير',          icon:'📈' },
    { id:'settings',   label:'الإعدادات',         icon:'⚙️' },
  ];

  const pendingReqs = (stats?.requests || []).filter((r: any) => TYPES.includes(r.type)).length;
  const fundingReqs = (stats?.requests || []).filter((r: any) => r.type === 'funding').length;
  const pendingReturnCount = stats?.pendingReturns || 0;

  if (loading) return (
    <>
      <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:16,background:'transparent',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',zIndex:9999}}>
        <div style={{width:44,height:44,borderRadius:'50%',border:'4px solid rgba(37,99,235,0.2)',borderTopColor:'#2563EB',animation:'spin .8s linear infinite'}} />
        <div style={{fontSize:15,color:'#111827',fontWeight:600}}>جارٍ التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return (
    <>

      {sidebarOpen && <div className="sidebar-overlay-bg" onClick={() => setSidebarOpen(false)} />}

      <div className="page-wrapper">
        {/* ========== SIDEBAR ========== */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" style={{overflow:'hidden',borderRadius:12,background:'var(--accent-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {adminLogo ? <img src={adminLogo} alt="logo" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}} /> : '✈️'}
            </div>
            <div>
              <div className="sidebar-logo-title">{adminProfile.name || 'إدارة الطيارين'}</div>
              <div className="sidebar-logo-sub">لوحة الإدارة</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item:any) => (
              <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => switchView(item.id)}>
                <div className="nav-icon">{item.icon}</div>
                <span style={{flex:1,textAlign:'right'}}>{item.label}</span>
                {item.badge && (
                  <span style={{fontSize:10,fontWeight:700,background:'var(--accent)',color:'#fff',borderRadius:6,padding:'2px 6px',direction:'ltr',whiteSpace:'nowrap',flexShrink:0}}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
            <button className="nav-item" onClick={confirmLogout}>
              <div className="nav-icon">🚪</div>
              <span>تسجيل الخروج</span>
            </button>
          </nav>
          <div className="sidebar-upgrade">
            <div className="sidebar-upgrade-title">ترقية الخطة</div>
            <div className="sidebar-upgrade-desc">احصل على مزايا إضافية ومميزات متقدمة</div>
            <button className="sidebar-upgrade-btn">ترقية الآن</button>
          </div>
        </aside>

        {/* ========== MAIN ========== */}
        <main className="main-content">
          {/* ===== UPGRADE BAR ===== */}
          <div className="main-upgrade-bar">
            <span className="main-upgrade-bar-text">✨ احصل على مزايا إضافية ومميزات متقدمة</span>
            <button className="main-upgrade-bar-btn">ترقية الخطة</button>
          </div>

          <div className="main-body">

          {/* ===== HEADER ===== */}
          <header className="top-header">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
              <div>
                <div className="header-title">{navItems.find(n => n.id === view)?.label || 'لوحة التحكم'}</div>
                <div className="header-subtitle">مرحباً بعودتك، ابدأ يومك بإنجاز</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="header-search">
                <span>🔍</span>
                <input placeholder="البحث في النظام..." autoComplete="off" />
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={() => { loadRequests('', { status: 'pending', type: '' }); }}>
                <div className="header-notif" style={{position:'relative'}}>
                  🔔
                  {(fundingReqs + pendingReqs + pendingReturnCount) > 0 && <span className="notif-dot"></span>}
                  {(fundingReqs + pendingReqs + pendingReturnCount) > 0 && <span style={{position:'absolute',top:-6,left:-6,background:'var(--danger)',color:'#fff',borderRadius:10,padding:'0 5px',fontSize:10,fontWeight:700,minWidth:16,textAlign:'center'}}>{fundingReqs + pendingReqs + pendingReturnCount}</span>}
                </div>
                <span className="header-notif-label" style={{fontSize:13,fontWeight:700,color:'var(--accent)'}}>طلبات</span>
              </div>
            </div>
          </header>

          {/* ===== VIEW: DASHBOARD ===== */}
          <div className={`view ${view === 'dash' ? 'active' : ''}`}>
            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card" onClick={() => switchView('supervisors')} style={{cursor:'pointer'}}>
                <div className="stat-top">
                  <div className="stat-icon">👮</div>

                </div>
                <div className="stat-value" style={{color:'var(--accent)'}}>{stats?.supervisorsCount || 0}</div>
                <div className="stat-label">إجمالي المشرفين</div>
              </div>
              <div className="stat-card" onClick={() => switchView('pilots-all')} style={{cursor:'pointer'}}>
                <div className="stat-top">
                  <div className="stat-icon green">✈️</div>

                </div>
                <div className="stat-value" style={{color:'var(--success)'}}>{stats?.pilotsCount || 0}</div>
                <div className="stat-label">الطيارون</div>
              </div>
              <div className="stat-card" onClick={() => switchView('finance')} style={{cursor:'pointer'}}>
                <div className="stat-top">
                  <div className="stat-icon amber">💰</div>

                </div>
                <div className="stat-value" style={{color:'var(--warning)'}}>{fmt(stats?.totalFunded)}</div>
                <div className="stat-label">إجمالي التمويل</div>
              </div>
              <div className="stat-card" onClick={() => switchView('finance')} style={{cursor:'pointer'}}>
                <div className="stat-top">
                  <div className="stat-icon purple">💼</div>

                </div>
                <div className="stat-value" style={{color:'var(--info)'}}>{fmt(stats?.balance)}</div>
                <div className="stat-label">الرصيد</div>
              </div>

            </div>

            {/* Analytics */}
            <div className="analytics-row">
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">الإحصائيات الشهرية</div>
                  <div className="chart-legend">
                    <div className="legend-item"><div className="legend-dot blue"></div>التمويل</div>
                    <div className="legend-item"><div className="legend-dot light"></div>الطيارون</div>
                  </div>
                </div>
                <div className="chart-area">
                  <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#93C5FD" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[20,40,60,80].map(v => (
                      <line key={v} x1={pad} y1={scaleY(v)} x2={W-pad} y2={scaleY(v)} stroke="#F1F5F9" strokeWidth="1"/>
                    ))}
                    <path d={areaPath(data2)} fill="url(#g2)"/>
                    <path d={areaPath(data1)} fill="url(#g1)"/>
                    <path d={smoothPath(data2)} fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d={smoothPath(data1)} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"/>
                    {data1.map((v,i) => (
                      <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="4" fill="#2563EB" stroke="#fff" strokeWidth="2">
                        <title>{`${months[i]}: تمويل ${fmt(rawFunding[i])} — طيارون جدد ${rawPilots[i]}`}</title>
                      </circle>
                    ))}
                    {months.map((m,i) => (
                      <text key={i} x={scaleX(i)} y={H-4} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="Cairo">{m}</text>
                    ))}
                  </svg>
                </div>
              </div>
              <div className="right-panel">
                <div className="mini-card">
                  <div className="mini-card-header">
                    <div className="mini-card-label">إجمالي المستحقات</div>
                    <span style={{fontSize:'20px'}}>💰</span>
                  </div>
                  <div className="mini-card-value" style={{color:'var(--accent)'}}>{fmt((stats?.supervisorDebts||[]).reduce((a:number,d:any)=>a+(d.totalDue||0),0))}</div>
                  <div className="mini-card-change">مستحقات المشرفين</div>
                  <div className="mini-sparkline">
                    {[3,5,4,7,5,8,6,9].map((v,i) => (
                      <div key={i} className={`spark-bar ${i>5?'filled':''}`} style={{height:`${v*12}%`}}/>
                    ))}
                  </div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-header">
                    <div className="mini-card-label">الطلبات المعلقة</div>
                    <span style={{fontSize:'20px'}}>📋</span>
                  </div>
                  <div className="mini-card-value" style={{color:'var(--warning)'}}>{fundingReqs + pendingReqs}</div>
                  <div className="mini-card-change" style={{color:'var(--warning)'}}>تحتاج مراجعة</div>
                  <div className="mini-sparkline">
                    {[6,7,5,8,7,9,8,9].map((v,i) => (
                      <div key={i} className={`spark-bar ${i>4?'filled':''}`} style={{height:`${v*12}%`}}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="notif-card" style={{marginTop:24}}>
              <div className="notif-header">
                <div className="notif-title">⚡ إجراءات سريعة</div>
              </div>
              {/* Search box inside quick actions */}
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',position:'relative'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',borderRadius:10,padding:'6px 12px',border:'1.5px solid var(--border)'}}>
                  <span style={{fontSize:14}}>🔍</span>
                  <input
                    placeholder="ابحث عن إجراء لإضافته..."
                    value={globalSearch}
                    onChange={e => { setGlobalSearch(e.target.value); setSearchOpen(true); }}
                    onFocus={() => { if (globalSearch) setSearchOpen(true); }}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                    style={{border:'none',background:'transparent',outline:'none',fontSize:13,flex:1,color:'var(--fg)',direction:'rtl'}} autoComplete="off" />
                  {globalSearch && <span style={{cursor:'pointer',color:'var(--muted)',fontSize:13}} onMouseDown={() => { setGlobalSearch(''); setSearchOpen(false); }}>✕</span>}
                </div>
                {searchOpen && globalSearch.trim() && (() => {
                  const q = globalSearch.trim().toLowerCase();
                  const matched = ALL_ACTIONS.filter(a => a.label.toLowerCase().includes(q));
                  return (
                    <div style={{position:'absolute',top:'calc(100% + 2px)',left:16,right:16,background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',zIndex:999,maxHeight:280,overflowY:'auto'}}>
                      {matched.length === 0 && (
                        <div style={{padding:'14px',textAlign:'center',color:'var(--muted)',fontSize:13}}>لا توجد نتائج</div>
                      )}
                      {matched.map((a,i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
                          <span style={{fontSize:18}}>{a.icon}</span>
                          <span style={{flex:1,fontWeight:600,fontSize:14}}>{a.label}</span>
                          {quickActionIds.includes(a.id)
                            ? <span onMouseDown={() => removeQuickAction(a.id)} style={{fontSize:11,color:'var(--danger)',cursor:'pointer',padding:'2px 8px',borderRadius:8,border:'1px solid var(--danger)',whiteSpace:'nowrap'}}>✕ إزالة</span>
                            : <span onMouseDown={() => { addQuickAction(a.id); setGlobalSearch(''); setSearchOpen(false); }} style={{fontSize:11,color:'var(--accent)',cursor:'pointer',padding:'2px 8px',borderRadius:8,border:'1px solid var(--accent)',whiteSpace:'nowrap'}}>+ إضافة</span>
                          }
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="notif-list">
                {quickActionIds.length === 0 && (
                  <div style={{padding:'24px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
                    ابحث عن إجراء أعلاه وأضفه هنا
                  </div>
                )}
                {quickActionIds.map(id => {
                  const a = ALL_ACTIONS.find(x => x.id === id);
                  if (!a) return null;
                  return (
                    <div key={id} className="notif-item" style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{flex:1,cursor:'pointer'}} onClick={a.action}>
                        <div className="notif-item-title">{a.icon} {a.label}</div>
                      </div>
                      <span onClick={() => removeQuickAction(id)} title="إزالة" style={{fontSize:13,color:'var(--danger)',cursor:'pointer',padding:'2px 8px',borderRadius:8,border:'1px solid var(--danger)',flexShrink:0}}>✕</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== VIEW: COMPANIES ===== */}
          <div className={`view ${view === 'companies' ? 'active' : ''}`}>
            <div className="section-card">
              <div className="section-card-header companies-header">
                <div className="section-card-title companies-title">🏢 إدارة الشركات</div>
                <button className="btn-primary companies-add-btn" onClick={() => openModal('addCompany')}>+ إضافة شركة</button>
              </div>
              <div className="section-card-body">
                {companies.length === 0 && <div className="empty">لا توجد شركات مضافة بعد</div>}
                <div className="company-grid">
                  {companies.map((c: any) => {
                    const supCount = supervisors.filter((s: any) => (s.companyIds || []).includes(c.id) || s.company_id === c.id).length;
                    return (
                      <div key={c.id} style={{background:'var(--white)',border:'1.5px solid var(--border2)',borderRadius:20,padding:24,display:'flex',flexDirection:'column',gap:12,boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:14}}>
                          <div style={{width:52,height:52,borderRadius:16,background:'var(--accent-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏢</div>
                          <div>
                            <div style={{fontWeight:700,fontSize:17,color:'var(--text)'}}>{c.name}</div>
                            <div style={{fontSize:13,color:'var(--muted)',marginTop:2}}>{supCount} مشرف</div>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          <button className="btn-secondary" style={{flex:1,height:36,fontSize:13}} onClick={() => openModal('companySupervisors', { company: c })}>👮 المشرفون</button>
                          <button className="btn-danger-s" style={{height:36,fontSize:13}} onClick={() => doDeleteCompany(c.id)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ===== VIEW: SUPERVISORS ===== */}
          <div className={`view ${view === 'supervisors' ? 'active' : ''}`}>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">👮 المشرفون</div>
                <div style={{display:'flex',gap:10}}>
                  <button className="btn-primary" onClick={() => openModal('addSupervisor')}>+ إضافة مشرف</button>
                </div>
              </div>
              <div className="section-card-body">
                {supervisors.length === 0 && <div className="empty">لا يوجد مشرفون</div>}
                {supervisors.map(s => {
                  const debt = (stats?.supervisorDebts||[]).find((d:any) => d.id === s.id)||{};
                  return (
                    <div key={s.id} className="sup-card" onClick={() => openSupDetail(s.id)}>
                      <div className="sup-card-row">
                        <div style={{display:'flex',alignItems:'center',gap:16}}>
                          <div style={{width:52,height:52,borderRadius:16,background:'var(--accent-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>👮</div>
                          <div className="sup-name">{s.name}</div>
                        </div>
                        <div className="sup-total">
                          <div className="sup-total-label">إجمالي المستحقات</div>
                          <div className="sup-net">{fmt(debt.totalDue||0)} ج</div>
                        </div>
                      </div>
                      <div className="sup-meta">
                        {s.regions && s.regions.map((r:string,i:number) => <span key={i} style={{display:'inline-block',background:'var(--accent-bg)',color:'var(--accent)',borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:600}}>📍{r}</span>)}
                        {s.companyNames && s.companyNames.map((c:string,i:number) => <span key={i} style={{display:'inline-block',background:'#f0faf5',color:'#1a8a5a',borderRadius:10,padding:'2px 8px',fontSize:11,fontWeight:600}}>🏢{c}</span>)}
                        {s.phone && <span style={{fontSize:12,color:'var(--muted)'}}>📞{s.phone}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          </div>

          {/* ===== VIEW: ALL PILOTS ===== */}
          <div className={`view ${view === 'pilots-all' ? 'active' : ''}`}>
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">✈️ كل الطيارين</div>
              </div>

              {/* شريط البحث والفلاتر */}
              <div style={{padding:'12px 16px',display:'flex',flexWrap:'wrap',gap:10,borderBottom:'1px solid var(--border)'}}>
                <input
                  className="form-input"
                  style={{flex:'1 1 200px',height:36,fontSize:13}}
                  placeholder="🔍 بحث بالاسم أو الكود أو رقم الهاتف..."
                  value={pilotSearch}
                  onChange={e => setPilotSearch(e.target.value)} autoComplete="off" />
                <select
                  className="form-input"
                  style={{flex:'1 1 150px',height:36,fontSize:13}}
                  value={pilotFilterRegion}
                  onChange={e => setPilotFilterRegion(e.target.value)}
                >
                  <option value="">كل المناطق</option>
                  {Array.from(new Set(allPilots.map((p:any) => p.region).filter(Boolean))).sort().map((r:any) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  className="form-input"
                  style={{flex:'1 1 150px',height:36,fontSize:13}}
                  value={pilotFilterSup}
                  onChange={e => setPilotFilterSup(e.target.value)}
                >
                  <option value="">كل المشرفين</option>
                  {Array.from(new Set(allPilots.map((p:any) => p.supervisorName).filter(Boolean))).sort().map((s:any) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  className="form-input"
                  style={{flex:'1 1 150px',height:36,fontSize:13}}
                  value={pilotFilterCompany}
                  onChange={e => setPilotFilterCompany(e.target.value)}
                >
                  <option value="">كل الشركات</option>
                  {Array.from(new Set(allPilots.map((p:any) => p.pilotCompanyName).filter(Boolean))).sort().map((c:any) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {(pilotSearch || pilotFilterRegion || pilotFilterSup || pilotFilterCompany) && (
                  <button className="btn-secondary" style={{height:36,fontSize:13,padding:'0 14px'}}
                    onClick={() => { setPilotSearch(''); setPilotFilterRegion(''); setPilotFilterSup(''); setPilotFilterCompany(''); }}>
                    ✕ مسح
                  </button>
                )}
              </div>

              <div style={{overflowX:'auto'}}>
                {allPilots.length === 0 ? <div className="spinner"></div> : (() => {
                  const filtered = allPilots.filter((p:any) => {
                    const q = pilotSearch.trim().toLowerCase();
                    if (q && !p.name?.toLowerCase().includes(q) && !p.pilot_code?.toLowerCase().includes(q) && !p.phone?.toLowerCase().includes(q)) return false;
                    if (pilotFilterRegion && p.region !== pilotFilterRegion) return false;
                    if (pilotFilterSup && p.supervisorName !== pilotFilterSup) return false;
                    if (pilotFilterCompany && p.pilotCompanyName !== pilotFilterCompany) return false;
                    return true;
                  });
                  return (
                    <>
                      <div style={{padding:'8px 16px',fontSize:13,color:'var(--muted)'}}>
                        عدد الطيارين: <strong style={{color:'var(--fg)'}}>{filtered.length}</strong>
                        {filtered.length !== allPilots.length && <span> (من إجمالي {allPilots.length})</span>}
                      </div>
                      <table className="modal-table" style={{minWidth:'100%'}}>
                        <thead>
                          <tr>
                            <th>الاسم</th>
                            <th>الكود</th>
                            <th>المنطقة</th>
                            <th>الهاتف</th>
                            <th>شركة الطيار</th>
                            <th>المشرف</th>
                            <th>منطقة المشرف</th>
                            <th>هاتف المشرف</th>
                            <th>شركة المشرف</th>
                            <th>الراتب الأساسي</th>
                            <th>صافي الراتب</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr><td colSpan={11} style={{textAlign:'center',color:'var(--muted)',padding:24}}>لا توجد نتائج</td></tr>
                          ) : filtered.map((p:any) => (
                            <tr key={p.id} style={{cursor:'pointer'}} onClick={() => openPilotDetail(p.id)}>
                              <td><strong>{p.name}</strong></td>
                              <td><span style={{background:'var(--accent-bg)',color:'var(--accent)',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:700}}>{p.pilot_code}</span></td>
                              <td>{p.region||'-'}</td>
                              <td>{p.phone||'-'}</td>
                              <td>{p.pilotCompanyName||'-'}</td>
                              <td style={{fontWeight:600}}>{p.supervisorName||'-'}</td>
                              <td>{p.supervisorRegions && p.supervisorRegions.length > 0
                                ? p.supervisorRegions.map((r:string,i:number) => <span key={i} style={{display:'inline-block',background:'var(--accent-bg)',color:'var(--accent)',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600,marginLeft:2}}>📍{r}</span>)
                                : <span style={{color:'var(--muted)'}}>-</span>}</td>
                              <td>{p.supervisorPhone||'-'}</td>
                              <td>{p.supervisorCompanyIds && p.supervisorCompanyIds.length > 0
                                ? p.supervisorCompanyIds.map((cid:string, i:number) => {
                                    const nm = p.supervisorCompany ? p.supervisorCompany.split(', ')[i] : '';
                                    return nm ? <span key={cid} style={{display:'inline-block',background:'#f0faf5',color:'#1a8a5a',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600,marginLeft:2}}>🏢{nm}</span> : null;
                                  })
                                : <span style={{color:'var(--muted)'}}>-</span>}</td>
                              <td>{fmt(p.base_salary)} ج</td>
                              <td style={{color:'var(--accent)',fontWeight:700}}>{fmt(p.netSalary)} ج</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ===== VIEW: INVENTORY ===== */}
          <div className={`view ${view === 'inventory' ? 'active' : ''}`}>
            <div className="section-card">
              <div className="section-card-header" style={{flexDirection:'column',alignItems:'flex-start',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',flexWrap:'wrap',gap:8}}>
                  <div className="section-card-title">
                    📦 إجمالي مخزن الشركات
                    <span style={{marginRight:12,fontSize:12,fontWeight:700,background:'var(--accent-bg)',color:'var(--accent)',borderRadius:8,padding:'3px 10px',display:'inline-block'}}>
                      إجمالي القيمة: {calcAllCompaniesTotalValue().toLocaleString('en-US')} ج
                    </span>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button style={{height:36,padding:'0 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--white)',fontFamily:'var(--font)',fontSize:13,fontWeight:600,color:'var(--text2)',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6,transition:'all .2s'}} onClick={() => { openModal('invHistory'); loadInvLog(); }}>📋 سجل المخزن</button>
                  <button style={{height:36,padding:'0 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--white)',fontFamily:'var(--font)',fontSize:13,fontWeight:600,color:'var(--text2)',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6,transition:'all .2s'}} onClick={() => { loadCompanyInvSummary(); setSelectedCompanyInv(''); openModal('companyInvSummary'); }}>🏢 مخزن الشركات</button>
                  <button style={{height:36,padding:'0 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--white)',fontFamily:'var(--font)',fontSize:13,fontWeight:600,color:'var(--text2)',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6,transition:'all .2s'}} onClick={() => { loadInvPrices(); openModal('sendInventory'); }}>📤 إرسال</button>
                  <button style={{height:36,padding:'0 14px',border:'1.5px solid var(--warning)',borderRadius:10,background:'var(--white)',fontFamily:'var(--font)',fontSize:13,fontWeight:600,color:'var(--warning)',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6,transition:'all .2s'}} onClick={() => { loadCompanyInvSummary(); openModal('returnCompanyInv'); }}>↩️ مرتجع</button>
                  <button style={{height:36,padding:'0 14px',border:'none',borderRadius:10,background:'var(--accent)',fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:'#fff',cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6,transition:'all .2s',boxShadow:'0 4px 14px rgba(37,99,235,.2)'}} onClick={() => openModal('addInventory')}>+ إضافة مخزون</button>
                </div>
              </div>
              <div className="section-card-body">
                <div className="inv-grid">
                  {(() => {
                    // DEFAULT_TYPES + كل الأنواع من equipmentTypes + كل الأنواع اللي فيها بيانات في أي شركة
                    const seen = new Set<string>(DEFAULT_TYPES);
                    const allDisplayTypes = [...DEFAULT_TYPES];
                    equipmentTypes.forEach((t:any) => {
                      if (!seen.has(t.key)) { seen.add(t.key); allDisplayTypes.push(t.key); }
                    });
                    Object.values(companyInvSummary).forEach((c: any) => {
                      Object.entries(c.inventory || {}).forEach(([k, d]: [string, any]) => {
                        if (!seen.has(k) && ((d.total||0) > 0 || (d.remaining||0) > 0)) { seen.add(k); allDisplayTypes.push(k); }
                      });
                    });
                    return allDisplayTypes;
                  })().map(t => {
                    const d = calcAllCompaniesTypeStats(t);
                    const typeVal = calcAllCompaniesTypeValue(t);
                    const cc = d.conditionCounts || {};
                    const hasConditions = (cc.new||0) + (cc.good||0) + (cc.damaged||0) > 0;
                    return (
                      <div key={t} className="inv-item" onClick={() => { loadCompanyInvSummary(); setSelectedCompanyInv(''); openModal('companyInvSummary'); }}>
                        <div className="inv-icon">
                          {renderIcon(UI[t]||'', 48)}
                        </div>
                        <div className="inv-label">{UL[t]}</div>
                        <div className="inv-qty" style={{color:d.remaining<0?'var(--danger)':d.remaining===0?'var(--warning)':'var(--success)'}}>{d.remaining||0}</div>
                        <div className="inv-sub">إجمالي: {d.total||0}</div>
                        {hasConditions && (
                          <div style={{display:'flex',gap:4,marginTop:5,flexWrap:'wrap',justifyContent:'center'}}>
                            {(cc.new||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#dcfce7',color:'#16a34a',borderRadius:6,padding:'2px 7px'}}>جديد: {cc.new}</span>}
                            {(cc.good||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#dbeafe',color:'#2563eb',borderRadius:6,padding:'2px 7px'}}>جيدة: {cc.good}</span>}
                            {(cc.damaged||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#fee2e2',color:'#dc2626',borderRadius:6,padding:'2px 7px'}}>تالف: {cc.damaged}</span>}
                          </div>
                        )}
                        <div style={{marginTop:6,fontSize:12,fontWeight:700,color:'var(--accent)',background:'var(--accent-bg)',borderRadius:6,padding:'2px 8px',display:'inline-block',direction:'ltr'}}>
                          {typeVal.toLocaleString('en-US')} ج
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* بطاقة أنواع المعدات داخل المخزن */}
            <div className="section-card" style={{marginTop:20}}>
              <div className="section-card-header eqtype-header" style={{flexWrap:'wrap',gap:10}}>
                <div className="section-card-title eqtype-title">🏷️ أنواع المعدات</div>
                <div className="eqtype-actions" style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  {/* فلتر الشركات */}
                  <select
                    value={eqTypeFilterCompany}
                    onChange={e => setEqTypeFilterCompany(e.target.value)}
                    style={{height:36,padding:'0 10px',border:'1.5px solid var(--border)',borderRadius:10,fontFamily:'var(--font)',fontSize:13,background:'var(--bg)',color:'var(--text)',cursor:'pointer'}}>
                    <option value="">🏢 كل الشركات</option>
                    {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn-primary" style={{height:36,fontSize:13}} onClick={() => openModal('addEqType')}>+ إضافة نوع معدة جديدة</button>
                </div>
              </div>
              <div className="section-card-body" style={{padding:0}}>
                <div className="table-wrap" style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
                <table className="modal-table" style={{minWidth:'100%'}}>
                  <thead>
                    <tr>
                      <th>الأيقونة</th>
                      <th>الاسم</th>
                      <th>المعرف</th>
                      <th>النوع</th>
                      {eqTypeFilterCompany && <th>المخزون في الشركة</th>}
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Build unified list: defaults first (always shown), then custom DB types
                      const dbByKey: Record<string,any> = {};
                      equipmentTypes.forEach((t:any) => { dbByKey[t.key] = t; });

                      // Defaults as synthetic rows — merge with DB record if exists
                      const defaultRows = DEFAULT_TYPES.map(key => {
                        const dbRec = dbByKey[key];
                        return {
                          id: dbRec?.id || null,
                          key,
                          label: dbRec?.label || UL[key] || key,
                          icon: dbRec?.icon || UI[key] || '',
                          active: dbRec ? (dbRec.active !== false) : true,
                          isDefault: true,
                          _inDb: !!dbRec,
                        };
                      });

                      // Custom DB types that are NOT defaults
                      const customRows = equipmentTypes
                        .filter((t:any) => !DEFAULT_TYPES.includes(t.key))
                        .map((t:any) => ({ ...t, isDefault: false }));

                      // أنواع موجودة في مخزن الشركات لكن غير معرّفة في equipmentTypes ولا في الافتراضيات
                      const definedKeys = new Set<string>([...DEFAULT_TYPES, ...equipmentTypes.map((t:any) => t.key)]);
                      const undefinedRows: any[] = [];
                      Object.values(companyInvSummary).forEach((c: any) => {
                        Object.entries(c.inventory || {}).forEach(([k, d]: [string, any]) => {
                          const hasActualQty = (d.total || 0) > 0 || (d.remaining || 0) > 0;
                          if (!definedKeys.has(k) && hasActualQty && !undefinedRows.find(r => r.key === k)) {
                            undefinedRows.push({
                              id: null, key: k, label: k, icon: '❓',
                              active: true, isDefault: false, _inDb: false, _undefined: true,
                              _hasData: true,
                            });
                          }
                        });
                      });

                      const allRows = [...defaultRows, ...customRows, ...undefinedRows];

                      const hasUndefined = undefinedRows.length > 0;

                      return (<>
                        {hasUndefined && (
                          <tr>
                            <td colSpan={eqTypeFilterCompany ? 6 : 5} style={{padding:'10px 16px',background:'#fff7ed',border:'1.5px solid #fed7aa'}}>
                              <span style={{color:'#c2410c',fontWeight:700,fontSize:13}}>
                                ⚠️ يوجد {undefinedRows.length} نوع في مخزن الشركات غير معرّف في أنواع المعدات — يُنصح بتعريفه أو إعادة تسميته.
                              </span>
                            </td>
                          </tr>
                        )}
                        {allRows.map((t:any) => {
                        const companyInv = eqTypeFilterCompany
                          ? (companyInvSummary[eqTypeFilterCompany]?.inventory?.[t.key] || null)
                          : null;
                        const companyQty = companyInv ? (Number(companyInv.remaining)||0) : null;

                        return (
                          <tr key={t._undefined ? `undef_${t.key}` : t.isDefault ? `def_${t.key}` : t.id}
                            style={{opacity: t.active===false ? 0.5 : 1, background: t._undefined ? '#fff7ed' : undefined}}>
                            <td style={{textAlign:'center'}}>
                              {(t.icon?.startsWith('data:') || t.icon?.startsWith('http'))
                                ? <img src={t.icon} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}} />
                                : <span style={{fontSize:26}}>{t.icon}</span>}
                            </td>
                            <td style={{fontWeight:700}}>
                              {t.label}
                              {t._undefined && <span style={{marginRight:6,fontSize:11,fontWeight:700,background:'#fed7aa',color:'#c2410c',borderRadius:6,padding:'2px 6px'}}>⚠️ غير معرّف</span>}
                            </td>
                            <td style={{color:'var(--muted)',fontFamily:'monospace',fontSize:12}}>{t.key}</td>
                            <td>
                              {t._undefined
                                ? <span style={{fontSize:11,fontWeight:700,background:'#fee2e2',color:'#dc2626',borderRadius:6,padding:'2px 8px'}}>❌ غير موجود</span>
                                : t.isDefault
                                  ? <span style={{fontSize:11,fontWeight:700,background:'var(--accent-bg)',color:'var(--accent)',borderRadius:6,padding:'2px 8px'}}>{t.active===false ? '⏸ موقوف' : 'افتراضي'}</span>
                                  : <span style={{fontSize:11,fontWeight:700,background:'#f3e8ff',color:'#7c3aed',borderRadius:6,padding:'2px 8px'}}>{t.active===false?'⏸ موقوف':'مخصص'}</span>
                              }
                            </td>
                            {eqTypeFilterCompany && (
                              <td style={{textAlign:'center',fontWeight:700,color: companyQty===null?'var(--muted)':companyQty>0?'var(--success)':companyQty===0?'var(--warning)':'var(--danger)'}}>
                                {companyQty !== null ? companyQty : '—'}
                              </td>
                            )}
                            <td>
                              <div style={{display:'flex',gap:6}}>
                                {/* زر التعديل — للافتراضي وغير المعرّف يحتاج إدخال DB أولاً إذا لم يكن موجوداً */}
                                {(t.isDefault && !t._inDb) || t._undefined ? (
                                  <button className="table-btn" onClick={async () => {
                                    // تنظيف الـ key: حوّل لأحرف صغيرة واستبدل الرموز غير المسموح بها بـ _
                                    const safeKey = t.key.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'type_' + Date.now();
                                    const createRes = await api('addEquipmentType', { key: safeKey, icon: t.icon || '❓', label: t.label || t.key, skipCompanyCheck: true });
                                    if (!createRes.success && createRes.message !== 'يوجد نوع معدات بنفس المعرف الداخلي بالفعل') { showToast('❌ ' + (createRes.message||'خطأ')); return; }
                                    // جلب البيانات بدون تحديث الـ state حتى لا يختفي النوع من الجدول
                                    const eqRes2 = await apiGet('getEquipmentTypes');
                                    const dbRec2 = eqRes2.data?.find((x:any) => x.key === safeKey || x.key === t.key);
                                    if (dbRec2) {
                                      // افتح المودال مع تمرير البيانات الجديدة + الـ pendingEqData لتحديث القائمة بعد الحفظ
                                      openModal('editEqType', { eqId: dbRec2.id, eqIcon: dbRec2.icon, eqLabel: dbRec2.label, eqActive: dbRec2.active, eqKey: dbRec2.key, _pendingEqData: eqRes2.data });
                                    } else {
                                      showToast('❌ فشل إنشاء السجل');
                                    }
                                  }}>✏️ تعديل</button>
                                ) : (
                                  <button className="table-btn" onClick={async () => {
                                    const checkRes = await api('deleteEquipmentType', { id: '__check__', key: t.key });
                                    if (checkRes.cannotDelete) { showToast('❌ لا يمكن التعديل — يوجد سجلات تاريخية لهذا النوع'); return; }
                                    openModal('editEqType', { eqId: t.id, eqIcon: t.icon, eqLabel: t.label, eqActive: t.active, eqKey: t.key });
                                  }}>✏️ تعديل</button>
                                )}
                                {t.active !== false
                                  ? <button className="table-btn" style={{color:'var(--warning)',borderColor:'var(--warning)'}}
                                      onClick={() => askConfirm('هل تريد إيقاف هذا النوع؟', async () => {
                                        if (t.isDefault && !t._inDb) {
                                          // أنشئ سجل DB أولاً
                                          const createRes = await api('addEquipmentType', { key: t.key, icon: t.icon, label: t.label, skipCompanyCheck: true });
                                          if (!createRes.success && createRes.message !== 'يوجد نوع معدات بنفس المعرف الداخلي بالفعل') { showToast('❌ ' + (createRes.message||'خطأ')); return; }
                                          const eqRes2 = await apiGet('getEquipmentTypes');
                                          if (eqRes2.success) setEquipmentTypes(eqRes2.data);
                                          const dbRec2 = eqRes2.data?.find((x:any) => x.key === t.key);
                                          if (!dbRec2) { showToast('❌ خطأ في إنشاء السجل'); return; }
                                          await api('updateEquipmentType', { id: dbRec2.id, active: false });
                                        } else {
                                          await api('updateEquipmentType', { id: t.id, active: false });
                                        }
                                        const res = await apiGet('getEquipmentTypes');
                                        if (res.success) setEquipmentTypes(res.data);
                                        const statsRes = await apiGet('getManagerStats');
                                        if (statsRes.success) setStats(statsRes);
                                        showToast('⏸ تم إيقاف النوع');
                                      })}>⏸ إيقاف</button>
                                  : <button className="table-btn" style={{color:'var(--success)',borderColor:'var(--success)'}}
                                      onClick={() => askConfirm('هل تريد تفعيل هذا النوع؟', async () => {
                                        await api('updateEquipmentType', { id: t.id, active: true });
                                        const res = await apiGet('getEquipmentTypes');
                                        if (res.success) setEquipmentTypes(res.data);
                                        const statsRes = await apiGet('getManagerStats');
                                        if (statsRes.success) setStats(statsRes);
                                        showToast('✅ تم تفعيل النوع');
                                      })}>✅ تفعيل</button>
                                }
                                <button className="table-btn" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
                                  onClick={() => askConfirm('هل تريد حذف هذا النوع نهائياً؟', async () => {
                                    // لو النوع غير موجود في DB (افتراضي غير مسجل أو غير معرّف) — check فقط بدون حذف
                                    if ((t.isDefault && !t._inDb) || (t._undefined && !t.id)) {
                                      const checkRes = await api('deleteEquipmentType', { id: '__check__', key: t.key });
                                      if (checkRes.cannotDelete) { showToast('❌ لا يمكن الحذف — يوجد سجلات تاريخية لهذا النوع'); return; }
                                      showToast('❌ هذا النوع لا يوجد له سجل قابل للحذف'); return;
                                    }
                                    const res = await api('deleteEquipmentType', { id: t.id, key: t.key });
                                    if (!res.success && res.cannotDelete) { showToast('❌ لا يمكن الحذف — يوجد سجلات تاريخية لهذا النوع'); return; }
                                    if (!res.success) { showToast('❌ ' + (res.message||'خطأ')); return; }
                                    const eqRes = await apiGet('getEquipmentTypes');
                                    if (eqRes.success) setEquipmentTypes(eqRes.data);
                                    const statsRes = await apiGet('getManagerStats');
                                    if (statsRes.success) setStats(statsRes);
                                    showToast('🗑️ تم حذف النوع');
                                  })}>🗑️ حذف</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      </>);
                    })()}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>

          {/* ===== VIEW: FINANCE ===== */}
          <div className={`view ${view === 'finance' ? 'active' : ''}`}>
            <div className="section-card">
              <div className="section-card-header">
                <div className="section-card-title">💰 العمليات المالية</div>
              </div>
              <div className="section-card-body">
                <div className="quick-actions">
                  {[
                    { icon:'💼', label:'إيداع وسحب رصيد', action:() => openModal('addBalance') },
                    { icon:'💰', label:'إرسال تمويل',      action:() => openModal('addFunding') },
                    { icon:'📋', label:'سجل الرصيد',       action:() => { loadBalanceLog(); openModal('balanceLogModal'); } },
                  ].map(item => (
                    <button key={item.label} className="quick-btn" onClick={item.action}>
                      <div className="quick-btn-icon">{item.icon}</div>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`view ${view === 'settings' ? 'active' : ''}`}>


            {/* ===== كروت الإعدادات — floating modal ===== */}
            <div className="settings-grid">
              {[
                { key:'profile', icon:'👤', label:'بروفايل المدير', danger:false },
                { key:'dbsize',  icon:'🗄️', label:'حجم البيانات',   danger:false },
                { key:'backup',  icon:'💾', label:'نسخة احتياطية',  danger:false },
                { key:'reset',   icon:'🏭', label:'إعادة الضبط',    danger:true  },
                { key:'regions', icon:'🗺️', label:'إدارة المناطق',  danger:false, directAction:() => openModal('manageRegions') },
              ].map((s:any) => (
                <div key={s.key} style={{position:'relative'}}>
                  <button
                    onClick={()=> s.directAction ? s.directAction() : toggleSettingsSection(s.key)}
                    style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:'18px 12px',borderRadius:16,border:`2px solid ${settingsSection===s.key?(s.danger?'var(--danger)':'var(--accent)'):(s.danger?'#fecdd3':'var(--border2)')}`,background:settingsSection===s.key?(s.danger?'#fff5f5':'var(--accent-bg)'):'var(--white)',cursor:'pointer',transition:'all .2s',boxShadow:settingsSection===s.key?'0 4px 20px rgba(0,0,0,.15)':'none'}}
                  >
                    <span style={{fontSize:28}}>{s.icon}</span>
                    <span style={{fontSize:12,fontWeight:700,color:settingsSection===s.key?(s.danger?'var(--danger)':'var(--accent)'):(s.danger?'#dc2626':'var(--text)'),textAlign:'center',lineHeight:1.3}}>{s.label}</span>

                  </button>

                  {settingsSection === s.key && (
                    <>
                      {/* backdrop */}
                      <div onClick={()=>setSettingsSection(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(6px)',zIndex:998}} />
                      {/* modal */}
                      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:999,background:'var(--white)',borderRadius:20,boxShadow:'0 12px 60px rgba(0,0,0,.28)',width:'min(620px,94vw)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1.5px solid var(--border2)',background:s.danger?'#fff5f5':'var(--accent-bg)',flexShrink:0}}>
                          <span style={{fontWeight:800,fontSize:15,color:s.danger?'var(--danger)':'var(--accent)'}}>{s.icon} {s.label}</span>
                          <button onClick={()=>setSettingsSection(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--muted)',lineHeight:1,padding:'2px 8px',borderRadius:8}}>✕</button>
                        </div>
                        <div style={{overflowY:'auto',padding:'20px',flex:1}}>
                          {s.key === 'profile' && (<div>
              <div className="section-card-body">
                {/* اللوجو */}
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:'16px',background:'var(--bg)',borderRadius:14,border:'1.5px solid var(--border2)'}}>
                  <div style={{width:72,height:72,borderRadius:18,overflow:'hidden',border:'2px solid var(--border2)',background:'var(--accent-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,flexShrink:0}}>
                    {adminLogo ? <img src={adminLogo} alt="logo" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : '✈️'}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>لوجو الشركة</div>
                    <label style={{cursor:'pointer',display:'inline-block',background:'var(--accent)',color:'#fff',borderRadius:10,padding:'7px 16px',fontSize:13,fontWeight:700}}>
                      📷 رفع لوجو
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}} autoComplete="off" />
                    </label>
                    {adminLogo && <button onClick={()=>{setAdminLogo('');localStorage.removeItem('badaya_admin_logo');showToast('تم حذف اللوجو');}} style={{marginRight:8,background:'var(--danger)',color:'#fff',border:'none',borderRadius:10,padding:'7px 14px',fontSize:13,fontWeight:700,cursor:'pointer'}}>حذف</button>}
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>أقل من 200KB — PNG أو JPG</div>
                  </div>
                </div>

                {/* حقول البروفايل */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'var(--muted)'}}>الاسم</label>
                    <input className="form-input" value={adminProfile.name} onChange={e=>setAdminProfile(p=>({...p,name:e.target.value}))} placeholder="اسم المدير" autoComplete="off" />
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'var(--muted)'}}>اسم المستخدم (يوزر)</label>
                    <input className="form-input" value={adminProfile.username} onChange={e=>setAdminProfile(p=>({...p,username:e.target.value}))} placeholder="username" dir="ltr" autoComplete="off" />
                  </div>
                  <div>
                    <label style={{fontSize:13,fontWeight:700,display:'block',marginBottom:5,color:'var(--muted)'}}>رقم التليفون</label>
                    <input className="form-input" value={adminProfile.phone} onChange={e=>setAdminProfile(p=>({...p,phone:e.target.value}))} placeholder="01xxxxxxxxx" dir="ltr" autoComplete="off" />
                  </div>
                </div>

                {/* تغيير الباسورد */}
                <div style={{background:'var(--bg)',borderRadius:12,padding:14,border:'1.5px solid var(--border2)',marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'var(--muted)'}}>🔒 تغيير كلمة المرور (اختياري)</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4,color:'var(--muted)'}}>الباسورد الحالي</label>
                      <input className="form-input" type="password" value={adminOldPass} onChange={e=>setAdminOldPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4,color:'var(--muted)'}}>الباسورد الجديد</label>
                      <input className="form-input" type="password" value={adminNewPass} onChange={e=>setAdminNewPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4,color:'var(--muted)'}}>تأكيد الباسورد</label>
                      <input className="form-input" type="password" value={adminConfirmPass} onChange={e=>setAdminConfirmPass(e.target.value)} placeholder="••••••" dir="ltr" autoComplete="off" />
                    </div>
                  </div>
                </div>

                {adminProfileErr && <div style={{color:'var(--danger)',fontSize:13,fontWeight:600,marginBottom:8}}>⚠️ {adminProfileErr}</div>}
                <button className="btn-primary" style={{width:'100%'}} onClick={saveAdminProfile} disabled={adminProfileLoading}>
                  {adminProfileLoading ? '⏳ جارٍ الحفظ...' : '💾 حفظ التعديلات'}
                </button>
              </div>
                          </div>)}
                          {s.key === 'dbsize' && (<div>
              <div className="section-card-body">
                {!dbSizeData && !dbSizeLoading && (
                  <div style={{textAlign:'center',color:'var(--muted)',fontSize:13,padding:'12px 0'}}>⏳ جارٍ التحميل...</div>
                )}
                {dbSizeLoading && (
                  <div style={{textAlign:'center',color:'var(--muted)',fontSize:13,padding:'12px 0'}}>⏳ جارٍ الحساب...</div>
                )}
                {dbSizeData && (
                  <>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--accent-bg)',borderRadius:12,padding:'12px 16px',marginBottom:14,border:'1.5px solid var(--accent)'}}>
                      <span style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>إجمالي الحجم</span>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:22,fontWeight:800,color:'var(--accent)'}}>{dbSizeData.totalSizeMB} MB</span>
                        <button onClick={loadDbSize} disabled={dbSizeLoading} style={{background:'none',border:'1px solid var(--accent)',borderRadius:8,color:'var(--accent)',cursor:'pointer',padding:'4px 10px',fontSize:12,fontWeight:700}}>{dbSizeLoading?'...':'🔄'}</button>
                      </div>
                    </div>
                    {dbSizeData?.isEstimate && (
                      <div style={{marginBottom:12,padding:'8px 12px',background:'#FFFBEB',borderRadius:8,fontSize:12,color:'#92400E'}}>
                        ⚠️ الحجم مُقدَّر بناءً على عدد الصفوف. لتفعيل الحجم الحقيقي أنشئ RPC باسم <code>get_tables_size</code> في Supabase.
                      </div>
                    )}
                    <div style={{overflowX:'auto'}}>
                      <table className="modal-table">
                        <thead>
                          <tr>
                            <th>الجدول</th>
                            <th style={{textAlign:'left'}}>عدد الصفوف</th>
                            <th style={{textAlign:'left'}}>الحجم (MB)</th>
                            <th style={{textAlign:'left'}}>النسبة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dbSizeData?.tables || []).map((t:any) => {
                            const pct = dbSizeData.totalSizeMB > 0 ? Math.round((t.sizeMB / dbSizeData.totalSizeMB) * 100) : 0;
                            return (
                              <tr key={t.table}>
                                <td><strong>{t.label}</strong><span style={{fontSize:11,color:'var(--muted)',marginRight:4}}>({t.table})</span></td>
                                <td style={{textAlign:'left'}}>{t.rows.toLocaleString('ar-EG')}</td>
                                <td style={{textAlign:'left',fontWeight:600,color:'var(--accent)'}}>{t.sizeMB}</td>
                                <td style={{textAlign:'left'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                                    <div style={{flex:1,background:'var(--border)',borderRadius:4,height:8}}>
                                      <div style={{width:`${Math.min(pct,100)}%`,background:'var(--accent)',height:8,borderRadius:4}}/>
                                    </div>
                                    <span style={{fontSize:12,color:'var(--muted)',minWidth:30}}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
                          </div>)}
                          {s.key === 'backup' && (<div>
                <button className="btn-secondary" style={{fontSize:13,height:34}} onClick={loadBackup} disabled={backupLoading}>
                  {backupLoading ? '⏳ جارٍ التحميل...' : '🔄 تحميل البيانات'}
                </button>
              <div className="section-card-body">

                {/* إحصائيات حجم البيانات */}
                {backupData && (
                  <div style={{marginBottom:16}}>
                    <div style={{background:'var(--accent-bg)',borderRadius:12,padding:14,marginBottom:12,border:'1.5px solid var(--accent)'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                        <div style={{fontWeight:800,fontSize:15,color:'var(--accent)'}}>📊 إجمالي البيانات: {backupTotalRows.toLocaleString('ar-EG')} سجل</div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                          <div title="حجم ملف JSON المُصدَّر" style={{background:'var(--accent)',color:'#fff',borderRadius:20,padding:'4px 14px',fontSize:13,fontWeight:700}}>
                            📦 J: {backupSizeMB} MB
                          </div>
                          <div title="الحجم التقديري لبيانات هذا الأدمن في Supabase" style={{background:'#7c3aed',color:'#fff',borderRadius:20,padding:'4px 14px',fontSize:13,fontWeight:700}}>
                            🗄️ S: {backupDbMB} MB
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {Object.entries(backupSizes).map(([k,v]) => (v as number) > 0 && (
                          <span key={k} style={{background:'var(--white)',border:'1px solid var(--border2)',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:600,display:'flex',gap:6,alignItems:'center'}}>
                            <span>{k==='users'?'المشرفون':k==='pilots'?'الطيارون':k==='advances'?'السلف':k==='deductions'?'الخصومات':k==='bonuses'?'المكافآت':k==='funding'?'التمويل':k==='inventory'?'المخزن':k==='balance'?'الرصيد':k==='companies'?'الشركات':k==='regions'?'المناطق':k==='uniforms'?'الزي':k==='settled'?'المسويات':k==='returns'?'المرتجعات':k==='equipment_types'?'أنواع المعدات':k}</span>
                            <strong style={{color:'var(--accent)'}}>{(v as number).toLocaleString('ar-EG')} سجل</strong>
                            {backupSizesDB[k] > 0 && (
                              <span style={{color:'#7c3aed',fontSize:11}}>• {backupSizesDB[k]} MB</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* خيارات النسخ */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div style={{border:'1.5px solid var(--border2)',borderRadius:14,padding:16,background:'var(--bg)'}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>💾 تنزيل على الجهاز</div>
                        <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>
                          J: <strong>{backupSizeMB} MB</strong> — S: <strong style={{color:'#7c3aed'}}>{backupDbMB} MB</strong>
                        </div>
                        <button className="btn-primary" style={{width:'100%'}} onClick={downloadBackupJSON}>
                          ⬇️ تنزيل ملف النسخة
                        </button>
                      </div>
                      <div style={{border:'1.5px solid var(--border2)',borderRadius:14,padding:16,background:'var(--bg)'}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>📧 إرسال على Gmail</div>
                        <input
                          className="form-input" style={{marginBottom:10,fontSize:13}}
                          placeholder="example@gmail.com" dir="ltr"
                          value={backupGmailTarget}
                          onChange={e=>setBackupGmailTarget(e.target.value)} autoComplete="off" />
                        <button className="btn-primary" style={{width:'100%',background:'#ea4335'}} onClick={sendBackupByEmail} disabled={backupEmailSending}>
                          {backupEmailSending ? '⏳ جارٍ الفتح...' : '📤 فتح Gmail + تنزيل'}
                        </button>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>سيُفتح Gmail وتُنزّل ملف JSON معاً</div>
                      </div>
                    </div>
                  </div>
                )}

                {!backupData && !backupLoading && (
                  <div style={{textAlign:'center',padding:'24px 0',color:'var(--muted)'}}>
                    <div style={{fontSize:32,marginBottom:8}}>💾</div>
                    <div>اضغط "تحميل البيانات" لمعرفة حجم البيانات بالميجابايت والنسخ</div>
                  </div>
                )}

                {/* فاصل */}
                <div style={{height:1,background:'var(--border2)',margin:'16px 0'}} />

                {/* استعادة النسخة الاحتياطية */}
                <div style={{background:'var(--bg)',borderRadius:14,padding:16,border:'1.5px solid var(--border2)'}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>📂 استعادة نسخة احتياطية</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>ارفع ملف JSON لاستعادة البيانات — لن تُحذف البيانات الموجودة، بل ستُضاف إليها</div>

                  {restoreStep === 'idle' && (
                    <label style={{cursor:'pointer',display:'inline-block',background:'var(--accent)',color:'#fff',borderRadius:10,padding:'10px 20px',fontSize:13,fontWeight:700}}>
                      📂 رفع ملف النسخة (.json)
                      <input type="file" accept=".json,application/json" onChange={handleRestoreFileSelect} style={{display:'none'}} autoComplete="off" />
                    </label>
                  )}

                  {restoreStep === 'confirm' && restoreFile && (
                    <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:16}}>
                      <div style={{fontWeight:800,fontSize:15,marginBottom:10}}>⚠️ تأكيد الاستعادة</div>
                      <div style={{fontSize:13,marginBottom:6}}>الملف: <strong>{restoreFileName}</strong> — {restoreSizeMB} MB</div>
                      <div style={{fontSize:13,marginBottom:6}}>تاريخ النسخة: <strong>{restoreFile.exportedAt ? new Date(restoreFile.exportedAt).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'غير معروف'}</strong></div>
                      <div style={{background:'#fff',borderRadius:10,padding:12,marginBottom:14,border:'1px solid #fde68a',fontSize:13,lineHeight:1.7}}>
                        <strong>📌 ملاحظة مهمة:</strong><br/>
                        • البيانات الموجودة حالياً <strong>لن تُحذف</strong><br/>
                        • السجلات الجديدة في الملف ستُضاف<br/>
                        • السجلات المكررة (نفس الـ ID) ستُحدَّث بقيم الملف<br/>
                        • بيانات المستخدمين (المدير/المشرفين) <strong>لن تُستعاد</strong> لأسباب أمنية
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <button className="btn-primary" onClick={doRestore} style={{flex:1}}>✅ تأكيد الاستعادة</button>
                        <button style={{flex:1,padding:'10px 16px',borderRadius:10,border:'1.5px solid var(--border2)',background:'var(--white)',fontWeight:600,cursor:'pointer'}} onClick={()=>{setRestoreStep('idle');setRestoreFile(null);}}>إلغاء</button>
                      </div>
                    </div>
                  )}

                  {restoreStep === 'restoring' && (
                    <div style={{textAlign:'center',padding:'20px 0'}}>
                      <div className="spinner" style={{margin:'0 auto 12px'}} />
                      <div style={{fontWeight:600,color:'var(--muted)'}}>جارٍ استعادة البيانات...</div>
                    </div>
                  )}

                  {restoreStep === 'done' && (
                    <div style={{textAlign:'center',padding:'16px 0'}}>
                      <div style={{fontSize:28,marginBottom:8}}>{restoreResult.startsWith('✅') ? '✅' : '❌'}</div>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>{restoreResult}</div>
                      <button className="btn-secondary" onClick={()=>{setRestoreStep('idle');setRestoreFile(null);setRestoreResult('');}}>
                        🔄 استعادة أخرى
                      </button>
                    </div>
                  )}
                </div>
              </div>
                          </div>)}
                          {s.key === 'reset' && (<div>

                {/* تنبيه البيانات المحمية */}
                <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:12,marginBottom:16,fontSize:13}}>
                  <strong>⚠️ ملاحظة هامة:</strong> بيانات المشرفين والطيارين وكل ما يخصهم (السلف، الخصومات، المكافآت، الزي، المسويات، المرتجعات) <strong>محمية تماماً</strong> ولا يمكن للأدمن حذفها.
                </div>

                {resetStep === 'select' && (
                  <>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>اختر ما تريد حذفه:</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                      {RESET_OPTIONS.map(opt => (
                        <label key={opt.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,border:`1.5px solid ${resetChecked.includes(opt.key)?'var(--danger)':'var(--border2)'}`,background:resetChecked.includes(opt.key)?'#fff5f5':'var(--white)',cursor:'pointer',transition:'all .2s'}}>
                          <input
                            type="checkbox"
                            checked={resetChecked.includes(opt.key)}
                            onChange={() => toggleResetCheck(opt.key)}
                            style={{width:16,height:16,accentColor:'var(--danger)',cursor:'pointer'}} autoComplete="off" />
                          <span style={{fontWeight:600,fontSize:13,color:opt.warn?'#b45309':undefined}}>
                            {opt.warn && '⚠️ '}{opt.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div style={{display:'flex',gap:10}}>
                      <button
                        style={{flex:1,padding:'12px',borderRadius:12,border:'none',background:resetChecked.length===0?'var(--border2)':'var(--danger)',color:'#fff',fontWeight:700,fontSize:14,cursor:resetChecked.length===0?'not-allowed':'pointer',transition:'all .2s'}}
                        disabled={resetChecked.length===0}
                        onClick={()=>setResetStep('confirm-backup')}
                      >
                        🗑️ حذف المحدد ({resetChecked.length} عنصر)
                      </button>
                      {resetChecked.length > 0 && (
                        <button style={{padding:'12px 16px',borderRadius:12,border:'1.5px solid var(--border2)',background:'var(--white)',fontWeight:600,cursor:'pointer'}} onClick={()=>setResetChecked([])}>إلغاء الكل</button>
                      )}
                    </div>
                  </>
                )}

                {resetStep === 'confirm-backup' && (
                  <div style={{textAlign:'center',padding:'10px 0'}}>
                    <div style={{fontSize:42,marginBottom:12}}>💾</div>
                    <div style={{fontWeight:800,fontSize:18,marginBottom:8,color:'var(--danger)'}}>هل أنت متأكد من الحذف؟</div>
                    <div style={{fontSize:14,color:'var(--muted)',marginBottom:6}}>ستُحذف: {resetChecked.map(k=>RESET_OPTIONS.find(o=>o.key===k)?.label||k).join('، ')}</div>
                    <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:12,padding:14,marginBottom:20,fontSize:14,fontWeight:600}}>
                      هل قمت بعمل نسخة احتياطية للبيانات؟
                    </div>
                    <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                      <button className="btn-primary" style={{background:'var(--accent)'}} onClick={()=>{setResetStep('select');openModal('backup_before_reset');}}>
                        💾 عمل نسخة احتياطية أولاً
                      </button>
                      <button style={{padding:'12px 20px',borderRadius:12,border:'none',background:'var(--danger)',color:'#fff',fontWeight:700,cursor:'pointer'}} onClick={()=>setResetStep('confirm-final')}>
                        تجاهل والمتابعة ←
                      </button>
                      <button style={{padding:'12px 16px',borderRadius:12,border:'1.5px solid var(--border2)',background:'var(--white)',fontWeight:600,cursor:'pointer'}} onClick={()=>setResetStep('select')}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 'confirm-final' && (
                  <div style={{textAlign:'center',padding:'10px 0'}}>
                    <div style={{fontSize:42,marginBottom:12}}>⚠️</div>
                    <div style={{fontWeight:800,fontSize:18,marginBottom:8,color:'var(--danger)'}}>تأكيد نهائي — لا يمكن التراجع!</div>
                    <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>سيتم حذف: <strong>{resetChecked.map(k=>RESET_OPTIONS.find(o=>o.key===k)?.label||k).join('، ')}</strong></div>
                    <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                      <button style={{flex:1,padding:'14px 28px',borderRadius:12,border:'none',background:'var(--danger)',color:'#fff',fontWeight:800,fontSize:15,cursor:resetLoading?'not-allowed':'pointer'}} onClick={doReset} disabled={resetLoading}>
                        {resetLoading ? '⏳ جارٍ الحذف...' : '🗑️ نعم، احذف الآن'}
                      </button>
                      <button style={{flex:1,padding:'14px 20px',borderRadius:12,border:'1.5px solid var(--border2)',background:'var(--white)',fontWeight:600,cursor:'pointer'}} onClick={()=>setResetStep('select')}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
                          )}
                          {s.key === 'regions' && (<div>
              <div className="section-card-body">
                <button className="btn-primary" style={{width:'100%'}} onClick={() => { setSettingsSection(null); openModal('manageRegions'); }}>
                  🗺️ فتح إدارة المناطق
                </button>
              </div>
                          </div>)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

          </div>

          {/* Placeholder views */}
          <div className={`view ${view === 'reports' ? 'active' : ''}`}>
            <div className="section-card">
              <div className="section-card-header"><div className="section-card-title">📈 التقارير</div></div>
              <div className="section-card-body"><div className="empty">التقارير قيد التطوير</div></div>
            </div>
          </div>
          </div>
        </main>
      </div>

      {/* =================== MODALS =================== */}

      {/* تفاصيل مشرف */}
      {modal === 'supDetail' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">👮 تفاصيل المشرف</div>
            {supLoading ? <div className="spinner"></div> : supDetail && (() => {
              const sup = supDetail.supervisor;
              const pilots = supDetail.pilots || [];
              const receivables = supDetail.receivables || [];
              const funding = supDetail.funding || [];

              // filter receivables
              const filtRec = receivables.filter((r:any) => {
                if (supRecFilter.kind && r.kind !== supRecFilter.kind) return false;
                if (supRecFilter.pilot && !r.pilotName?.includes(supRecFilter.pilot)) return false;
                if (supRecFilter.dateFrom && new Date(r.date) < new Date(supRecFilter.dateFrom)) return false;
                if (supRecFilter.dateTo && new Date(r.date) > new Date(supRecFilter.dateTo + 'T23:59:59')) return false;
                return true;
              });

              // filter funding
              const filtFund = funding.filter((f:any) => {
                if (supFundFilter.dateFrom && new Date(f.date) < new Date(supFundFilter.dateFrom)) return false;
                if (supFundFilter.dateTo && new Date(f.date) > new Date(supFundFilter.dateTo + 'T23:59:59')) return false;
                return true;
              });

              return (
                <>
                  {/* Header */}
                  <div style={{background:'var(--bg)',borderRadius:18,padding:20,marginBottom:16,border:'1px solid var(--border2)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:14}}>
                        <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',flexShrink:0}}>👮</div>
                        <div style={{fontWeight:800,fontSize:18}}>{sup?.name}</div>
                      </div>
                      <button className="btn-secondary" style={{height:36,fontSize:13,flexShrink:0,width:'auto'}} onClick={() => openModal('editSupervisor', {
                        editName: sup?.name, editPhone: sup?.phone,
                        editRegions: sup?.regions || (sup?.region ? sup.region.split(',').map((r:string)=>r.trim()).filter(Boolean) : []),
                        editBaseSalary: sup?.base_salary,
                        editCompanyIds: sup?.companyIds || (sup?.company_id ? sup.company_id.split(',').map((c:string)=>c.trim()).filter(Boolean) : []),
                      })}>✏️ تعديل</button>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center',marginBottom:14}}>
                      {sup?.regions && sup.regions.map((r:string,i:number) => <span key={i} style={{display:'inline-block',background:'var(--accent-bg)',color:'var(--accent)',borderRadius:10,padding:'3px 10px',fontSize:12,fontWeight:600}}>📍{r}</span>)}
                      {sup?.companyNames && sup.companyNames.map((c:string,i:number) => <span key={i} style={{display:'inline-block',background:'#f0faf5',color:'#1a8a5a',borderRadius:10,padding:'3px 10px',fontSize:12,fontWeight:600}}>🏢{c}</span>)}
                      {sup?.phone && <span style={{fontSize:12,color:'var(--muted)',padding:'3px 6px'}}>📞{sup.phone}</span>}
                    </div>
                    <div className="pilot-stats">
                      <div className="pilot-stat"><div className="pilot-stat-label">الطيارون</div><div className="pilot-stat-value" style={{color:'var(--accent)'}}>{pilots.length}</div></div>
                      <div className="pilot-stat"><div className="pilot-stat-label">المستحقات</div><div className="pilot-stat-value" style={{color:'var(--danger)'}}>{fmt(supDetail.totalDue||0)} ج</div></div>
                      <div className="pilot-stat"><div className="pilot-stat-label">التمويل</div><div className="pilot-stat-value" style={{color:'var(--success)'}}>{fmt(supDetail.totalFunded||0)} ج</div></div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{display:'flex',gap:8,marginBottom:16,borderBottom:'2px solid var(--border2)',paddingBottom:0}}>
                    {[{id:'pilots',label:'✈️ الطيارون'},{id:'receivables',label:'💸 المستحقات'},{id:'funding',label:'💰 التمويل'},{id:'equipCost',label:'📦 تكلفة المعدات'}].map(t => (
                      <button key={t.id} onClick={() => {
                        setSupDetailTab(t.id);
                        if (t.id === 'equipCost' && sup?.id) {
                          setSupEquipCostLoading(true);
                          apiGet('getSupEquipCost', { supervisorId: sup.id }).then((res: any) => {
                            const rows = res.data || [];
                            const nameMap: Record<string,string> = {};
                            companies.forEach((c: any) => { nameMap[c.id] = c.name; });
                            setSupEquipCost(rows.map((r: any) => ({ ...r, company_name: r.company_name || nameMap[r.company_id] || r.company_id || '—' })));
                            setSupEquipCostLoading(false);
                          });
                        }
                      }} style={{padding:'10px 18px',border:'none',background:'none',cursor:'pointer',fontWeight:700,fontSize:14,color:supDetailTab===t.id?'var(--accent)':'var(--muted)',borderBottom:supDetailTab===t.id?'2px solid var(--accent)':'2px solid transparent',marginBottom:'-2px',fontFamily:'var(--font)'}}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Pilots */}
                  {supDetailTab === 'pilots' && (
                    <div style={{maxHeight:300,overflowY:'auto',marginBottom:16}}>
                      {pilots.length === 0 ? <div className="empty">لا يوجد طيارون</div> : pilots.map((p:any) => (
                        <div key={p.id} className="sup-card" style={{marginBottom:8}} onClick={() => openPilotDetail(p.id)}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:40,height:40,borderRadius:12,background:'var(--accent-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✈️</div>
                            <div>
                              <div style={{fontWeight:700,fontSize:15}}>{p.name} <span style={{background:'var(--accent-bg)',color:'var(--accent)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>{p.pilot_code}</span></div>
                              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>راتب أساسي: {fmt(p.base_salary)} ج &nbsp;|&nbsp; سلف: {fmt(p.totalAdvances)} ج &nbsp;|&nbsp; خصومات: {fmt(p.totalDeductions)} ج</div>
                            </div>
                          </div>
                          <div style={{textAlign:'left'}}>
                            <div style={{fontSize:11,color:'var(--muted)'}}>صافي الراتب</div>
                            <div style={{color:'var(--accent)',fontWeight:800,fontSize:16}}>{fmt(p.netSalary)} ج</div>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab: Receivables */}
                  {supDetailTab === 'receivables' && (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
                        <select className="form-select" style={{height:36,fontSize:13}} value={supRecFilter.kind} onChange={e=>setSupRecFilter(p=>({...p,kind:e.target.value}))}>
                          <option value="">كل الأنواع</option>
                          <option value="سلفة">سلفة</option>
                          <option value="خصم">خصم</option>
                          <option value="مكافأة">مكافأة</option>
                        </select>
                        <input className="form-input" style={{height:36,fontSize:13}} placeholder="بحث بالطيار" value={supRecFilter.pilot} onChange={e=>setSupRecFilter(p=>({...p,pilot:e.target.value}))} autoComplete="off" />
                        <input className="form-input" style={{height:36,fontSize:13}} type="date" value={supRecFilter.dateFrom} onChange={e=>setSupRecFilter(p=>({...p,dateFrom:e.target.value}))} autoComplete="off" />
                        <input className="form-input" style={{height:36,fontSize:13}} type="date" value={supRecFilter.dateTo} onChange={e=>setSupRecFilter(p=>({...p,dateTo:e.target.value}))} autoComplete="off" />
                      </div>
                      <div style={{maxHeight:260,overflowY:'auto',marginBottom:16}}>
                        {filtRec.length === 0 ? <div className="empty">لا توجد نتائج</div> : filtRec.map((r:any,i:number) => (
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,border:'1.5px solid var(--border2)',marginBottom:8,background:'var(--white)'}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:14}}>{r.pilotName} <span style={{fontSize:12,color:'var(--muted)',fontWeight:400}}>({r.pilotCode})</span></div>
                              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{r.reason||'-'} &nbsp;|&nbsp; {fmtDate(r.date)}</div>
                            </div>
                            <div style={{textAlign:'left'}}>
                              <div style={{fontSize:11,color:'var(--muted)'}}>{r.kind}</div>
                              <div style={{fontWeight:800,fontSize:15,color:r.kind==='مكافأة'?'var(--success)':r.kind==='سلفة'?'var(--warning)':'var(--danger)'}}>{fmt(r.amount)} ج</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Tab: Funding */}
                  {supDetailTab === 'funding' && (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                        <input className="form-input" style={{height:36,fontSize:13}} type="date" placeholder="من تاريخ" value={supFundFilter.dateFrom} onChange={e=>setSupFundFilter(p=>({...p,dateFrom:e.target.value}))} autoComplete="off" />
                        <input className="form-input" style={{height:36,fontSize:13}} type="date" placeholder="إلى تاريخ" value={supFundFilter.dateTo} onChange={e=>setSupFundFilter(p=>({...p,dateTo:e.target.value}))} autoComplete="off" />
                      </div>
                      <div style={{marginBottom:10,fontSize:13,color:'var(--muted)',fontWeight:600}}>
                        إجمالي التمويل المعروض: <span style={{color:'var(--accent)',fontWeight:700}}>{fmt(filtFund.reduce((s:number,f:any)=>s+(Number(f.amount)||0),0))} ج</span>
                      </div>
                      <div style={{maxHeight:260,overflowY:'auto',marginBottom:16}}>
                        {filtFund.length === 0 ? <div className="empty">لا توجد سجلات تمويل</div> : filtFund.map((f:any) => (
                          <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:12,border:'1.5px solid var(--border2)',marginBottom:8,background:'var(--white)'}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:14}}>{f.note||'تمويل'}</div>
                              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>بواسطة: {f.sent_by||'-'} &nbsp;|&nbsp; {fmtDate(f.date)}</div>
                            </div>
                            <div style={{color:'var(--success)',fontWeight:800,fontSize:16}}>{fmt(f.amount)} ج</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Tab: Equipment Cost */}
                  {supDetailTab === 'equipCost' && (() => {
                    if (supEquipCostLoading) return <div className="spinner" style={{margin:'30px auto'}}></div>;
                    if (supEquipCost.length === 0) return <div className="empty">لا توجد معدات مرسلة لهذا المشرف</div>;
                    // group by type
                    const grouped: Record<string, any[]> = {};
                    supEquipCost.forEach((item: any) => {
                      if (!grouped[item.type]) grouped[item.type] = [];
                      grouped[item.type].push(item);
                    });
                    const totalCost = supEquipCost.reduce((s: number, i: any) => s + (Number(i.price) * Number(i.qty)), 0);
                    return (
                      <>
                        <div style={{marginBottom:10,fontSize:13,color:'var(--muted)',fontWeight:600}}>
                          إجمالي تكلفة المعدات: <span style={{color:'var(--accent)',fontWeight:700}}>{fmt(totalCost)} ج</span>
                        </div>
                        <div style={{maxHeight:320,overflowY:'auto',marginBottom:8}}>
                          {Object.entries(grouped).map(([type, items]: [string, any[]]) => {
                            const typeTotal = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
                            return (
                              <div key={type} style={{marginBottom:12,borderRadius:12,border:'1.5px solid var(--border2)',overflow:'hidden'}}>
                                <div style={{background:'var(--accent-bg,#f0faf5)',padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6}}>{renderIcon(UI[type]||'', 22)} {UL[type]||type}</span>
                                  <span style={{fontWeight:700,color:'var(--accent)',fontSize:13}}>{fmt(typeTotal)} ج</span>
                                </div>
                                {items.map((item: any, idx: number) => (
                                  <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderTop:'1px solid var(--border2)',background:'var(--white)'}}>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:600}}>{item.qty} قطعة × {fmt(item.price)} ج</div>
                                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                                        🏢 {item.company_name || item.company_id || '—'} &nbsp;|&nbsp; 📅 {fmtDate(item.date)}
                                      </div>
                                    </div>
                                    <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{fmt(Number(item.price) * Number(item.qty))} ج</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}

                  <div style={{display:'flex',gap:10}}>
                    <button className="btn-primary" style={{fontSize:14,height:44}} onClick={() => { closeModal(); openModal('addFunding', { supId: sup?.id }); }}>📤 إرسال تمويل</button>
                    <button className="btn-secondary" style={{height:44}} onClick={closeModal}>إغلاق</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* تعديل بيانات المشرف */}
      {modal === 'editSupervisor' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">✏️ تعديل بيانات المشرف</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            <div className="form-group">
              <label className="form-label">الاسم</label>
              <input className="form-input" type="text" value={modalData.editName||''} onChange={e=>setModalData((p:any)=>({...p,editName:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">الهاتف</label>
              <input className="form-input" type="text" value={modalData.editPhone||''} onChange={e=>setModalData((p:any)=>({...p,editPhone:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">المناطق</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'8px 0'}}>
                {regions.map((r:any) => {
                  const selected = (modalData.editRegions||[]).includes(r.name);
                  return (
                    <button key={r.id} type="button"
                      onClick={() => setModalData((p:any) => ({
                        ...p,
                        editRegions: selected
                          ? (p.editRegions||[]).filter((x:string)=>x!==r.name)
                          : [...(p.editRegions||[]), r.name]
                      }))}
                      style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',cursor:'pointer',fontSize:13,fontFamily:'var(--font)',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? '#fff' : 'var(--fg)',
                        borderColor: selected ? 'var(--accent)' : 'var(--border2)',
                        fontWeight: selected ? 700 : 400,
                      }}>{r.name}</button>
                  );
                })}
                {regions.length === 0 && <span style={{color:'var(--muted)',fontSize:13}}>لا توجد مناطق مضافة</span>}
              </div>
              {(modalData.editRegions||[]).length > 0 && (
                <div style={{fontSize:12,color:'var(--accent)',marginTop:4}}>
                  المحددة: {(modalData.editRegions||[]).join(' • ')}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">الراتب الأساسي</label>
              <input className="form-input" type="number" value={modalData.editBaseSalary||''} onChange={e=>setModalData((p:any)=>({...p,editBaseSalary:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">الشركات</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'8px 0'}}>
                {companies.map((c:any) => {
                  const selected = (modalData.editCompanyIds||[]).includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setModalData((p:any) => ({
                        ...p,
                        editCompanyIds: selected
                          ? (p.editCompanyIds||[]).filter((x:string)=>x!==c.id)
                          : [...(p.editCompanyIds||[]), c.id]
                      }))}
                      style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',cursor:'pointer',fontSize:13,fontFamily:'var(--font)',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? '#fff' : 'var(--fg)',
                        borderColor: selected ? 'var(--accent)' : 'var(--border2)',
                        fontWeight: selected ? 700 : 400,
                      }}>🏢 {c.name}</button>
                  );
                })}
                {companies.length === 0 && <span style={{color:'var(--muted)',fontSize:13}}>لا توجد شركات مضافة</span>}
              </div>
              {(modalData.editCompanyIds||[]).length > 0 && (
                <div style={{fontSize:12,color:'var(--accent)',marginTop:4}}>
                  المحددة: {(modalData.editCompanyIds||[]).map((id:string)=>companies.find((c:any)=>c.id===id)?.name).filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doUpdateSupervisor}>{modalLoading?'...':'حفظ التعديلات'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={() => { closeModal(); openModal('supDetail'); }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* تفاصيل طيار */}
      {modal === 'pilotDetail' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">✈️ تفاصيل الطيار</div>
            {!pilotDetail ? <div className="spinner"></div> : (
              <>
                <div style={{background:'var(--bg)',borderRadius:18,padding:20,marginBottom:20,border:'1px solid var(--border2)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                    <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'#fff',flexShrink:0}}>✈️</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:17}}>{pilotDetail.pilot?.name} <span style={{background:'var(--accent-bg)',color:'var(--accent)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>{pilotDetail.pilot?.pilotCode}</span></div>
                      {pilotDetail.pilot?.phone && <div style={{color:'var(--muted)',fontSize:13,marginTop:3}}>📞 {pilotDetail.pilot.phone}</div>}
                    </div>
                  </div>
                  <div className="pilot-stats" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
                    {[
                      { label:'الراتب الأساسي', value:fmt(pilotDetail.pilot?.baseSalary)+' ج', color:'var(--accent)' },
                      { label:'صافي الراتب',   value:fmt(pilotDetail.summary?.netSalary)+' ج', color:'var(--success)' },
                      { label:'السلف',         value:fmt(pilotDetail.summary?.totalAdvances)+' ج', color:'var(--danger)' },
                      { label:'المكافآت',      value:fmt(pilotDetail.summary?.totalBonuses)+' ج', color:'var(--warning)' },
                    ].map(item => (
                      <div key={item.label} className="pilot-stat">
                        <div className="pilot-stat-label">{item.label}</div>
                        <div className="pilot-stat-value" style={{color:item.color}}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn-secondary" style={{width:'100%'}} onClick={closeModal}>إغلاق</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* إضافة تمويل */}
      {modal === 'addFunding' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">💰 إرسال تمويل</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            <div className="form-group">
              <label className="form-label">المشرف</label>
              <select className="form-select" value={modalData.supId||''} onChange={e => setModalData((p:any)=>({...p,supId:e.target.value}))}>
                <option value="">اختر المشرف</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}{s.regions && s.regions.length > 0 ? ' - ' + s.regions.join(' • ') : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ (ج.م)</label>
              <input className="form-input" type="number" placeholder="0" value={modalData.amount||''} onChange={e => setModalData((p:any)=>({...p,amount:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظة (اختياري)</label>
              <input className="form-input" placeholder="ملاحظة..." value={modalData.note||''} onChange={e => setModalData((p:any)=>({...p,note:e.target.value}))} autoComplete="off" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doAddFunding}>{modalLoading?'...':'إرسال التمويل'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إيداع وسحب رصيد */}
      {modal === 'addBalance' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">💼 إيداع وسحب رصيد</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            <div className="form-group">
              <label className="form-label">نوع العملية</label>
              <select className="form-select" value={modalData.direction||'in'} onChange={e => setModalData((p:any)=>({...p,direction:e.target.value}))}>
                <option value="in">إيداع رصيد ⬆️</option>
                <option value="out">سحب رصيد ⬇️</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ</label>
              <input className="form-input" type="number" placeholder="0" value={modalData.amount||''} onChange={e => setModalData((p:any)=>({...p,amount:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظة</label>
              <input className="form-input" placeholder="ملاحظة..." value={modalData.note||''} onChange={e => setModalData((p:any)=>({...p,note:e.target.value}))} autoComplete="off" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doAddBalance}>{modalLoading?'...':'حفظ'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إضافة مخزون */}
      {modal === 'addInventory' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">📦 إضافة مخزون</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            <div className="form-group">
              <label className="form-label">🏢 الشركة</label>
              <select className="form-select" value={modalData.companyId||''} onChange={e => setModalData((p:any)=>({...p,companyId:e.target.value}))}>
                <option value="">اختر الشركة</option>
                {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">النوع</label>
              <select className="form-select" value={modalData.type||''} onChange={e => setModalData((p:any)=>({...p,type:e.target.value}))}>
                <option value="">اختر النوع</option>
                {(modalData.companyId ? getTypesForCompany(modalData.companyId) : TYPES).map(t => <option key={t} value={t}>{iconText(UI[t])} {UL[t]}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الكمية</label>
                <input className="form-input" type="number" placeholder="0" value={modalData.qty||''} onChange={e => setModalData((p:any)=>({...p,qty:e.target.value}))} autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label">سعر القطعة</label>
                <input className="form-input" type="number" placeholder="0" value={modalData.price||''} onChange={e => setModalData((p:any)=>({...p,price:e.target.value}))} autoComplete="off" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">حالة المعدة <span style={{color:'var(--danger)'}}>*</span></label>
              <div style={{display:'flex',gap:8}}>
                {[{val:'new',label:'جديد',bg:'#dcfce7',color:'#16a34a'},{val:'good',label:'جيدة',bg:'#dbeafe',color:'#2563eb'},{val:'damaged',label:'تالف',bg:'#fee2e2',color:'#dc2626'}].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setModalData((p:any)=>({...p,condition:opt.val}))}
                    style={{flex:1,padding:'10px 4px',borderRadius:10,border:`2px solid ${modalData.condition===opt.val?opt.color:'var(--border)'}`,background:modalData.condition===opt.val?opt.bg:'var(--bg)',color:modalData.condition===opt.val?opt.color:'var(--muted)',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .15s'}}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doAddInventory}>{modalLoading?'...':'إضافة'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* إرسال مخزون */}
                  {modal === 'sendInventory' && (() => {
        const typePrices = (modalData.type && modalData.companyId)
          ? (invPrices[modalData.type] || []).filter((pr: any) => pr.company_id === modalData.companyId)
          : [];
        const multiPrice = typePrices.length > 1;
        return (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">📤 إرسال معدات لمشرف</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            {multiPrice && (
              <div style={{background:'var(--warning-bg,#fffbe6)',border:'1px solid var(--warning,#f59e0b)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--warning-dark,#92400e)',display:'flex',alignItems:'center',gap:8}}>
                ⚠️ يوجد أكثر من سعر لهذا النوع — يجب تحديد السعر أولاً
              </div>
            )}
            <div className="form-group">
              <label className="form-label">الشركة <span style={{color:'var(--danger)',fontWeight:700}}>*</span></label>
              <select className="form-select" value={modalData.companyId||''} onChange={e => setModalData((p:any)=>({...p,companyId:e.target.value,type:undefined,selectedPrice:undefined,selectedCompanyId:undefined,selectedCondition:undefined}))}>
                <option value="">— اختر الشركة —</option>
                {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المشرف</label>
              <select className="form-select" value={modalData.supId||''} onChange={e => setModalData((p:any)=>({...p,supId:e.target.value}))}>
                <option value="">اختر المشرف</option>
                {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}{s.regions && s.regions.length > 0 ? ' - ' + s.regions.join(' • ') : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">النوع</label>
              <select className="form-select" disabled={!modalData.companyId} value={modalData.type||''} onChange={e => {
                  const newType = e.target.value;
                  if (newType && ((companyInvSummary[modalData.companyId]?.inventory?.[newType]?.remaining) ?? 0) === 0) {
                    showToast('❌ لا يوجد كمية من هذا النوع');
                    return;
                  }
                  setModalData((p:any)=>({...p,type:newType,selectedPrice:undefined,selectedCompanyId:undefined,selectedCondition:undefined}));
                }}>
                <option value="">{modalData.companyId ? 'اختر النوع' : 'اختر الشركة أولاً'}</option>
                {(modalData.companyId ? getTypesForCompany(modalData.companyId) : TYPES).map(t => {
                  const qty = (companyInvSummary[modalData.companyId]?.inventory?.[t]?.remaining) ?? 0;
                  return <option key={t} value={t}>{iconText(UI[t])} {UL[t]} — الكمية: {qty}</option>;
                })}
              </select>
            </div>
            {modalData.companyId && modalData.type && typePrices.length > 0 && (
              <div className="form-group">
                <label className="form-label">السعر {multiPrice && <span style={{color:'var(--danger)',fontWeight:700}}>*</span>}</label>
                {multiPrice ? (
                  <select className="form-select" value={modalData.selectedPrice !== undefined ? `${modalData.selectedPrice}__${modalData.selectedCondition||''}` : ''} onChange={e => {
                    const parts = e.target.value.split('__');
                    setModalData((p:any) => ({...p, selectedPrice: parts[0] ? Number(parts[0]) : undefined, selectedCompanyId: p.companyId, selectedCondition: parts[1]||''}));
                  }}>
                    <option value="">— اختر السعر —</option>
                    {typePrices.map((pr:any,i:number) => {
                      const condLabel = pr.condition === 'good' ? 'جيدة' : pr.condition === 'damaged' ? 'تالف' : 'جديد';
                      return <option key={i} value={`${pr.price}__${pr.condition||'new'}`}>{pr.price} ج — {condLabel} — متاح: {(companyInvSummary[modalData.companyId]?.inventory?.[modalData.type]?.remaining) ?? 0} قطعة</option>;
                    })}
                  </select>
                ) : (
                  <div style={{padding:'8px 12px',background:'var(--bg2,#f8f9fa)',borderRadius:8,fontSize:13,color:'var(--muted)'}}>
                    السعر: <strong style={{color:'var(--fg)'}}>{typePrices[0]?.price} ج</strong>
                    {' — '}
                    <span style={{fontWeight:700,color: typePrices[0]?.condition==='damaged'?'#dc2626':typePrices[0]?.condition==='good'?'#2563eb':'#16a34a'}}>
                      {typePrices[0]?.condition === 'good' ? 'جيدة' : typePrices[0]?.condition === 'damaged' ? 'تالف' : 'جديد'}
                    </span>
                    {' — '}متاح: {(companyInvSummary[modalData.companyId]?.inventory?.[modalData.type]?.remaining) ?? 0} قطعة
                  </div>
                )}
              </div>
            )}
            {modalData.companyId && modalData.type && typePrices.length === 0 && (
              <div style={{padding:'8px 12px',background:'var(--bg2,#f8f9fa)',borderRadius:8,fontSize:13,color:'var(--muted)',marginBottom:12}}>
                لا يوجد مخزون من هذا النوع لهذه الشركة
              </div>
            )}
            <div className="form-group">
              <label className="form-label">الكمية</label>
              <input className="form-input" type="number" placeholder="0" value={modalData.qty||''} onChange={e => setModalData((p:any)=>({...p,qty:e.target.value}))} autoComplete="off" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading || !modalData.companyId || (multiPrice && modalData.selectedPrice === undefined)} onClick={doSendInventory}>{modalLoading?'...':'إرسال'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* تعديل نوع معدة */}
      {modal === 'editEqType' && (() => {
        const previewIcon = modalData.eqIcon || '';
        const cs = modalData.cropState || null;
        const displaySize = 260;
        const scale = cs ? displaySize / cs.naturalW : 1;
        const cropPx = cs ? cs.cropX * scale : 0;
        const cropPy = cs ? cs.cropY * scale : 0;
        const cropSz = cs ? cs.cropSize * scale : 0;

        function handleImgUploadEdit(e: any) {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev: any) => {
            const src = ev.target.result as string;
            const img = new window.Image();
            img.onload = () => {
              const size = Math.min(img.naturalWidth, img.naturalHeight);
              setModalData((p:any) => ({
                ...p, eqIcon: '',
                cropState: { src, cropX: Math.round((img.naturalWidth-size)/2), cropY: Math.round((img.naturalHeight-size)/2), cropSize: size, naturalW: img.naturalWidth, naturalH: img.naturalHeight }
              }));
            };
            img.src = src;
          };
          reader.readAsDataURL(file);
        }

        function applyCropEdit() {
          const cs2 = modalData.cropState;
          if (!cs2) return;
          const canvas = document.createElement('canvas');
          canvas.width = 120; canvas.height = 120;
          const ctx = canvas.getContext('2d')!;
          ctx.beginPath(); ctx.arc(60,60,60,0,Math.PI*2); ctx.clip();
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, cs2.cropX, cs2.cropY, cs2.cropSize, cs2.cropSize, 0, 0, 120, 120);
            setModalData((p:any) => ({ ...p, eqIcon: canvas.toDataURL('image/png'), cropState: null }));
          };
          img.src = cs2.src;
        }

        return (
          <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal" style={{maxWidth:520}}>
              <div className="modal-title">✏️ تعديل نوع المعدة</div>
              {modalErr && <div className="alert-error">{modalErr}</div>}

              {/* عرض الأيقونة الحالية */}
              {previewIcon && !cs && (
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--accent-bg)',borderRadius:10,marginBottom:12}}>
                  {(previewIcon.startsWith('data:') || previewIcon.startsWith('http'))
                    ? <img src={previewIcon} style={{width:52,height:52,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--accent)'}} />
                    : <span style={{fontSize:40}}>{previewIcon}</span>}
                  <span style={{fontWeight:700,fontSize:14}}>{modalData.eqLabel}</span>
                </div>
              )}

              {/* تبويبات الأيقونة */}
              <div className="form-group">
                <label className="form-label">تغيير الأيقونة (اختياري)</label>
                <div style={{display:'flex',gap:6,marginBottom:10}}>
                  <button onClick={() => setModalData((p:any)=>({...p,eqIconTab:'upload'}))}
                    style={{flex:1,padding:'6px 10px',border:'1.5px solid',borderColor:(modalData.eqIconTab||'upload')==='upload'?'var(--accent)':'var(--border)',borderRadius:8,background:(modalData.eqIconTab||'upload')==='upload'?'var(--accent-bg)':'var(--bg)',fontWeight:700,fontSize:12,cursor:'pointer',color:(modalData.eqIconTab||'upload')==='upload'?'var(--accent)':'var(--muted)'}}>
                    📁 رفع صورة
                  </button>
                  <button onClick={() => setModalData((p:any)=>({...p,eqIconTab:'library'}))}
                    style={{flex:1,padding:'6px 10px',border:'1.5px solid',borderColor:modalData.eqIconTab==='library'?'var(--accent)':'var(--border)',borderRadius:8,background:modalData.eqIconTab==='library'?'var(--accent-bg)':'var(--bg)',fontWeight:700,fontSize:12,cursor:'pointer',color:modalData.eqIconTab==='library'?'var(--accent)':'var(--muted)'}}>
                    🎨 مكتبة الأيقونات
                  </button>
                </div>
                {(modalData.eqIconTab||'upload') === 'upload' && (
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',border:'1.5px dashed var(--border)',borderRadius:10,background:'var(--bg2)'}}>
                    <span style={{fontSize:20}}>📁</span>
                    <span style={{fontSize:13,color:'var(--muted)'}}>اختر صورة جديدة من جهازك</span>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={handleImgUploadEdit} autoComplete="off" />
                  </label>
                )}
                {modalData.eqIconTab === 'library' && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,padding:'10px',background:'var(--bg2)',borderRadius:10,border:'1.5px solid var(--border)',maxHeight:200,overflowY:'auto'}}>
                    {ICON_LIBRARY.map(({icon: libIcon, label: iLabel}) => (
                      <button key={libIcon} title={iLabel} onClick={() => setModalData((p:any)=>({...p,eqIcon:libIcon,cropState:null}))}
                        style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 4px',border:'1.5px solid',borderColor:previewIcon===libIcon?'var(--accent)':'var(--border)',borderRadius:8,cursor:'pointer',background:previewIcon===libIcon?'var(--accent-bg)':'var(--bg)',fontSize:22,gap:2}}>
                        {libIcon}
                        <span style={{fontSize:8,color:'var(--muted)',lineHeight:1.2,textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',maxWidth:'100%'}}>{iLabel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {cs && (
                <div className="form-group">
                  <label className="form-label">اضبط الإطار الدائري</label>
                  <div style={{position:'relative',width:displaySize,height:displaySize*cs.naturalH/cs.naturalW,overflow:'hidden',borderRadius:8,border:'1.5px solid var(--border)',margin:'0 auto',userSelect:'none'}}
                    onMouseMove={e => {
                      if (!modalData._dragging) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const mx = (e.clientX - rect.left) / scale;
                      const my = (e.clientY - rect.top) / scale;
                      const half = cs.cropSize / 2;
                      setModalData((p:any) => ({...p, cropState: {...p.cropState,
                        cropX: Math.max(0, Math.min(cs.naturalW - cs.cropSize, mx - half)),
                        cropY: Math.max(0, Math.min(cs.naturalH - cs.cropSize, my - half))
                      }}));
                    }}
                    onMouseUp={() => setModalData((p:any) => ({...p, _dragging:false}))}
                    onMouseLeave={() => setModalData((p:any) => ({...p, _dragging:false}))}
                  >
                    <img src={cs.src} style={{width:displaySize,height:'auto',display:'block',pointerEvents:'none'}} draggable={false} />
                    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',pointerEvents:'none',
                      WebkitMaskImage:`url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${displaySize}' height='${Math.round(displaySize*cs.naturalH/cs.naturalW)}'><rect width='100%' height='100%' fill='white'/><circle cx='${cropPx+cropSz/2}' cy='${cropPy+cropSz/2}' r='${cropSz/2}' fill='black'/></svg>")`,
                      maskImage:`url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${displaySize}' height='${Math.round(displaySize*cs.naturalH/cs.naturalW)}'><rect width='100%' height='100%' fill='white'/><circle cx='${cropPx+cropSz/2}' cy='${cropPy+cropSz/2}' r='${cropSz/2}' fill='black'/></svg>")`
                    }} />
                    <div style={{position:'absolute',left:cropPx,top:cropPy,width:cropSz,height:cropSz,
                      border:'2.5px solid #fff',borderRadius:'50%',boxShadow:'0 0 0 1px rgba(0,0,0,0.4)',
                      cursor:'move',boxSizing:'border-box'}}
                      onMouseDown={e => { e.preventDefault(); setModalData((p:any) => ({...p, _dragging:true})); }}
                    />
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                    <span style={{fontSize:12,color:'var(--muted)'}}>حجم الدائرة</span>
                    <input type="range" min={30} max={Math.min(cs.naturalW, cs.naturalH)}
                      value={cs.cropSize}
                      onChange={e => setModalData((p:any) => ({...p, cropState: {...p.cropState, cropSize: Number(e.target.value)}}))}
                      style={{flex:1}} autoComplete="off" />
                  </div>
                  <button className="btn-primary" style={{width:'100%',marginTop:8}} onClick={applyCropEdit}>✂️ تطبيق القص الدائري</button>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">اسم النوع</label>
                <input className="form-input" value={modalData.eqLabel||''} onChange={e => setModalData((p:any)=>({...p,eqLabel:e.target.value}))} autoComplete="off" />
              </div>

              {/* نسخ النوع لشركة أخرى */}
              <div style={{background:'var(--bg2)',borderRadius:10,border:'1.5px solid var(--border)',padding:'12px 14px',marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>📋 نسخ هذا النوع لشركة أخرى</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select className="form-input" style={{flex:1,marginBottom:0}} value={modalData.copyToCompany||''} onChange={e => setModalData((p:any)=>({...p,copyToCompany:e.target.value}))}>
                    <option value="">اختر شركة</option>
                    {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn-secondary" disabled={modalLoading||!modalData.copyToCompany} style={{whiteSpace:'nowrap',height:38}} onClick={async () => {
                    if (!modalData.copyToCompany) return;
                    const baseKey = (modalData.eqLabel||'type').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^_+|_+$/g,'') || 'type';
                    const copyKey = baseKey + '_' + Date.now().toString().slice(-4);
                    setModalLoading(true);
                    const res = await api('addEquipmentType', { key: copyKey, icon: modalData.eqIcon, label: modalData.eqLabel, companyId: modalData.copyToCompany });
                    setModalLoading(false);
                    if (!res.success) { showToast('❌ ' + (res.message||'خطأ')); return; }
                    showToast('✅ تم نسخ النوع للشركة');
                    setModalData((p:any)=>({...p,copyToCompany:''}));
                    const eqRes = await apiGet('getEquipmentTypes');
                    if (eqRes.success) setEquipmentTypes(eqRes.data);
                  }}>نسخ</button>
                </div>
              </div>

              <div style={{display:'flex',gap:10}}>
                <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={async () => {
                  if (!modalData.eqLabel) { setModalErr('اسم النوع مطلوب'); return; }
                  setModalLoading(true);
                  const updateData: any = { id: modalData.eqId, label: modalData.eqLabel, key: modalData.eqKey };
                  if (modalData.eqIcon) updateData.icon = modalData.eqIcon;
                  const res = await api('updateEquipmentType', updateData);
                  setModalLoading(false);
                  if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
                  const eqRes = await apiGet('getEquipmentTypes');
                  if (eqRes.success) setEquipmentTypes(eqRes.data);
                  else if (modalData._pendingEqData) setEquipmentTypes(modalData._pendingEqData);
                  const statsRes2 = await apiGet('getManagerStats');
                  if (statsRes2.success) setStats(statsRes2);
                  showToast('✅ تم تحديث النوع'); closeModal();
                }}>{modalLoading?'...':'حفظ'}</button>
                <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
              </div>
            </div>
          </div>
        );
      })()}

      {modal === 'addEqType' && (() => {
        const cs = modalData.cropState || null;
        const displaySize = 240;
        const scale = cs ? displaySize / cs.naturalW : 1;
        const cropPx = cs ? cs.cropX * scale : 0;
        const cropPy = cs ? cs.cropY * scale : 0;
        const cropSz = cs ? cs.cropSize * scale : 0;
        const iconSource: 'upload'|'library'|'' = modalData.eqIconSource || '';
        const activeIcon = modalData.eqIcon || '';
        const previewLabel = (modalData.eqLabel||'').trim() || 'اسم النوع';

        function labelToKey(label: string) {
          return label.trim().toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .replace(/_+/g, '_')
            .substring(0, 30);
        }

        function handleLabelChange(val: string) {
          const autoKey = labelToKey(val);
          setModalData((p:any) => ({
            ...p,
            eqLabel: val,
            eqKey: p._keyEdited ? p.eqKey : autoKey
          }));
        }

        function handleKeyChange(val: string) {
          setModalData((p:any) => ({ ...p, eqKey: val, _keyEdited: true }));
        }

        function handleImgUploadAdd(e: any) {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev: any) => {
            const src = ev.target.result as string;
            const img = new window.Image();
            img.onload = () => {
              const size = Math.min(img.naturalWidth, img.naturalHeight);
              setModalData((p:any) => ({
                ...p, eqIcon: '', eqIconSource: 'upload', eqLibraryIcon: '',
                cropState: { src, cropX: Math.round((img.naturalWidth-size)/2), cropY: Math.round((img.naturalHeight-size)/2), cropSize: size, naturalW: img.naturalWidth, naturalH: img.naturalHeight }
              }));
            };
            img.src = src;
          };
          reader.readAsDataURL(file);
        }

        function applyCropAdd() {
          const cs2 = modalData.cropState;
          if (!cs2) return;
          const canvas = document.createElement('canvas');
          canvas.width = 120; canvas.height = 120;
          const ctx = canvas.getContext('2d')!;
          ctx.beginPath(); ctx.arc(60,60,60,0,Math.PI*2); ctx.clip();
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, cs2.cropX, cs2.cropY, cs2.cropSize, cs2.cropSize, 0, 0, 120, 120);
            setModalData((p:any) => ({ ...p, eqIcon: canvas.toDataURL('image/png'), eqIconSource: 'upload', cropState: null }));
          };
          img.src = cs2.src;
        }

        function selectLibraryIcon(icon: string) {
          setModalData((p:any) => ({ ...p, eqIcon: icon, eqIconSource: 'library', eqLibraryIcon: icon, cropState: null }));
        }

        function isDupName(name: string) {
          const n = name.trim().toLowerCase();
          // Check DB types
          if (equipmentTypes.some((t:any) => t.label?.trim().toLowerCase() === n)) return true;
          // Check default labels
          const defLabels = Object.values(DEFAULT_UL).map(l => l.toLowerCase());
          return defLabels.includes(n);
        }
        function isDupKey(key: string) {
          const k = key.trim().toLowerCase();
          if (equipmentTypes.some((t:any) => t.key?.trim().toLowerCase() === k)) return true;
          return DEFAULT_TYPES.includes(k);
        }

        async function doAddEqType() {
          const key = (modalData.eqKey||'').trim().toLowerCase();
          const label = (modalData.eqLabel||'').trim();
          if (!label) { setModalErr('اسم النوع مطلوب'); return; }
          if (!key) { setModalErr('المعرف الداخلي مطلوب'); return; }
          if (!activeIcon) { setModalErr('يجب اختيار أيقونة للنوع'); return; }
          if (!(modalData.eqCompanyId||'').trim() && modalData.eqCompanyId !== 'ALL') { setModalErr('يجب تحديد الشركة أو اختيار كل الشركات'); return; }
          if (!/^[a-z0-9_]+$/.test(key)) { setModalErr('المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط'); return; }
          if (isDupName(label)) { setModalErr('يوجد نوع معدات بنفس الاسم بالفعل'); return; }
          if (isDupKey(key)) { setModalErr('يوجد نوع معدات بنفس المعرف الداخلي بالفعل'); return; }
          setModalLoading(true);
          if (modalData.eqCompanyId === 'ALL') {
            // إضافة لكل الشركات
            let anyError = false;
            for (const comp of companies) {
              const r = await api('addEquipmentType', { key: key + '_' + comp.id.slice(0,4), icon: activeIcon, label, displayOrder: modalData.eqOrder ? Number(modalData.eqOrder) : undefined, companyId: comp.id });
              if (!r.success && r.message !== 'يوجد نوع معدات بنفس المعرف الداخلي بالفعل' && r.message !== 'يوجد نوع معدات بنفس الاسم بالفعل') { anyError = true; }
            }
            // Also add globally (no companyId)
            await api('addEquipmentType', { key, icon: activeIcon, label, displayOrder: modalData.eqOrder ? Number(modalData.eqOrder) : undefined, skipCompanyCheck: true });
            setModalLoading(false);
            if (anyError) { setModalErr('تمت الإضافة لبعض الشركات مع وجود أخطاء'); return; }
          } else {
            const res = await api('addEquipmentType', { key, icon: activeIcon, label, displayOrder: modalData.eqOrder ? Number(modalData.eqOrder) : undefined, companyId: modalData.eqCompanyId || null });
            setModalLoading(false);
            if (!res.success) { setModalErr(res.message || 'خطأ'); return; }
          }
          const eqRes = await apiGet('getEquipmentTypes');
          if (eqRes.success) setEquipmentTypes(eqRes.data);
          const statsRes2 = await apiGet('getManagerStats');
          if (statsRes2.success) setStats(statsRes2);
          showToast('✅ تم إضافة النوع'); closeModal();
        }

        const dupNameErr = (modalData.eqLabel||'').trim() ? isDupName((modalData.eqLabel||'').trim()) : false;
        const dupKeyErr = (modalData.eqKey||'').trim() ? isDupKey((modalData.eqKey||'').trim().toLowerCase()) : false;

        return (
          <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal" style={{maxWidth:760,width:'95vw',padding:0,overflow:'hidden',borderRadius:16}}>
              <div style={{padding:'18px 24px',borderBottom:'1.5px solid var(--border)',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontWeight:800,fontSize:17,color:'var(--text)'}}>➕ إضافة نوع معدة جديدة</div>
                <button onClick={closeModal} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--muted)',padding:'0 4px',lineHeight:1}}>✕</button>
              </div>
              <div style={{display:'flex',gap:0,flexWrap:'wrap'}}>
                {/* Left: Form */}
                <div style={{flex:'1 1 340px',padding:'20px 24px',borderLeft:'1.5px solid var(--border)',minWidth:0,overflowY:'auto',maxHeight:'72vh'}}>
                  {modalErr && <div className="alert-error" style={{marginBottom:14}}>{modalErr}</div>}
                  <div className="form-group">
                    <label className="form-label">اسم النوع <span style={{color:'var(--danger)'}}>*</span></label>
                    <input className="form-input" placeholder="مثال: خوذة طيران" value={modalData.eqLabel||''} onChange={e => handleLabelChange(e.target.value)} style={{borderColor: dupNameErr ? 'var(--danger)' : undefined}} autoComplete="off" />
                    {dupNameErr && <div style={{fontSize:11,color:'var(--danger)',marginTop:3}}>⚠️ يوجد نوع بنفس الاسم بالفعل</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">المعرف الداخلي <span style={{color:'var(--danger)'}}>*</span></label>
                    <input className="form-input" dir="ltr" placeholder="helmet_v2" value={modalData.eqKey||''} onChange={e => handleKeyChange(e.target.value)} style={{borderColor: dupKeyErr ? 'var(--danger)' : undefined}} autoComplete="off" />
                    <div style={{fontSize:11,color: dupKeyErr ? 'var(--danger)' : 'var(--muted)',marginTop:3}}>
                      {dupKeyErr ? '⚠️ يوجد نوع بنفس المعرف الداخلي بالفعل' : 'يُنشأ تلقائياً من الاسم — أحرف إنجليزية صغيرة وأرقام و"_" فقط'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ترتيب العرض</label>
                    <input className="form-input" type="number" min={1} placeholder="تلقائي" value={modalData.eqOrder||''} onChange={e => setModalData((p:any)=>({...p,eqOrder:e.target.value}))} autoComplete="off" />
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>اتركه فارغاً للترتيب التلقائي في نهاية القائمة</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الشركة <span style={{color:'var(--danger)'}}>*</span></label>
                    <select className="form-input" value={modalData.eqCompanyId||''} onChange={e => setModalData((p:any)=>({...p,eqCompanyId:e.target.value}))} style={{borderColor: !modalData.eqCompanyId && modalErr ? 'var(--danger)' : undefined}}>
                      <option value="">اختر شركة</option>
                      <option value="ALL">🏢 كل الشركات</option>
                      {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>اختر شركة محددة أو أضف النوع لكل الشركات</div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label className="form-label">الأيقونة <span style={{color:'var(--danger)'}}>*</span></label>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      <button onClick={() => setModalData((p:any)=>({...p,eqIconTab:'upload'}))}
                        style={{flex:1,padding:'7px 10px',border:'1.5px solid',borderColor:(modalData.eqIconTab||'upload')==='upload'?'var(--accent)':'var(--border)',borderRadius:8,background:(modalData.eqIconTab||'upload')==='upload'?'var(--accent-bg)':'var(--bg)',fontWeight:700,fontSize:12,cursor:'pointer',color:(modalData.eqIconTab||'upload')==='upload'?'var(--accent)':'var(--muted)'}}>
                        📁 رفع أيقونة
                      </button>
                      <button onClick={() => setModalData((p:any)=>({...p,eqIconTab:'library'}))}
                        style={{flex:1,padding:'7px 10px',border:'1.5px solid',borderColor:modalData.eqIconTab==='library'?'var(--accent)':'var(--border)',borderRadius:8,background:modalData.eqIconTab==='library'?'var(--accent-bg)':'var(--bg)',fontWeight:700,fontSize:12,cursor:'pointer',color:modalData.eqIconTab==='library'?'var(--accent)':'var(--muted)'}}>
                        🎨 مكتبة الأيقونات
                      </button>
                    </div>
                    {(modalData.eqIconTab||'upload') === 'upload' && (
                      <div>
                        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',border:'1.5px dashed var(--border)',borderRadius:10,background:'var(--bg2)',marginBottom: cs ? 12 : 0}}>
                          <span style={{fontSize:20}}>📁</span>
                          <div>
                            <div style={{fontSize:13,color:'var(--text)',fontWeight:600}}>اختر صورة من جهازك</div>
                            <div style={{fontSize:11,color:'var(--muted)'}}>PNG أو SVG</div>
                          </div>
                          <input type="file" accept="image/png,image/svg+xml" style={{display:'none'}} onChange={handleImgUploadAdd} autoComplete="off" />
                        </label>
                        {cs && (
                          <div style={{marginTop:8}}>
                            <div style={{position:'relative',width:displaySize,height:displaySize*cs.naturalH/cs.naturalW,overflow:'hidden',borderRadius:8,border:'1.5px solid var(--border)',margin:'0 auto',userSelect:'none'}}
                              onMouseMove={e => {
                                if (!modalData._dragging) return;
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const mx = (e.clientX - rect.left) / scale;
                                const my = (e.clientY - rect.top) / scale;
                                const half = cs.cropSize / 2;
                                setModalData((p:any) => ({...p, cropState: {...p.cropState,
                                  cropX: Math.max(0, Math.min(cs.naturalW - cs.cropSize, mx - half)),
                                  cropY: Math.max(0, Math.min(cs.naturalH - cs.cropSize, my - half))
                                }}));
                              }}
                              onMouseUp={() => setModalData((p:any) => ({...p, _dragging:false}))}
                              onMouseLeave={() => setModalData((p:any) => ({...p, _dragging:false}))}
                            >
                              <img src={cs.src} style={{width:displaySize,height:'auto',display:'block',pointerEvents:'none'}} draggable={false} />
                              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',pointerEvents:'none',
                                WebkitMaskImage:`url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${displaySize}' height='${Math.round(displaySize*cs.naturalH/cs.naturalW)}'><rect width='100%' height='100%' fill='white'/><circle cx='${cropPx+cropSz/2}' cy='${cropPy+cropSz/2}' r='${cropSz/2}' fill='black'/></svg>")`,
                                maskImage:`url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${displaySize}' height='${Math.round(displaySize*cs.naturalH/cs.naturalW)}'><rect width='100%' height='100%' fill='white'/><circle cx='${cropPx+cropSz/2}' cy='${cropPy+cropSz/2}' r='${cropSz/2}' fill='black'/></svg>")`
                              }} />
                              <div style={{position:'absolute',left:cropPx,top:cropPy,width:cropSz,height:cropSz,
                                border:'2.5px solid #fff',borderRadius:'50%',boxShadow:'0 0 0 1px rgba(0,0,0,0.4)',
                                cursor:'move',boxSizing:'border-box'}}
                                onMouseDown={e => { e.preventDefault(); setModalData((p:any) => ({...p, _dragging:true})); }}
                              />
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                              <span style={{fontSize:12,color:'var(--muted)'}}>حجم الدائرة</span>
                              <input type="range" min={30} max={Math.min(cs.naturalW, cs.naturalH)} value={cs.cropSize} onChange={e => setModalData((p:any) => ({...p, cropState: {...p.cropState, cropSize: Number(e.target.value)}}))} style={{flex:1}} autoComplete="off" />
                            </div>
                            <button className="btn-primary" style={{width:'100%',marginTop:8}} onClick={applyCropAdd}>✂️ تطبيق القص الدائري</button>
                          </div>
                        )}
                        {iconSource === 'upload' && activeIcon && !cs && (
                          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8,padding:'8px 12px',background:'var(--accent-bg)',borderRadius:8,border:'1px solid var(--accent)'}}>
                            <img src={activeIcon} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}} />
                            <span style={{fontSize:12,fontWeight:700,color:'var(--accent)'}}>✅ تم رفع الأيقونة</span>
                          </div>
                        )}
                      </div>
                    )}
                    {modalData.eqIconTab === 'library' && (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,padding:'10px',background:'var(--bg2)',borderRadius:10,border:'1.5px solid var(--border)',maxHeight:220,overflowY:'auto'}}>
                        {ICON_LIBRARY.map(({icon: libIcon, label: iLabel}) => (
                          <button key={libIcon} title={iLabel} onClick={() => selectLibraryIcon(libIcon)}
                            style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 4px',border:'1.5px solid',borderColor:(iconSource==='library'&&activeIcon===libIcon)?'var(--accent)':'var(--border)',borderRadius:8,cursor:'pointer',background:(iconSource==='library'&&activeIcon===libIcon)?'var(--accent-bg)':'var(--bg)',fontSize:22,transition:'all .15s',gap:2}}>
                            {libIcon}
                            <span style={{fontSize:8,color:'var(--muted)',lineHeight:1.2,textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',maxWidth:'100%'}}>{iLabel}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:10,marginTop:8}}>
                    <button className="btn-primary" disabled={modalLoading||dupNameErr||dupKeyErr} onClick={doAddEqType} style={{flex:1}}>
                      {modalLoading ? '...' : '✅ إضافة النوع'}
                    </button>
                    <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
                  </div>
                </div>
                {/* Right: Live Preview */}
                <div style={{flex:'0 0 200px',padding:'20px 16px',background:'var(--bg2)',display:'flex',flexDirection:'column',alignItems:'center',gap:16,borderTop:'1.5px solid var(--border)'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,width:'100%',textAlign:'center'}}>معاينة مباشرة</div>
                  <div className="inv-item" style={{width:'100%',pointerEvents:'none',cursor:'default',minHeight:110,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <div className="inv-icon">
                      {activeIcon
                        ? ((activeIcon.startsWith('data:')||activeIcon.startsWith('http'))
                            ? <img src={activeIcon} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover'}} />
                            : activeIcon)
                        : <span style={{fontSize:28,opacity:.3}}>❓</span>}
                    </div>
                    <div className="inv-label">{previewLabel}</div>
                    <div className="inv-qty" style={{color:'var(--success)'}}>0</div>
                    <div className="inv-sub">إجمالي: 0</div>
                  </div>
                  <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.5}}>هكذا ستبدو البطاقة في صفحة المخزن</div>
                  {(modalData.eqKey||'').trim() && (
                    <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',width:'100%',fontSize:11}}>
                      <div style={{color:'var(--muted)',marginBottom:2}}>المعرف الداخلي:</div>
                      <div style={{fontFamily:'monospace',fontWeight:700,color:'var(--text)',direction:'ltr'}}>{(modalData.eqKey||'').trim().toLowerCase()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {modal === 'addCompany' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">🏢 إضافة شركة جديدة</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            <div className="form-group">
              <label className="form-label">اسم الشركة</label>
              <input className="form-input" type="text" placeholder="مثال: شركة النيل للتوصيل" value={modalData.companyName||''} onChange={e => setModalData((p:any)=>({...p,companyName:e.target.value}))} autoComplete="off" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doAddCompany}>{modalLoading?'...':'إضافة'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* مشرفو الشركة */}
      {modal === 'companySupervisors' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">🏢 {modalData.company?.name} — المشرفون</div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>تعيين مشرف لهذه الشركة:</div>
              {supervisors.filter((s:any)=>!(s.companyIds||[]).length || (s.companyIds||[]).includes(modalData.company?.id)).map((s:any) => (
                <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,border:'1.5px solid var(--border2)',marginBottom:8,background:'var(--white)'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15}}>{s.name}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:3}}>
                      {(s.regions||[]).map((r:string,i:number) => <span key={i} style={{display:'inline-block',background:'var(--accent-bg)',color:'var(--accent)',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600}}>📍{r}</span>)}
                      {(s.companyNames||[]).filter((_:string,i:number)=>s.companyIds[i]!==modalData.company?.id).map((c:string,i:number) => <span key={i} style={{display:'inline-block',background:'#f0faf5',color:'#1a8a5a',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600}}>🏢{c}</span>)}
                    </div>
                  </div>
                  {(s.companyIds||[]).includes(modalData.company?.id)
                    ? <button className="btn-danger-s" style={{fontSize:12}} onClick={() => doAssignCompany(s.id,'supervisor',modalData.company?.id,'remove')}>إزالة</button>
                    : <button className="btn-primary" style={{fontSize:12,height:34}} onClick={() => doAssignCompany(s.id,'supervisor',modalData.company?.id,'add')}>تعيين</button>
                  }
                </div>
              ))}
              {supervisors.filter((s:any)=>(s.companyIds||[]).length > 0 && !(s.companyIds||[]).includes(modalData.company?.id)).length > 0 && (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:13,color:'var(--muted)',marginBottom:8}}>مشرفون في شركات أخرى:</div>
                  {supervisors.filter((s:any)=>(s.companyIds||[]).length > 0 && !(s.companyIds||[]).includes(modalData.company?.id)).map((s:any) => (
                    <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,border:'1.5px solid var(--border2)',marginBottom:8,background:'var(--bg)',opacity:0.7}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:15}}>{s.name}</div>
                        <div style={{fontSize:12,color:'var(--accent)'}}>🏢 {(s.companyNames||[]).join(' • ')}</div>
                      </div>
                      <button className="btn-primary" style={{fontSize:12,height:34}} onClick={() => doAssignCompany(s.id,'supervisor',modalData.company?.id,'add')}>إضافة هنا</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-secondary" style={{width:'100%'}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* إضافة مشرف */}
      {modal === 'addSupervisor' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">👮 إضافة مشرف</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}
            {['name','username','password','phone'].map(f => (
              <div className="form-group" key={f}>
                <label className="form-label">{f==='name'?'الاسم':f==='username'?'اسم المستخدم':f==='password'?'كلمة المرور':'الهاتف'}</label>
                <input className="form-input" type={f==='password'?'password':'text'} value={modalData[f]||''} onChange={e => setModalData((p:any)=>({...p,[f]:e.target.value}))} autoComplete="off" />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">المناطق</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'8px 0'}}>
                {regions.map((r:any) => {
                  const selected = (modalData.regions||[]).includes(r.name);
                  return (
                    <button key={r.id} type="button"
                      onClick={() => setModalData((p:any) => ({
                        ...p,
                        regions: selected
                          ? (p.regions||[]).filter((x:string)=>x!==r.name)
                          : [...(p.regions||[]), r.name]
                      }))}
                      style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',cursor:'pointer',fontSize:13,fontFamily:'var(--font)',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? '#fff' : 'var(--fg)',
                        borderColor: selected ? 'var(--accent)' : 'var(--border2)',
                        fontWeight: selected ? 700 : 400,
                      }}>{r.name}</button>
                  );
                })}
                {regions.length === 0 && <span style={{color:'var(--muted)',fontSize:13}}>لا توجد مناطق مضافة</span>}
              </div>
              {(modalData.regions||[]).length > 0 && (
                <div style={{fontSize:12,color:'var(--accent)',marginTop:4}}>المحددة: {(modalData.regions||[]).join(' • ')}</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">الراتب الأساسي</label>
              <input className="form-input" type="number" placeholder="0" value={modalData.baseSalary||''} onChange={e => setModalData((p:any)=>({...p,baseSalary:e.target.value}))} autoComplete="off" />
            </div>
            <div className="form-group">
              <label className="form-label">الشركات</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'8px 0'}}>
                {companies.map((c:any) => {
                  const selected = (modalData.companyIds||[]).includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setModalData((p:any) => ({
                        ...p,
                        companyIds: selected
                          ? (p.companyIds||[]).filter((x:string)=>x!==c.id)
                          : [...(p.companyIds||[]), c.id]
                      }))}
                      style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',cursor:'pointer',fontSize:13,fontFamily:'var(--font)',
                        background: selected ? 'var(--accent)' : 'var(--bg)',
                        color: selected ? '#fff' : 'var(--fg)',
                        borderColor: selected ? 'var(--accent)' : 'var(--border2)',
                        fontWeight: selected ? 700 : 400,
                      }}>🏢 {c.name}</button>
                  );
                })}
                {companies.length === 0 && <span style={{color:'var(--muted)',fontSize:13}}>لا توجد شركات مضافة</span>}
              </div>
              {(modalData.companyIds||[]).length > 0 && (
                <div style={{fontSize:12,color:'var(--accent)',marginTop:4}}>المحددة: {(modalData.companyIds||[]).map((id:string)=>companies.find((c:any)=>c.id===id)?.name).filter(Boolean).join(' • ')}</div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" style={{flex:1}} disabled={modalLoading} onClick={doAddSupervisor}>{modalLoading?'...':'إضافة'}</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* الطلبات */}
      {modal === 'requests' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">📋 الطلبات</div>

            {/* شريط البحث والفلاتر مدمجة وصغيرة */}
            <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
              {/* بحث */}
              <div style={{position:'relative',flex:'1 1 160px',minWidth:140}}>
                <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:13,pointerEvents:'none'}}>🔍</span>
                <input
                  className="form-input"
                  style={{paddingRight:32,height:36,fontSize:12}}
                  placeholder="بحث..."
                  value={reqFilter.search}
                  onChange={e => setReqFilter(p=>({...p,search:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && reloadRequests(reqFilter)} autoComplete="off" />
              </div>

              {/* فلتر الحالة */}
              <div style={{display:'flex',gap:3,background:'var(--bg2)',borderRadius:8,padding:3,flexShrink:0}}>
                {[['','الكل'],['pending','معلق'],['approved','مقبول'],['rejected','مرفوض']].map(([val,label])=>(
                  <button key={val} onClick={()=>{ const nf={...reqFilter,status:val}; setReqFilter(nf as any); reloadRequests(nf); }}
                    style={{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,
                      background:reqFilter.status===val?'var(--accent)':'transparent',
                      color:reqFilter.status===val?'#fff':'var(--muted)',whiteSpace:'nowrap'}}>
                    {label}
                    {val==='pending' && pendingReqs+fundingReqs>0 && <span style={{marginRight:3,background:'var(--danger)',color:'#fff',borderRadius:8,padding:'0 5px',fontSize:10}}>{pendingReqs+fundingReqs}</span>}
                  </button>
                ))}
              </div>

              {/* فلتر النوع */}
              <select className="form-select" style={{flex:'1 1 110px',minWidth:100,height:36,fontSize:12}}
                value={reqFilter.type} onChange={e=>{const nf={...reqFilter,type:e.target.value}; setReqFilter(nf as any); reloadRequests(nf);}}>
                <option value="">كل الأنواع</option>
                {TYPES.map(t=><option key={t} value={t}>{iconText(UI[t])} {UL[t]}</option>)}
                <option value="funding">💰 تمويل</option>
                <option value="supervisor_return">↩️ مرتجع مشرف</option>
              </select>

              {/* فلتر المشرف */}
              <select className="form-select" style={{flex:'1 1 120px',minWidth:110,height:36,fontSize:12}}
                value={reqFilter.supervisor} onChange={e=>{const nf={...reqFilter,supervisor:e.target.value}; setReqFilter(nf as any); reloadRequests(nf);}}>
                <option value="">كل المشرفين</option>
                {supervisors.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {/* فلتر التاريخ */}
              <input type="date" className="form-input" style={{flex:'1 1 120px',minWidth:110,height:36,fontSize:11}}
                value={reqFilter.dateFrom} onChange={e=>{const nf={...reqFilter,dateFrom:e.target.value}; setReqFilter(nf as any); reloadRequests(nf);}} autoComplete="off" />
              <input type="date" className="form-input" style={{flex:'1 1 120px',minWidth:110,height:36,fontSize:11}}
                value={reqFilter.dateTo} onChange={e=>{const nf={...reqFilter,dateTo:e.target.value}; setReqFilter(nf as any); reloadRequests(nf);}} autoComplete="off" />

              {/* بحث */}
              <button className="btn-primary" style={{height:36,padding:'0 14px',fontSize:12,flexShrink:0}} onClick={()=>reloadRequests(reqFilter)}>بحث</button>
            </div>

            {/* عدد النتائج */}
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>
              {requests.length} طلب {reqFilter.status==='pending'?'معلق':reqFilter.status==='approved'?'مقبول':reqFilter.status==='rejected'?'مرفوض':''}
            </div>

            {/* قائمة الطلبات — الأحدث أولاً */}
            {requests.length === 0
              ? <div className="empty">لا توجد طلبات مطابقة</div>
              : [...requests].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map((r:any,idx:number) => {
                const supName = supervisors.find((s:any)=>s.id===r.supervisor_id)?.name || r.supervisor_id;
                const isNew   = r.status==='pending';
                const isReturnReq = r.type === 'supervisor_return';
                const isEquip = !isReturnReq && r.type !== 'funding';
                const companyName = isEquip && r.company_id
                  ? (r.company_name || companies.find((c:any)=>c.id===r.company_id)?.name || null)
                  : null;
                const returnItems: any[] = isReturnReq && Array.isArray(r.items) ? r.items : [];
                return (
                  <div key={r.id} style={{
                    background:'var(--bg)',borderRadius:16,padding:16,marginBottom:10,
                    border: isNew ? '2px solid var(--accent)' : '1.5px solid var(--border2)',
                    position:'relative'
                  }}>
                    {/* شارة "جديد" للطلبات المعلقة */}
                    {isNew && <span style={{
                      position:'absolute',top:12,left:12,
                      background:'var(--accent)',color:'#fff',
                      borderRadius:8,padding:'2px 10px',fontSize:11,fontWeight:700
                    }}>جديد</span>}

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:15}}>
                        {isReturnReq ? '↩️ مرتجع مشرف' : `${UI[r.type]||'💰'} ${UL[r.type]||'تمويل'}`}
                        {!isReturnReq && r.qty ? ` — ${r.qty} قطعة` : ''}
                        {!isReturnReq && r.amount ? ` — ${r.amount} ج` : ''}
                      </div>
                      <div style={{fontSize:12,color:'var(--muted)',textAlign:'left',marginRight:8}}>{fmtDate(r.date)}</div>
                    </div>

                    <div style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>
                      👮 المشرف: <b style={{color:'var(--text)'}}>{supName}</b>
                    </div>

                    {/* تفاصيل عناصر المرتجع */}
                    {isReturnReq && returnItems.length > 0 && (
                      <div style={{marginBottom:6}}>
                        {returnItems.map((it:any,i:number)=>(
                          <div key={i} style={{fontSize:12,color:'var(--muted)'}}>
                            📦 {UI[it.type]||it.type} {UL[it.type]||''} — {it.qty} قطعة — {it.price} ج
                            {it.company_name ? ` — ${it.company_name}` : ''}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* الشركة — تظهر فقط لطلبات المعدات العادية */}
                    {isEquip && (
                      <div style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>
                        🏢 الشركة: <b style={{color:'var(--text)'}}>{companyName || '—'}</b>
                      </div>
                    )}

                    {r.note && <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>💬 {r.note}</div>}

                    {/* حالة */}
                    {r.status==='pending' ? (
                      <>
                        {!isReturnReq && r.type !== 'funding' && (() => {
                          const allPrices = invPrices[r.type] || [];
                          const prices = (r.company_id && r.company_id.trim() !== '')
                            ? allPrices.filter((p:any) => p.company_id === r.company_id)
                            : allPrices;
                          if (prices.length <= 1) return null;
                          const selKey = `selectedPrice_${r.id}`;
                          const cidKey = `selectedCompanyId_${r.id}`;
                          return (
                            <div style={{marginTop:10,padding:'10px 12px',background:'var(--warning-bg,#fffbe6)',border:'1px solid var(--warning,#f59e0b)',borderRadius:8}}>
                              <div style={{fontSize:12,fontWeight:700,color:'var(--warning-dark,#92400e)',marginBottom:6}}>
                                ⚠️ يوجد أكثر من سعر لهذا النوع — حدد السعر أولاً
                              </div>
                              <select className="form-select" style={{fontSize:13,height:36}}
                                value={modalData[selKey] !== undefined ? `${modalData[selKey]}__${modalData[cidKey]||''}` : ''}
                                onChange={e => {
                                  const [pr, cid] = e.target.value.split('__');
                                  setModalData((p:any) => ({...p, [selKey]: pr ? Number(pr) : undefined, [cidKey]: cid||''}));
                                }}>
                                <option value="">— اختر السعر —</option>
                                {prices.map((pr:any,i:number) => <option key={i} value={`${pr.price}__${pr.company_id}`}>{pr.price} ج — متاح: {pr.remaining} قطعة</option>)}
                              </select>
                            </div>
                          );
                        })()}
                        <div style={{display:'flex',gap:8,marginTop:10}}>
                          <button className="btn-primary" style={{height:38,fontSize:13,flex:1}}
                            disabled={!isReturnReq && r.type !== 'funding' && (() => { const allP = invPrices[r.type]||[]; const p = (r.company_id&&r.company_id.trim()!=='') ? allP.filter((x:any)=>x.company_id===r.company_id) : allP; return p.length > 1 && modalData[`selectedPrice_${r.id}`] === undefined; })()}
                            onClick={() => doRespondRequest(r.id,'approved')}>✅ موافقة</button>
                          <button className="btn-danger-s" style={{flex:1}} onClick={() => doRespondRequest(r.id,'rejected')}>❌ رفض</button>
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:13,fontWeight:700,marginTop:8,color:r.status==='approved'?'var(--success)':'var(--danger)'}}>
                        {r.status==='approved'?'✅ مقبول':'❌ مرفوض'}
                      </div>
                    )}
                  </div>
                );
              })
            }

            <button className="btn-secondary" style={{width:'100%',marginTop:4}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* المرتجعات */}
      {modal === 'supervisorReturns' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <div style={{fontSize:22}}>↩️</div>
              <div style={{fontWeight:800,fontSize:17,flex:1}}>طلبات مرتجع المشرفين</div>
              {supReturns.length > 0 && <span style={{background:'var(--danger)',color:'#fff',borderRadius:10,padding:'2px 12px',fontSize:13,fontWeight:700}}>{supReturns.length}</span>}
              <button className="btn-secondary" style={{height:32,fontSize:12,padding:'0 10px'}} onClick={() => { loadManagerReturnLog({status:'',supervisorId:''}); openModal('supervisorReturnLog'); }}>📋 السجل</button>
            </div>
            {supReturnsLoading ? (
              <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>جاري التحميل...</div>
            ) : supReturns.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>
                <div style={{fontSize:36,marginBottom:8}}>↩️</div>
                لا توجد طلبات مرتجع معلقة
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:12,maxHeight:520,overflowY:'auto'}}>
                {supReturns.map((r:any) => {
                  const items: any[] = Array.isArray(r.items) ? r.items : [];
                  const totalValue = items.reduce((s: number, it: any) => s + (it.total_value || 0), 0);
                  return (
                    <div key={r.id} style={{border:'2px solid var(--primary-border)',borderRadius:16,padding:16,background:'var(--primary-light)'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>👮 المشرف: {r.supervisor_name || r.supervisor_id}</div>
                            <span style={{background:'var(--danger)',color:'#fff',fontSize:10,fontWeight:800,borderRadius:6,padding:'2px 8px',letterSpacing:.5}}>جديد</span>
                          </div>
                          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>📅 {fmtDate(r.created_at)}</div>
                        </div>
                        {totalValue > 0 && <div style={{fontWeight:700,fontSize:14,color:'var(--primary)',background:'#fff',padding:'4px 12px',borderRadius:10,border:'1px solid var(--primary-border)'}}>💰 {fmt(totalValue)} ج</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                        {items.map((item: any, idx: number) => {
                          const condLabel = item.condition === 'new' ? 'جديد' : item.condition === 'good' ? 'جيد' : item.condition === 'damaged' ? 'تالف' : item.condition || '';
                          const condColor = item.condition === 'new' ? 'var(--success)' : item.condition === 'damaged' ? 'var(--danger)' : 'var(--warning)';
                          return (
                            <div key={idx} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 12px',background:'#fff',borderRadius:10,border:'1px solid var(--border)',flexWrap:'wrap'}}>
                              <span style={{fontSize:18}}>{UI[item.type]||'📦'}</span>
                              <span style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{UL[item.type]||item.type}</span>
                              <span style={{fontSize:13,color:'var(--muted)'}}>× {item.qty} قطعة</span>
                              {item.price > 0 && <span style={{fontSize:13,color:'var(--primary)',fontWeight:600}}>{fmt(item.price)} ج/قطعة</span>}
                              {item.total_value > 0 && <span style={{fontSize:12,color:'var(--muted)'}}>= {fmt(item.total_value)} ج</span>}
                              <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,border:`1px solid ${condColor}`,color:condColor,fontWeight:600}}>{condLabel}</span>
                              {item.company_name && <span style={{fontSize:11,color:'var(--muted)'}}>🏢 {item.company_name}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button style={{flex:1,height:44,fontSize:14,fontWeight:800,border:'none',borderRadius:10,cursor:'pointer',background:'var(--success)',color:'#fff',fontFamily:'var(--font)',boxShadow:'0 3px 10px rgba(16,185,129,.35)'}}
                          onClick={() => doApproveSupervisorReturn(r.id)}>✅ قبول — نقل للمخزن</button>
                        <button style={{height:44,padding:'0 20px',fontSize:14,fontWeight:800,border:'none',borderRadius:10,cursor:'pointer',background:'var(--danger)',color:'#fff',fontFamily:'var(--font)',boxShadow:'0 3px 10px rgba(239,68,68,.35)'}}
                          onClick={() => doRejectSupervisorReturn(r.id)}>❌ رفض</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{marginTop:14}}>
              <button className="btn-secondary" style={{width:'100%'}} onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'supervisorReturnLog' && (() => {
        const statusLabel = (s: string) => s === 'pending' ? 'قيد الانتظار' : s === 'approved' ? 'مقبول' : s === 'rejected' ? 'مرفوض' : s;
        const statusColor = (s: string) => s === 'pending' ? 'var(--warning)' : s === 'approved' ? 'var(--success)' : 'var(--danger)';
        return (
          <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal modal-wide">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <div style={{fontSize:22}}>📋</div>
                <div style={{fontWeight:800,fontSize:17,flex:1}}>سجل طلبات مرتجع المشرفين</div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                <select value={mgrReturnLogFilter.status} onChange={e => loadManagerReturnLog({status: e.target.value})}
                  style={{height:36,borderRadius:8,border:'1.5px solid var(--border)',fontFamily:'var(--font)',fontSize:13,padding:'0 10px'}}>
                  <option value="">كل الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="approved">مقبول</option>
                  <option value="rejected">مرفوض</option>
                </select>
                <select value={mgrReturnLogFilter.supervisorId} onChange={e => loadManagerReturnLog({supervisorId: e.target.value})}
                  style={{height:36,borderRadius:8,border:'1.5px solid var(--border)',fontFamily:'var(--font)',fontSize:13,padding:'0 10px'}}>
                  <option value="">كل المشرفين</option>
                  {supervisors.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {mgrReturnLogLoading ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>جاري التحميل...</div>
              ) : mgrReturnLog.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px 0',color:'var(--muted)'}}>لا توجد طلبات</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:480,overflowY:'auto'}}>
                  {mgrReturnLog.map((r:any) => {
                    const items: any[] = Array.isArray(r.items) ? r.items : [];
                    return (
                      <div key={r.id} style={{border:'1.5px solid var(--border)',borderRadius:14,padding:'12px 14px',background:'var(--surface)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <div style={{fontSize:13,color:'var(--text)',fontWeight:600}}>👮 {r.supervisor_name || r.supervisor_id}</div>
                          <span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:8,color:statusColor(r.status)}}>{statusLabel(r.status)}</span>
                        </div>
                        <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>📅 {fmtDate(r.created_at)}</div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          {items.map((item: any, idx: number) => (
                            <div key={idx} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 10px',background:'var(--bg)',borderRadius:8,fontSize:13}}>
                              <span style={{fontSize:18}}>{UI[item.type]||'📦'}</span>
                              <span style={{fontWeight:600,color:'var(--text)'}}>{UL[item.type]||item.type}</span>
                              <span style={{color:'var(--muted)'}}>× {item.qty}</span>
                              {item.price > 0 && <span style={{color:'var(--muted)'}}>— {fmt(item.price)} ج</span>}
                              {item.company_name && <span style={{fontSize:11,color:'var(--muted)'}}>🏢 {item.company_name}</span>}
                            </div>
                          ))}
                        </div>
                        {r.status === 'approved' && r.approved_by && (
                          <div style={{fontSize:12,color:'var(--success)',marginTop:6}}>✅ قُبل بواسطة: {r.approved_by} — {fmtDate(r.approved_at)}</div>
                        )}
                        {r.status === 'rejected' && r.rejected_by && (
                          <div style={{fontSize:12,color:'var(--danger)',marginTop:6}}>❌ رُفض بواسطة: {r.rejected_by} — {fmtDate(r.rejected_at)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{marginTop:14}}>
                <button className="btn-secondary" style={{width:'100%'}} onClick={closeModal}>إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* حجم البيانات */}
      {modal === 'dbSize' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">🗄️ حجم البيانات في Supabase</div>
            <div style={{marginBottom:16,padding:'12px 16px',background:'var(--accent-bg)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:15,color:'var(--text)',fontWeight:600}}>إجمالي الحجم</span>
              <span style={{fontSize:22,fontWeight:700,color:'var(--accent)'}}>
                {dbSizeData?.totalSizeMB} MB
                {dbSizeData?.isEstimate && <span style={{fontSize:12,color:'var(--muted)',marginRight:6}}>(تقديري)</span>}
              </span>
            </div>
            {dbSizeData?.isEstimate && (
              <div style={{marginBottom:12,padding:'8px 12px',background:'#FFFBEB',borderRadius:8,fontSize:13,color:'#92400E'}}>
                ⚠️ الحجم مُقدَّر بناءً على عدد الصفوف. لتفعيل الحجم الحقيقي أنشئ RPC بالاسم <code>get_tables_size</code> في Supabase.
              </div>
            )}
            <div style={{overflowX:'auto'}}>
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>الجدول</th>
                    <th style={{textAlign:'left'}}>عدد الصفوف</th>
                    <th style={{textAlign:'left'}}>الحجم (MB)</th>
                    <th style={{textAlign:'left'}}>النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {(dbSizeData?.tables || []).map((t:any) => {
                    const pct = dbSizeData.totalSizeMB > 0 ? Math.round((t.sizeMB / dbSizeData.totalSizeMB) * 100) : 0;
                    return (
                      <tr key={t.table}>
                        <td><strong>{t.label}</strong><span style={{fontSize:11,color:'var(--muted)',marginRight:4}}>({t.table})</span></td>
                        <td style={{textAlign:'left'}}>{t.rows.toLocaleString('ar-EG')}</td>
                        <td style={{textAlign:'left',fontWeight:600,color:'var(--accent)'}}>{t.sizeMB}</td>
                        <td style={{textAlign:'left'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{flex:1,background:'var(--border)',borderRadius:4,height:8}}>
                              <div style={{width:`${Math.min(pct,100)}%`,background:'var(--accent)',height:8,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,color:'var(--muted)',minWidth:30}}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:16,textAlign:'center'}}>
              <button className="btn-secondary" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* سجل التمويل */}
      {modal === 'fundingHistory' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">💰 سجل التمويل</div>
            <div style={{overflowX:'auto'}}>
              <table className="modal-table">
                <thead><tr><th>المشرف</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th></tr></thead>
                <tbody>
                  {fundingHistory.map((f:any) => (
                    <tr key={f.id}>
                      <td>{supervisors.find(s=>s.id===f.supervisor_id)?.name||f.supervisor_id}</td>
                      <td style={{color:'var(--success)',fontWeight:700}}>{fmt(f.amount)} ج</td>
                      <td>{fmtDate(f.date)}</td>
                      <td>{f.note||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-secondary" style={{width:'100%',marginTop:16}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* سجل إرسالات التمويل */}
      {modal === 'supFundLogModal' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">💸 سجل إرسالات التمويل</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:12}}>
              <input className="form-input" style={{flex:'1 1 180px',height:36,fontSize:13}} placeholder="🔍 بحث بالاسم أو الملاحظة..." value={supFundLogFilter.search} onChange={e => setSupFundLogFilter(p => ({...p, search: e.target.value}))} autoComplete="off" />
              <select className="form-select" style={{flex:'1 1 150px',height:36,fontSize:13}} value={supFundLogFilter.supervisorId} onChange={e => setSupFundLogFilter(p => ({...p, supervisorId: e.target.value}))}>
                <option value="">كل المشرفين</option>
                {supervisors.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="form-input" style={{flex:'1 1 130px',height:36,fontSize:13}} type="date" value={supFundLogFilter.dateFrom} onChange={e => { const v=e.target.value; setSupFundLogFilter(p=>({...p,dateFrom:v})); loadSupFundLog({...supFundLogFilter,dateFrom:v}); }} autoComplete="off" />
              <input className="form-input" style={{flex:'1 1 130px',height:36,fontSize:13}} type="date" value={supFundLogFilter.dateTo} onChange={e => { const v=e.target.value; setSupFundLogFilter(p=>({...p,dateTo:v})); loadSupFundLog({...supFundLogFilter,dateTo:v}); }} autoComplete="off" />
              <button className="btn-secondary" style={{height:36,fontSize:13}} onClick={() => { const f={search:'',supervisorId:'',dateFrom:'',dateTo:''}; setSupFundLogFilter(f); loadSupFundLog(f); }}>مسح</button>
              <button className="btn-secondary" style={{height:36,fontSize:13}} onClick={() => loadSupFundLog()}>🔄</button>
            </div>
            {supFundLogLoading ? (
              <div style={{textAlign:'center',padding:32}}><div className="spinner"></div></div>
            ) : (() => {
              const filtered = supFundLog.filter((f:any) => {
                const sup = supervisors.find((s:any) => s.id === f.supervisor_id);
                const search = supFundLogFilter.search.toLowerCase();
                const matchSearch = !search || (sup?.name||'').toLowerCase().includes(search) || (f.note||'').toLowerCase().includes(search);
                const matchSup = !supFundLogFilter.supervisorId || f.supervisor_id === supFundLogFilter.supervisorId;
                return matchSearch && matchSup;
              });
              const total = filtered.reduce((a:number, f:any) => a + (f.amount||0), 0);
              return (
                <>
                  <div style={{fontSize:13,color:'var(--muted)',display:'flex',gap:16,marginBottom:10,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                    <span>عدد العمليات: <strong style={{color:'var(--fg)'}}>{filtered.length}</strong></span>
                    <span>إجمالي التمويل: <strong style={{color:'var(--success)'}}>{fmt(total)} ج</strong></span>
                  </div>
                  <div style={{overflowX:'auto',maxHeight:'55vh',overflowY:'auto'}}>
                    <table className="modal-table" style={{minWidth:'100%'}}>
                      <thead><tr><th>المشرف</th><th>التليفون</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th></tr></thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)',padding:24}}>لا توجد نتائج</td></tr>
                        ) : filtered.map((f:any) => {
                          const sup = supervisors.find((s:any) => s.id === f.supervisor_id);
                          return (
                            <tr key={f.id}>
                              <td>
                                <div style={{fontWeight:700,marginBottom:3}}>{sup?.name || '-'}</div>
                                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                                  {(sup?.regions||[]).map((r:string,i:number) => <span key={i} style={{display:'inline-block',background:'var(--accent-bg)',color:'var(--accent)',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600}}>📍{r}</span>)}
                                  {(sup?.companyNames||[]).map((c:string,i:number) => <span key={i} style={{display:'inline-block',background:'#f0faf5',color:'#1a8a5a',borderRadius:8,padding:'1px 6px',fontSize:11,fontWeight:600}}>🏢{c}</span>)}
                                </div>
                              </td>
                              <td style={{color:'var(--muted)',fontSize:13}}>{sup?.phone ? <span>📞 {sup.phone}</span> : '-'}</td>
                              <td style={{color:'var(--success)',fontWeight:700}}>{fmt(f.amount)} ج</td>
                              <td>{fmtDate(f.date)}</td>
                              <td style={{color:'var(--muted)'}}>{f.note||'-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
            <button className="btn-secondary" style={{width:'100%',marginTop:16}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* سجل الرصيد الموحد */}
      {modal === 'balanceLogModal' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">📋 سجل الرصيد</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:12}}>
              <select className="form-select" style={{flex:'1 1 140px',height:36,fontSize:13}} value={balanceLogFilter.type} onChange={e => { const v=e.target.value; const nf={...balanceLogFilter,type:v}; setBalanceLogFilter(nf); }}>
                <option value="">كل العمليات</option>
                <option value="in">⬆️ وارد (إيداع)</option>
                <option value="out">⬇️ صادر (سحب / تمويل)</option>
              </select>
              <input className="form-input" style={{flex:'1 1 130px',height:36,fontSize:13}} type="date" value={balanceLogFilter.dateFrom} onChange={e => { const v=e.target.value; const nf={...balanceLogFilter,dateFrom:v}; setBalanceLogFilter(nf); loadBalanceLog(nf); }} autoComplete="off" />
              <input className="form-input" style={{flex:'1 1 130px',height:36,fontSize:13}} type="date" value={balanceLogFilter.dateTo} onChange={e => { const v=e.target.value; const nf={...balanceLogFilter,dateTo:v}; setBalanceLogFilter(nf); loadBalanceLog(nf); }} autoComplete="off" />
              <button className="btn-secondary" style={{height:36,fontSize:13}} onClick={() => { const f={dateFrom:'',dateTo:'',type:''}; setBalanceLogFilter(f); loadBalanceLog(f); }}>مسح</button>
              <button className="btn-secondary" style={{height:36,fontSize:13}} onClick={() => loadBalanceLog()}>🔄</button>
            </div>
            {balanceLogLoading ? (
              <div style={{textAlign:'center',padding:32}}><div className="spinner"></div></div>
            ) : (() => {
              const filtered = balanceLog.filter((e:any) => {
                if (!balanceLogFilter.type) return true;
                return e._direction === balanceLogFilter.type;
              });
              const totalIn  = filtered.filter((e:any) => e._direction === 'in').reduce((s:number,e:any) => s+(e.amount||0), 0);
              const totalOut = filtered.filter((e:any) => e._direction === 'out').reduce((s:number,e:any) => s+(e.amount||0), 0);
              return (
                <>
                  <div style={{fontSize:13,color:'var(--muted)',display:'flex',gap:16,flexWrap:'wrap',marginBottom:10,padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                    <span>عدد العمليات: <strong style={{color:'var(--fg)'}}>{filtered.length}</strong></span>
                    <span>إجمالي الوارد: <strong style={{color:'var(--success)'}}>{fmt(totalIn)} ج</strong></span>
                    <span>إجمالي الصادر: <strong style={{color:'var(--danger)'}}>{fmt(totalOut)} ج</strong></span>
                    <span>الصافي: <strong style={{color: totalIn-totalOut >= 0 ? 'var(--success)' : 'var(--danger)'}}>{fmt(totalIn-totalOut)} ج</strong></span>
                  </div>
                  <div style={{overflowX:'auto',maxHeight:'55vh',overflowY:'auto'}}>
                    <table className="modal-table" style={{minWidth:'100%'}}>
                      <thead><tr><th>النوع</th><th>الاتجاه</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة / المشرف</th></tr></thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)',padding:24}}>لا توجد نتائج</td></tr>
                        ) : filtered.map((e:any, i:number) => {
                          const sup = e._type === 'funding' ? supervisors.find((s:any) => s.id === e.supervisor_id) : null;
                          return (
                            <tr key={e.id+'-'+i}>
                              <td><span style={{background:e._type==='funding'?'#fff3e0':'var(--accent-bg)',color:e._type==='funding'?'#e65100':'var(--accent)',borderRadius:8,padding:'2px 8px',fontSize:12,fontWeight:600}}>{e._label}</span></td>
                              <td style={{color:e._direction==='in'?'var(--success)':'var(--danger)',fontWeight:700}}>{e._direction==='in'?'⬆️ وارد':'⬇️ صادر'}</td>
                              <td style={{fontWeight:700,color:e._direction==='in'?'var(--success)':'var(--danger)'}}>{fmt(e.amount)} ج</td>
                              <td style={{fontSize:13}}>{fmtDate(e.date)}</td>
                              <td style={{color:'var(--muted)',fontSize:13}}>{sup ? `👤 ${sup.name}` : (e.note||'-')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
            <button className="btn-secondary" style={{width:'100%',marginTop:16}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* سجل الرصيد */}
      {modal === 'balanceHistory' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">💼 سجل الرصيد</div>
            <div style={{overflowX:'auto'}}>
              <table className="modal-table">
                <thead><tr><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظة</th></tr></thead>
                <tbody>
                  {balanceHistory.map((b:any) => (
                    <tr key={b.id}>
                      <td style={{color:b.direction==='in'?'var(--success)':'var(--danger)'}}>{b.direction==='in'?'⬆️ وارد':'⬇️ صادر'}</td>
                      <td style={{fontWeight:700}}>{fmt(b.amount)} ج</td>
                      <td>{fmtDate(b.date)}</td>
                      <td>{b.note||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-secondary" style={{width:'100%',marginTop:16}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* سجل المخزن */}
      {modal === 'invHistory' && (
        <div className="overlay overlay-flush" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide">
            <div className="modal-title">📋 سجل المخزن</div>
            <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
              <select className="form-select" style={{flex:1,minWidth:140,height:44}} value={invLogFilter.companyId} onChange={e => setInvLogFilter(p=>({...p,companyId:e.target.value}))}>
                <option value="">كل الشركات</option>
                {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="form-select" style={{flex:1,minWidth:120,height:44}} value={invLogFilter.action} onChange={e => setInvLogFilter(p=>({...p,action:e.target.value}))}>
                <option value="">كل العمليات</option>
                <option value="add">➕ إضافة</option>
                <option value="send">📤 إرسال</option>
                <option value="accept_request">✅ قبول طلب</option>
                <option value="company_return">↩️ مرتجع</option>
              </select>
              <input className="form-input" type="date" style={{flex:1,height:44}} value={invLogFilter.dateFrom} onChange={e => setInvLogFilter(p=>({...p,dateFrom:e.target.value}))} autoComplete="off" />
              <input className="form-input" type="date" style={{flex:1,height:44}} value={invLogFilter.dateTo} onChange={e => setInvLogFilter(p=>({...p,dateTo:e.target.value}))} autoComplete="off" />
              <button className="btn-primary" style={{height:44,padding:'0 20px'}} onClick={loadInvLog}>🔍 بحث</button>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="modal-table">
                <thead><tr><th>العملية</th><th>الشركة</th><th>النوع</th><th>الكمية</th><th>السعر</th><th>المشرف</th><th>بواسطة</th><th>ملاحظة</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {invLog.length === 0 && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:24}}>لا توجد سجلات</td></tr>}
                  {invLog.map((h:any) => (
                    <tr key={h.id}>
                      <td style={{fontWeight:600,color:h.action==='add'?'var(--success)':h.action==='send'?'var(--warning)':h.action==='company_return'?'var(--danger)':'var(--accent)'}}>
                        {h.action==='add'?'➕ إضافة':h.action==='send'?'📤 إرسال':h.action==='company_return'?'↩️ مرتجع':'✅ قبول طلب'}
                      </td>
                      <td style={{fontWeight:600}}>🏢 {h.company_name||'—'}</td>
                      <td>{UI[h.type]} {UL[h.type]||h.type}</td>
                      <td>{h.qty}</td>
                      <td>{fmt(h.price)} ج</td>
                      <td>{h.supervisor_name||'—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)'}}>{h.performed_by||'—'}</td>
                      <td style={{fontSize:12,color:'var(--muted)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.note||'—'}</td>
                      <td>{fmtDate(h.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-secondary" style={{width:'100%',marginTop:16}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* مرتجع من مخزن الشركة */}
      {modal === 'returnCompanyInv' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">↩️ مرتجع من مخزن الشركة</div>
            {modalErr && <div className="alert-error">{modalErr}</div>}

            {/* اختيار الشركة */}
            <div className="form-group">
              <label className="form-label">🏢 الشركة</label>
              <select className="form-select" value={modalData.retCompanyId||''} onChange={e => setModalData((p:any)=>({...p, retCompanyId:e.target.value, retType:'', retQty:'', retPrice:0}))}>
                <option value="">اختر الشركة</option>
                {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* اختيار نوع المعدة */}
            <div className="form-group">
              <label className="form-label">📦 نوع المعدة</label>
              <select className="form-select" value={modalData.retType||''} onChange={e => {
                const t = e.target.value;
                const compData = companyInvSummary[modalData.retCompanyId]?.inventory?.[t];
                setModalData((p:any)=>({...p, retType:t, retQty:'', retPrice: compData?.lastPrice || 0, retAvailable: compData?.remaining || 0}));
              }}>
                <option value="">اختر النوع</option>
                {(modalData.retCompanyId ? getTypesForCompany(modalData.retCompanyId) : TYPES).map(t => {
                  const compData = companyInvSummary[modalData.retCompanyId]?.inventory?.[t];
                  const rem = compData?.remaining || 0;
                  return <option key={t} value={t} disabled={rem <= 0}>{iconText(UI[t])} {UL[t]} — متاح: {rem}</option>;
                })}
              </select>
            </div>

            {/* حالة المعدة */}
            {modalData.retType && (
              <div className="form-group">
                <label className="form-label">🔖 حالة المعدة <span style={{color:'var(--danger)'}}>*</span></label>
                <select className="form-select" value={modalData.retCondition||''} onChange={e => setModalData((p:any)=>({...p,retCondition:e.target.value}))}>
                  <option value="">اختر الحالة</option>
                  {(companyInvSummary[modalData.retCompanyId]?.inventory?.[modalData.retType]?.conditionCounts
                    ? Object.entries(companyInvSummary[modalData.retCompanyId].inventory[modalData.retType].conditionCounts).filter(([,v]:any)=>v>0)
                    : [['new',0],['good',0],['damaged',0]]
                  ).map(([cond]:any) => (
                    <option key={cond} value={cond}>{cond==='new'?'جديد':cond==='good'?'جيدة':'تالف'}</option>
                  ))}
                </select>
              </div>
            )}

            {/* الكمية والسعر */}
            {modalData.retType && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">الكمية</label>
                    <input className="form-input" type="number" min="1" max={modalData.retAvailable||999}
                      placeholder="0" value={modalData.retQty||''}
                      onChange={e => setModalData((p:any)=>({...p,retQty:e.target.value}))} autoComplete="off" />
                    {modalData.retAvailable !== undefined && (
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>الكمية المتاحة: <b style={{color:'var(--success)'}}>{modalData.retAvailable}</b></div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">💰 سعر القطعة (تلقائي)</label>
                    <input className="form-input" type="number" value={modalData.retPrice||0} readOnly
                      style={{background:'var(--bg2)',color:'var(--muted)',cursor:'not-allowed'}} autoComplete="off" />
                  </div>
                </div>
              </>
            )}

            {/* سبب المرتجع */}
            <div className="form-group">
              <label className="form-label">📝 سبب المرتجع <span style={{color:'var(--danger)'}}>*</span></label>
              <input className="form-input" type="text" placeholder="مثال: تالف / فائض / استرداد" value={modalData.retReason||''}
                onChange={e => setModalData((p:any)=>({...p,retReason:e.target.value}))} autoComplete="off" />
            </div>

            {/* ملاحظة */}
            <div className="form-group">
              <label className="form-label">💬 ملاحظة (اختياري)</label>
              <input className="form-input" type="text" placeholder="أي تفاصيل إضافية..." value={modalData.retNote||''}
                onChange={e => setModalData((p:any)=>({...p,retNote:e.target.value}))} autoComplete="off" />
            </div>

            {/* ملخص */}
            {modalData.retType && modalData.retQty && Number(modalData.retQty) > 0 && (
              <div style={{background:'var(--bg2)',borderRadius:12,padding:'12px 16px',marginBottom:12,border:'1.5px solid var(--border2)',fontSize:13}}>
                <div style={{fontWeight:700,marginBottom:6,color:'var(--warning)'}}>↩️ ملخص المرتجع</div>
                <div>الشركة: <b>{companies.find((c:any)=>c.id===modalData.retCompanyId)?.name||'—'}</b></div>
                <div>المعدة: <b>{UI[modalData.retType]} {UL[modalData.retType]}</b></div>
                <div>الكمية: <b>{modalData.retQty}</b></div>
                <div>السعر الأصلي للقطعة: <b>{modalData.retPrice||0} ج</b></div>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" disabled={modalLoading} onClick={doReturnCompanyInventory}
                style={{background:'var(--warning)',borderColor:'var(--warning)',flex:1}}>
                {modalLoading?'...':'↩️ تسجيل المرتجع'}
              </button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeModal}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* مخزن الشركات */}
      {modal === 'companyInvSummary' && (
        <div className="overlay overlay-tight" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-wide modal-company-inv">
            <div className="modal-title">🏢 مخزن الشركات</div>
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
              <select className="form-select" style={{flex:1,minWidth:160,height:44}} value={selectedCompanyInv} onChange={e => setSelectedCompanyInv(e.target.value)}>
                <option value="">كل الشركات</option>
                {companies.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {Object.values(companyInvSummary).filter((c:any) => !selectedCompanyInv || c.companyId === selectedCompanyInv).map((c:any) => {
              const compTotalVal = calcCompanyTotalValue(c.inventory, c.companyId);
              return (
                <div key={c.companyId} style={{marginBottom:24,background:'var(--bg)',borderRadius:16,padding:16,border:'1.5px solid var(--border2)'}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:12,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <span>🏢 {c.companyName}</span>
                    <span style={{fontSize:13,fontWeight:700,background:'var(--accent-bg)',color:'var(--accent)',borderRadius:8,padding:'3px 10px',direction:'ltr'}}>
                      إجمالي القيمة: {compTotalVal.toLocaleString('en-US')} ج
                    </span>
                  </div>
                  <div className="inv-grid">
                    {(() => {
                      // DEFAULT_TYPES + أنواع هذه الشركة من equipmentTypes + البيانات الفعلية
                      const seen = new Set<string>(DEFAULT_TYPES);
                      const compTypes = [...DEFAULT_TYPES];
                      equipmentTypes
                        .filter((t:any) => !t.company_id || t.company_id === c.companyId)
                        .forEach((t:any) => {
                          if (!seen.has(t.key)) { seen.add(t.key); compTypes.push(t.key); }
                        });
                      Object.keys(c.inventory || {}).forEach((k: string) => {
                        if (!seen.has(k)) { seen.add(k); compTypes.push(k); }
                      });
                      return compTypes;
                    })().map(t => {
                      const d = c.inventory?.[t] || {remaining:0,total:0,sent:0,returned:0,conditionCounts:{}};
                      const typeVal = calcCompanyTypeValue(c.inventory, t);
                      const cc = d.conditionCounts || {};
                      const hasConditions = (cc.new||0) + (cc.good||0) + (cc.damaged||0) > 0;
                      return (
                        <div key={t} className="inv-item" onClick={(e) => { e.stopPropagation(); openCompanyInvTypeDetail(t, c.inventory, c.companyName); }}>
                          <div className="inv-icon">
                            {renderIcon(UI[t]||'', 40)}
                          </div>
                          <div className="inv-label">{UL[t]}</div>
                          <div className="inv-qty" style={{color:d.remaining<0?'var(--danger)':d.remaining===0?'var(--warning)':'var(--success)'}}>{d.remaining||0}</div>
                          <div className="inv-sub">إجمالي: {(d.remaining||0) + Math.max(0,(d.sent||0)-(d.companyReturned||0))} | صادر: {Math.max(0,(d.sent||0)-(d.companyReturned||0))}</div>
                          {hasConditions && (
                            <div style={{display:'flex',gap:4,marginTop:5,flexWrap:'wrap',justifyContent:'center'}}>
                              {(cc.new||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#dcfce7',color:'#16a34a',borderRadius:6,padding:'2px 7px'}}>جديد: {cc.new}</span>}
                              {(cc.good||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#dbeafe',color:'#2563eb',borderRadius:6,padding:'2px 7px'}}>جيدة: {cc.good}</span>}
                              {(cc.damaged||0)>0 && <span style={{fontSize:11,fontWeight:700,background:'#fee2e2',color:'#dc2626',borderRadius:6,padding:'2px 7px'}}>تالف: {cc.damaged}</span>}
                            </div>
                          )}
                          <div style={{marginTop:6,fontSize:12,fontWeight:700,color:'var(--accent)',background:'var(--accent-bg)',borderRadius:6,padding:'2px 8px',display:'inline-block',direction:'ltr'}}>
                            {typeVal.toLocaleString('en-US')} ج
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.keys(companyInvSummary).length === 0 && <div className="empty">لا توجد شركات</div>}
            <button className="btn-secondary" style={{width:'100%',marginTop:8}} onClick={closeModal}>إغلاق</button>
          </div>
        </div>
      )}

      {/* إدارة المناطق */}
      {modal === 'manageRegions' && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-title">🗺️ إدارة المناطق</div>
            {modalErr && <div className="alert-error" onClick={()=>setModalErr('')} style={{cursor:'pointer'}}>{modalErr} ✕</div>}
            <div style={{marginBottom:16}}>
              {regions.length === 0 && <div className="empty">لا توجد مناطق</div>}
              {regions.map((r:any) => (
                <div key={r.id} style={{background:'var(--bg)',borderRadius:12,padding:'10px 14px',marginBottom:8,border:'1.5px solid var(--border2)',display:'flex',alignItems:'center',gap:8,opacity:r.active===false?0.5:1}}>
                  {modalData.editRegionId === r.id ? (
                    <>
                      <input
                        className="form-input"
                        style={{flex:1,margin:0,height:34,fontSize:13}}
                        value={modalData.editRegionName||''}
                        onChange={e=>setModalData((p:any)=>({...p,editRegionName:e.target.value}))}
                        onKeyDown={e=>e.key==='Enter'&&doUpdateRegion()}
                        autoFocus autoComplete="off" />
                      <button onClick={doUpdateRegion} disabled={modalLoading} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'4px 12px',cursor:'pointer',fontSize:12,fontWeight:700}}>حفظ</button>
                      <button onClick={()=>setModalData((p:any)=>({...p,editRegionId:null,editRegionName:''}))} style={{background:'none',border:'1px solid var(--border2)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>إلغاء</button>
                    </>
                  ) : (
                    <>
                      <span style={{flex:1,fontWeight:600,fontSize:14}}>📍 {r.name}</span>
                      {r.active === false && <span style={{fontSize:11,color:'var(--muted)',background:'var(--bg-subtle)',borderRadius:6,padding:'2px 8px'}}>موقوفة</span>}
                      <button
                        onClick={()=>setModalData((p:any)=>({...p,editRegionId:r.id,editRegionName:r.name}))}
                        style={{background:'none',border:'1px solid var(--accent)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12,color:'var(--accent)',fontWeight:600}}>
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={()=>doToggleRegion(r.id, r.active===false)}
                        disabled={modalLoading}
                        style={{background:'none',border:'1px solid var(--border2)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--muted)'}}>
                        {r.active===false ? '▶ تفعيل' : '⏸ إيقاف'}
                      </button>
                      <button
                        onClick={()=>askConfirm('هل تريد حذف هذه المنطقة؟ لن تتمكن من حذفها إن كان لها سجلات.', ()=>doDeleteRegion(r.id))}
                        disabled={modalLoading}
                        style={{background:'none',border:'1px solid var(--danger)',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--danger)'}}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">إضافة منطقة جديدة</label>
              <input className="form-input" value={modalData.regionName||''} onChange={e => setModalData((p:any)=>({...p,regionName:e.target.value}))} placeholder="مثال: منطقة الجيزة" onKeyDown={e=>e.key==='Enter'&&doAddRegion()} autoComplete="off" />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn-primary" disabled={modalLoading} onClick={doAddRegion}>{modalLoading?'...':'➕ إضافة منطقة'}</button>
              <button className="btn-secondary" onClick={closeModal}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* modal تفاصيل قيمة المعدة */}
      {invDetailModal && (
        <div className="overlay" style={{zIndex:10000}} onClick={e => e.target === e.currentTarget && setInvDetailModal(null)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-title" style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:28}}>
                {(invDetailModal.icon?.startsWith('data:') || invDetailModal.icon?.startsWith('http'))
                  ? <img src={invDetailModal.icon} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',verticalAlign:'middle'}} />
                  : invDetailModal.icon}
              </span>
              {invDetailModal.label}
              {invDetailModal.companyName && <span style={{fontSize:12,fontWeight:500,color:'var(--muted)',marginRight:'auto'}}>({invDetailModal.companyName})</span>}
            </div>

            {invDetailModal.prices.length === 0 || (invDetailModal.prices.length === 1 && invDetailModal.prices[0].total === 0 && invDetailModal.prices[0].remaining === 0) ? (
              <div className="empty">لا توجد بيانات لهذا النوع في هذه الشركة</div>
            ) : (
              <>
                {/* جدول الأسعار */}
                <table className="modal-table" style={{width:'100%',marginBottom:16}}>
                  <thead>
                    <tr>
                      <th>العدد المتاح</th>
                      <th>سعر الواحدة</th>
                      <th>الحالة</th>
                      <th>إجمالي القيمة</th>
                      {invDetailModal.source === 'company' && <th>صادر</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invDetailModal.prices.map((p: any, i: number) => {
                      const lineVal = (Number(p.remaining)||0) * (Number(p.price)||0);
                      const cond = p.condition || 'new';
                      const condLabel = cond === 'good' ? 'جيدة' : cond === 'damaged' ? 'تالف' : 'جديد';
                      const condBg = cond === 'good' ? '#dbeafe' : cond === 'damaged' ? '#fee2e2' : '#dcfce7';
                      const condColor = cond === 'good' ? '#2563eb' : cond === 'damaged' ? '#dc2626' : '#16a34a';
                      return (
                        <tr key={i}>
                          <td style={{fontWeight:700,fontSize:16}}>{(Number(p.remaining)||0).toLocaleString('en-US')}</td>
                          <td style={{direction:'ltr',fontWeight:600}}>{(Number(p.price)||0).toLocaleString('en-US')} ج</td>
                          <td><span style={{fontSize:12,fontWeight:700,background:condBg,color:condColor,borderRadius:6,padding:'2px 8px'}}>{condLabel}</span></td>
                          <td style={{direction:'ltr',fontWeight:700,color:'var(--accent)'}}>{lineVal.toLocaleString('en-US')} ج</td>
                          {invDetailModal.source === 'company' && <td style={{direction:'ltr'}}>{(Number(p.sent)||0).toLocaleString('en-US')}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* إجمالي */}
                {invDetailModal.prices.length > 1 && (
                  <div style={{background:'var(--accent-bg)',borderRadius:10,padding:'10px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:700,color:'var(--text2)'}}>الإجمالي الكلي</span>
                    <span style={{fontWeight:800,fontSize:16,color:'var(--accent)',direction:'ltr'}}>
                      {invDetailModal.prices.reduce((s:number,p:any)=>s+((Number(p.remaining)||0)*(Number(p.price)||0)),0).toLocaleString('en-US')} ج
                    </span>
                  </div>
                )}
              </>
            )}

            <button className="btn-secondary" style={{width:'100%'}} onClick={() => setInvDetailModal(null)}>إغلاق</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      {/* =================== CONFIRM DIALOG =================== */}
      {confirmDialog && (
        <div className="overlay" style={{zIndex:9999}} onClick={e => e.target === e.currentTarget && closeConfirm()}>
          <div className="modal" style={{maxWidth:360,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,marginBottom:20,color:'var(--fg)'}}>{confirmDialog.msg}</div>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn-primary" style={{flex:1}} onClick={() => { closeConfirm(); confirmDialog.onConfirm(); }}>تأكيد</button>
              <button className="btn-secondary" style={{flex:1}} onClick={closeConfirm}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
