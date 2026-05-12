import { safeGetLocalStorage, safeSetLocalStorage, clearStorage } from '../utils/storage';

const PRIMARY_API_URL = 'https://api.solofleet.com/SFvehicle/vehiclecondense';
const SECONDARY_API_URL = 'https://internalwebapp.solofleet.com/coldstorage';
const TRACKING_API_URL = 'https://internalwebapp.solofleet.com/api/TrackingRecordAPI/getDetailVehicleList';
const SERVICE_COMPANY_ID = '508';
const SERVICE_USERNAME = 'service_user';
const SERVICE_PASSWORD = 'service_pass';

export const LOGIN_TIMESTAMP_KEY = 'login_timestamp';

export const loginLegacy = async (username, password) => {
  try {
    const url = `${PRIMARY_API_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=json`;
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    let vehicles = [];
    if (Array.isArray(result)) vehicles = result;
    else if (result?.success && Array.isArray(result.modeloutput?.vehicles)) vehicles = result.modeloutput.vehicles;

    if (vehicles.length === 0) throw new Error('Invalid username or password (Legacy)');

    const vehicleIDs = vehicles.map(v => v.vehicleid);
    const firstVehicle = vehicles[0] || {};
    const companyId = firstVehicle.companyid || firstVehicle.companyID || firstVehicle.companyId || '';

    await clearStorage();
    await safeSetLocalStorage('userName', username);
    await safeSetLocalStorage('password', password);
    await safeSetLocalStorage('vehicleIDs', JSON.stringify(vehicleIDs));
    await safeSetLocalStorage('totalChambers', String(vehicles.length));
    await safeSetLocalStorage('loginMethod', 'legacy');
    await safeSetLocalStorage('accessMenuPages', JSON.stringify(['Dashboard', 'Temperature Monitor', 'Reports', 'Temperature Profile', 'Users']));
    await safeSetLocalStorage('permissions', JSON.stringify({
      Dashboard: { Create: true, Read: true, Update: true, Delete: true },
      'Temperature Monitor': { Create: true, Read: true, Update: true, Delete: true },
      Reports: { Create: true, Read: true, Update: true, Delete: true },
    }));
    await safeSetLocalStorage('roleName', roleName);
    if (companyId) await safeSetLocalStorage('companyId', String(companyId));
    await safeSetLocalStorage('userId', `legacy_${username}`);
    await safeSetLocalStorage(LOGIN_TIMESTAMP_KEY, String(Date.now()));

    return { success: true, data: vehicles, message: 'Login successful via Legacy API', loginMethod: 'legacy' };
  } catch (error) {
    return { success: false, message: error.message, data: null };
  }
};

export const loginColdStorageUser = async (username, password) => {
  try {
    const response = await fetch(`${SECONDARY_API_URL}/login-coldstorage-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userName: username, password }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Login failed via ColdStorage');

    const userData = result.data;
    await clearStorage();

    await safeSetLocalStorage('authToken', userData.token || '');
    await safeSetLocalStorage('userId', String(userData.userID || ''));
    await safeSetLocalStorage('userName', userData.userName || '');
    await safeSetLocalStorage('password', password);
    await safeSetLocalStorage('roleId', String(userData.roleID || ''));
    await safeSetLocalStorage('roleName', userData.roleName || '');
    await safeSetLocalStorage('accessMenuPages', JSON.stringify(userData.accessMenuPages || []));
    await safeSetLocalStorage('permissions', JSON.stringify(userData.permissions || {}));
    await safeSetLocalStorage('vehicleIDs', JSON.stringify(userData.vehicleIDs || []));
    await safeSetLocalStorage('totalChambers', String(userData.totalChambers || 0));
    await safeSetLocalStorage('loginMethod', 'coldstorage');

    const companyId = userData.companyId || userData.companyID || userData.company_id || '';
    if (companyId) await safeSetLocalStorage('companyId', String(companyId));
    await safeSetLocalStorage(LOGIN_TIMESTAMP_KEY, String(Date.now()));

    return { success: true, data: userData, message: 'Login successful via ColdStorage API', loginMethod: 'coldstorage' };
  } catch (error) {
    return { success: false, message: error.message, data: null };
  }
};

export const login = async (username, password) => {
  const legacyResult = await loginLegacy(username, password);
  if (legacyResult.success) return legacyResult;
  return await loginColdStorageUser(username, password);
};

export const logout = async () => {
  try {
    const companyId = await safeGetLocalStorage('companyId');
    const userId = await safeGetLocalStorage('userId');
    if (companyId && userId) {
      // const { ref, remove } = await import('firebase/database');
      // const { database } = await import('../config/firebase');
      await remove(ref(database, `expo_tokens/${companyId}/${userId}`));
    }
  } catch (e) {
    console.warn('[Auth] Failed to remove expo token:', e.message);
  }
  await clearStorage();
};

export const isAuthenticated = async () => {
  const loginMethod = await safeGetLocalStorage('loginMethod');
  const userName = await safeGetLocalStorage('userName');
  if (loginMethod === 'coldstorage') {
    const authToken = await safeGetLocalStorage('authToken');
    return !!authToken && !!userName;
  }
  const vehicleIDs = await safeGetLocalStorage('vehicleIDs');
  return !!userName && !!vehicleIDs;
};

export const getCompanyId = async () => {
  try { return await safeGetLocalStorage('companyId'); } catch { return null; }
};

export const getAccessibleVehicles = async () => {
  try {
    const s = await safeGetLocalStorage('vehicleIDs');
    return s ? JSON.parse(s) : [];
  } catch { return []; }
};

export const getUserInfo = async () => {
  const vehicleIDsStr = await safeGetLocalStorage('vehicleIDs');
  const companyId = await safeGetLocalStorage('companyId');
  return {
    userName: await safeGetLocalStorage('userName'),
    roleName: await safeGetLocalStorage('roleName'),
    loginMethod: await safeGetLocalStorage('loginMethod'),
    companyId,
    vehicleIDs: vehicleIDsStr ? JSON.parse(vehicleIDsStr) : [],
  };
};

const processVehicleList = (rawList) => {
  if (!rawList || rawList.length === 0) return [];
  const latestMap = {};
  rawList.forEach(item => {
    const id = item.vehicleID;
    if (!id) return;
    const existing = latestMap[id];
    const currentTime = new Date(item.gpsTime).getTime();
    const existingTime = existing ? new Date(existing.gpsTime).getTime() : 0;
    if (!existing || currentTime > existingTime) latestMap[id] = item;
  });

  return Object.values(latestMap).map(raw => {
    let doorStatus = 'N/A';
    if (raw.door) {
      const cleanStr = String(raw.door).trim();
      if (cleanStr.includes('1')) doorStatus = 'Open';
      else if (cleanStr === '000000000') doorStatus = 'Closed';
    }
    return {
      vehicleid: raw.vehicleID,
      alias: raw.alias,
      gpstime: raw.gpsTime,
      latitude: raw.latitude,
      longitude: raw.longtitude,
      speed: raw.speed,
      streetName: raw.streetName,
      engine: raw.engine,
      doorStatus,
      temperature1: raw.temp1,
      temperature2: raw.temp2,
      temperature3: raw.temp3,
      city: raw.city,
      province: raw.province,
    };
  });
};

const fetchTrackingData = async (username, password, companyId, allowedVehicleIDs) => {
  const url = `${TRACKING_API_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&companyid=${companyId}`;
  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) return [];

    let processedData = processVehicleList(result.data);
    if (allowedVehicleIDs && allowedVehicleIDs.length > 0) {
      processedData = processedData.filter(v => {
        const vidUpper = v.vehicleid?.toUpperCase();
        return allowedVehicleIDs.includes(vidUpper) ||
          allowedVehicleIDs.includes(parseInt(vidUpper)) ||
          allowedVehicleIDs.includes(vidUpper?.toString());
      });
    }
    return processedData;
  } catch (e) {
    return [];
  }
};

export const getVehicleData = async () => {
  const loginMethod = await safeGetLocalStorage('loginMethod');
  const storedCompanyId = await safeGetLocalStorage('companyId');
  const allowedVehicleIDs = await getAccessibleVehicles();

  if (loginMethod === 'legacy') {
    const userName = await safeGetLocalStorage('userName');
    const password = await safeGetLocalStorage('password');
    if (!userName || !password || !storedCompanyId) return { success: false, message: 'Missing credentials', data: [] };
    const data = await fetchTrackingData(userName, password, storedCompanyId, allowedVehicleIDs);
    return { success: true, data };
  }

  if (loginMethod === 'coldstorage') {
    let data = await fetchTrackingData(SERVICE_USERNAME, SERVICE_PASSWORD, storedCompanyId, allowedVehicleIDs);
    if (data.length === 0) {
      data = await fetchTrackingData(SERVICE_USERNAME, SERVICE_PASSWORD, SERVICE_COMPANY_ID, allowedVehicleIDs);
    }
    return { success: true, data };
  }

  return { success: false, message: 'Not authenticated', data: [] };
};