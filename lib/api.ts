export const TOKEN_KEY    = 'badaya_token';
export const ROLE_KEY     = 'badaya_role';
export const PILOT_ID_KEY = 'badaya_pilotId';

// Cache version — increment this to bust all cached data when API response shapes change
const CACHE_VERSION = 'v3';

// Auto-clear old cache on version mismatch
if (typeof window !== 'undefined') {
  const storedVersion = localStorage.getItem('badaya_cache_version');
  if (storedVersion !== CACHE_VERSION) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('badaya_cache__')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('badaya_cache_version', CACHE_VERSION);
  }
}

// Cache TTL per endpoint (seconds). 0 = no cache.
const CACHE_TTL: Record<string, number> = {
  getManagerStats:            60 * 5,   // 5 دقايق
  getSupervisors:             60 * 5,
  getRegions:                 60 * 30,  // 30 دقيقة
  getCompanies:               60 * 30,
  getAllPilotsWithDetails:     60 * 5,
  getSupervisorStats:         60 * 5,
  getPilots:                  60 * 5,
  getSupervisorWithPilots:    60 * 2,
  getPilotDetails:            60 * 2,
  getFunding:                 60 * 5,
  getAllFunding:               60 * 5,
  getBalanceHistory:          60 * 5,
  getManagerInventoryHistory: 60 * 5,
  getSupervisorInventorySummary: 60 * 5,
  getManagerInventorySummary: 60 * 5,
  getInventoryLog: 60 * 2,
  getCompanyInventorySummary: 60 * 5,
  getSupervisorSalaryDetails: 60 * 2,
  // ملحوظة: الـ endpoints الجاية دي عبارة عن "صندوق وارد" بين دورين مختلفين
  // (مثلاً: المشرف يبعت طلب، المدير لازم يشوفه فورًا) — الكاش بيتخزن لكل متصفح
  // على حدة، فمسح الكاش عند الإرسال (في متصفح المُرسِل) ما يأثرش على كاش
  // المستقبِل في متصفحه الخاص. لازم تفضل بدون كاش (TTL=0) لضمان ظهور
  // الطلبات الجديدة فورًا.
  getRequests:                0,
  getPendingReturns:          0,
  getSupervisorReturns:       60 * 2,
  getSupervisorReturnRequests: 0,
  getPendingSupervisorReturns: 0,
  getManagerReturnRequestsLog: 60 * 2,
  getPilotTransferNotifs:     60 * 1,
  getSupervisorNotifications: 0,
  getSupervisors_list:        60 * 5,
  getAdminProfile:            60 * 2,
};

// Endpoints that should invalidate cache on mutation
const MUTATING_ENDPOINTS: Record<string, string[]> = {
  addUser:            ['getSupervisors','getManagerStats'],
  updateSupervisor:   ['getSupervisors','getManagerStats','getSupervisorWithPilots','getAllPilotsWithDetails'],
  addCompany:         ['getCompanies'],
  deleteCompany:      ['getCompanies'],
  assignCompany:      ['getCompanies','getSupervisors'],
  addPilot:           ['getPilots','getAllPilotsWithDetails','getSupervisorStats','getManagerStats'],
  updatePilot:        ['getPilots','getAllPilotsWithDetails','getSupervisorStats','getManagerStats','getPilotDetails'],
  addAdvance:         ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  deleteAdvance:      ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  addDeduction:       ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  deleteDeduction:    ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  addBonus:           ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  deleteBonus:        ['getPilotDetails','getSupervisorStats','getManagerStats','getAllPilotsWithDetails','getSupervisorWithPilots'],
  addFunding:         ['getFunding','getAllFunding','getManagerStats','getSupervisorStats','getSupervisorWithPilots'],
  addManagerBalance:  ['getBalanceHistory','getManagerStats'],
  addManagerInventory:['getManagerInventorySummary','getManagerStats','getInventoryLog','getCompanyInventorySummary'],
  sendInventoryToSupervisor: ['getSupervisorInventorySummary','getManagerInventorySummary','getManagerStats','getInventoryLog','getCompanyInventorySummary'],
  updateInventoryPrice: ['getSupervisorInventorySummary','getManagerInventorySummary'],
  recordUniform:      ['getPilotDetails','getSupervisorStats','getManagerStats'],
  transferUniform:    ['getPilotDetails','getSupervisorStats'],
  addRegion:          ['getRegions'],
  updateRegion:       ['getRegions'],
  deleteRegion:       ['getRegions'],
  toggleRegion:       ['getRegions'],
  respondRequest:     ['getRequests','getManagerStats','getInventoryLog','getCompanyInventorySummary'],
  sendRequest:        ['getRequests','getManagerStats'],
  deleteRequest:      ['getRequests','getManagerStats'],
  returnCompanyInventory: ['getCompanyInventorySummary','getManagerInventorySummary','getManagerStats','getInventoryLog'],
  requestReturn:      ['getPendingReturns','getSupervisorReturns','getPilotDetails'],
  approveReturn:      ['getPendingReturns','getManagerStats','getManagerInventorySummary'],
  rejectReturn:       ['getPendingReturns','getSupervisorReturns'],
  requestSupervisorReturn: ['getSupervisorReturnRequests','getSupervisorStats','getSupervisorInventorySummary'],
  approveSupervisorReturn: ['getPendingSupervisorReturns','getManagerReturnRequestsLog','getSupervisorReturnRequests','getManagerStats','getManagerInventorySummary','getSupervisorStats','getSupervisorInventorySummary','getCompanyInventorySummary'],
  rejectSupervisorReturn: ['getPendingSupervisorReturns','getManagerReturnRequestsLog','getSupervisorReturnRequests','getSupervisorStats','getSupervisorInventorySummary'],
  settleSalary:       ['getSupervisorStats','getManagerStats','getPilotDetails','getAllPilotsWithDetails','getSupervisorWithPilots'],
  supervisorCloseAccounts: ['getSupervisorStats','getManagerStats','getPilotDetails','getAllPilotsWithDetails','getSupervisorWithPilots'],
  undoSettlement:     ['getSupervisorStats','getManagerStats','getPilotDetails','getAllPilotsWithDetails','getSupervisorWithPilots'],
  addSupervisorSalaryItem: ['getSupervisorSalaryDetails','getManagerStats'],
  updateSupervisorSalaryBase: ['getSupervisors','getManagerStats'],
  transferPilot:      ['getPilots','getAllPilotsWithDetails','getSupervisorStats','getManagerStats'],
  updatePilotSalary:  ['getPilotDetails','getSupervisorStats','getAllPilotsWithDetails'],
  updateAdminProfile: ['getAdminProfile'],
  updateLoginSettings: ['getLoginSettings'],
};

function cacheKey(endpoint: string, params: Record<string, any> = {}): string {
  const token = getToken();
  const p = { ...params };
  delete p.token;
  return `badaya_cache__${endpoint}__${token.slice(-8)}__${JSON.stringify(p)}__${CACHE_VERSION}`;
}

function getCache(key: string): any | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, exp } = JSON.parse(raw);
    if (Date.now() > exp) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: any, ttlSeconds: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + ttlSeconds * 1000 }));
  } catch {
    // storage full — clear old badaya cache entries
    clearOldCache();
    try { localStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + ttlSeconds * 1000 })); } catch {}
  }
}

function clearOldCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('badaya_cache__')) keys.push(k);
    }
    // remove expired first, then oldest if still needed
    keys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return;
        const { exp } = JSON.parse(raw);
        if (Date.now() > exp) localStorage.removeItem(k);
      } catch { localStorage.removeItem(k); }
    });
  } catch {}
}

export function invalidateCache(endpoints: string[]): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('badaya_cache__')) keys.push(k);
    }
    keys.forEach(k => {
      if (endpoints.some(ep => k.includes(`__${ep}__`))) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

export function invalidateAllCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('badaya_cache__')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function getToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || '' : '';
}

export function getRole(): string {
  return typeof window !== 'undefined' ? localStorage.getItem(ROLE_KEY) || '' : '';
}

export async function api(endpoint: string, body: Record<string, any> = {}): Promise<any> {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // لا تعليق إلى الأبد — قطع الطلب بعد 25 ثانية

  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...body, token }),
      signal: controller.signal,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      return { success: false, message: res.ok ? 'استجابة غير صالحة من الخادم' : `خطأ من الخادم (${res.status})` };
    }

    // Invalidate related caches on successful mutation
    if (data?.success !== false && MUTATING_ENDPOINTS[endpoint]) {
      invalidateCache(MUTATING_ENDPOINTS[endpoint]);
    }

    return data;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'انتهت مهلة الاتصال بالخادم، حاول مرة أخرى' };
    }
    return { success: false, message: 'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى' };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiGet(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const token = getToken();
  const ttl = CACHE_TTL[endpoint] || 0;

  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      try {
        return await res.json();
      } catch {
        return { success: false, message: res.ok ? 'استجابة غير صالحة من الخادم' : `خطأ من الخادم (${res.status})` };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return { success: false, message: 'انتهت مهلة الاتصال بالخادم، حاول مرة أخرى' };
      return { success: false, message: 'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى' };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  if (ttl > 0) {
    const key = cacheKey(endpoint, params);
    const cached = getCache(key);
    if (cached) return cached;

    const qs = new URLSearchParams({ ...params, token }).toString();
    const data = await fetchWithTimeout(`/api/${endpoint}?${qs}`);
    if (data?.success !== false) setCache(key, data, ttl);
    return data;
  }

  const qs = new URLSearchParams({ ...params, token }).toString();
  return fetchWithTimeout(`/api/${endpoint}?${qs}`);
}
