import React, { createContext, useState, useEffect, useRef } from 'react';
import { apiGet, apiSave, apiLogin, apiLogout } from './api';

export const AppContext = createContext();

const DATA_DEFAULTS = {
  familyData: null,
  financeData: { openingBalance: 0, transactions: [] },
  newsData: [],
  aboutData: { image: '', content: '', highlights: [] },
  bannerData: [],
  galleryData: [],
  contactAdminData: { name: '', email: '', phone: '', address: '' },
  coupletData: {
    left: 'Uống Nước Nhớ Nguồn',
    right: 'Ăn Quả Nhớ Kẻ Trồng Cây'
  }
};

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('authUser');
    return saved ? JSON.parse(saved) : null;
  });
  const isAuthenticated = !!token;
  const role = user?.role || null;
  const chiId = user?.chiId ?? null;

  const [familyData, setFamilyDataState] = useState(null);
  const [financeData, setFinanceDataState] = useState(null);
  const [newsData, setNewsDataState] = useState(null);
  const [aboutData, setAboutDataState] = useState(null);
  const [bannerData, setBannerDataState] = useState(null);
  const [galleryData, setGalleryDataState] = useState(null);
  const [contactAdminData, setContactAdminDataState] = useState(null);
  const [coupletData, setCoupletDataState] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [family, finance, news, about, banner, gallery, contactAdmin, couplet] = await Promise.all([
          apiGet('familyData', token),
          apiGet('financeData'),
          apiGet('newsData'),
          apiGet('aboutData'),
          apiGet('bannerData'),
          apiGet('galleryData'),
          apiGet('contactAdminData'),
          apiGet('coupletData')
        ]);
        if (cancelled) return;
        setFamilyDataState(family ?? DATA_DEFAULTS.familyData);
        setFinanceDataState(finance ?? DATA_DEFAULTS.financeData);
        setNewsDataState(news ?? DATA_DEFAULTS.newsData);
        setAboutDataState(about ?? DATA_DEFAULTS.aboutData);
        setBannerDataState(banner ?? DATA_DEFAULTS.bannerData);
        setGalleryDataState(gallery ?? DATA_DEFAULTS.galleryData);
        setContactAdminDataState(contactAdmin ?? DATA_DEFAULTS.contactAdminData);
        setCoupletDataState(couplet ?? DATA_DEFAULTS.coupletData);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Không thể kết nối tới máy chủ.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // familyData là dữ liệu duy nhất bị che (số điện thoại) tùy theo đã đăng nhập hay chưa.
  // Khi đăng nhập/đăng xuất NGAY TRONG phiên hiện tại (không tải lại trang), tải lại đúng
  // bản phù hợp quyền hiện tại — bỏ qua lần chạy đầu vì effect tải dữ liệu ở trên đã lo rồi.
  const isFirstTokenRun = useRef(true);
  useEffect(() => {
    if (isFirstTokenRun.current) { isFirstTokenRun.current = false; return; }
    let cancelled = false;
    apiGet('familyData', token)
      .then(family => { if (!cancelled) setFamilyDataState(family ?? DATA_DEFAULTS.familyData); })
      .catch(() => { /* giữ nguyên dữ liệu đang có nếu tải lại lỗi, không chặn UI */ });
    return () => { cancelled = true; };
  }, [token]);

  // Tạo hàm setter: cập nhật giao diện ngay (optimistic) + lưu lên server qua API.
  // Nếu lưu lỗi, báo cho người dùng biết dữ liệu chưa thực sự được lưu.
  const makeSetter = (setState, key) => (updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      apiSave(key, next, token).catch(err => {
        alert(`Lỗi lưu dữ liệu lên máy chủ: ${err.message}\nVui lòng thử lại — thay đổi này có thể chưa được lưu.`);
      });
      return next;
    });
  };

  const setFamilyData = makeSetter(setFamilyDataState, 'familyData');
  const setFinanceData = makeSetter(setFinanceDataState, 'financeData');
  const setNewsData = makeSetter(setNewsDataState, 'newsData');
  const setAboutData = makeSetter(setAboutDataState, 'aboutData');
  const setBannerData = makeSetter(setBannerDataState, 'bannerData');
  const setGalleryData = makeSetter(setGalleryDataState, 'galleryData');
  const setContactAdminData = makeSetter(setContactAdminDataState, 'contactAdminData');
  const setCoupletData = makeSetter(setCoupletDataState, 'coupletData');

  const login = async (username, password) => {
    const result = await apiLogin(username, password);
    if (result.ok && result.success) {
      setToken(result.token);
      setUser(result.user || null);
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('authUser', JSON.stringify(result.user || null));
      return true;
    }
    return false;
  };

  const logout = () => {
    apiLogout(token);
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout, token,
      user, role, chiId,
      isLoading, loadError,
      familyData, setFamilyData,
      financeData, setFinanceData,
      newsData, setNewsData,
      aboutData, setAboutData,
      bannerData, setBannerData,
      galleryData, setGalleryData,
      contactAdminData, setContactAdminData,
      coupletData, setCoupletData
    }}>
      {children}
    </AppContext.Provider>
  );
};
