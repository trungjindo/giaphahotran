import React, { createContext, useState, useEffect } from 'react';
import { apiGet, apiSave, apiLogin, apiLogout, apiVerifyFamily, VIEWER_TOKEN_KEY } from './api';

export const AppContext = createContext();

const DATA_DEFAULTS = {
  familyData: null,
  financeData: { openingBalance: 0, transactions: [] },
  newsData: [],
  aboutData: { image: '', content: '', highlights: [] },
  bannerData: [],
  galleryData: [],
  contactAdminData: { name: '', email: '', phone: '', address: '' },
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

  // Xác thực con cháu: dành cho người trong dòng họ KHÔNG có tài khoản quản trị. Token này
  // chỉ cho XEM, không bao giờ cho ghi — mọi API ghi vẫn đòi token tài khoản như cũ.
  const [viewerToken, setViewerToken] = useState(() => localStorage.getItem(VIEWER_TOKEN_KEY) || null);
  const [viewerMember, setViewerMember] = useState(() => {
    const saved = localStorage.getItem('familyViewerMember');
    return saved ? JSON.parse(saved) : null;
  });
  // Quản trị viên đã đăng nhập đương nhiên là người trong họ — không bắt xác thực lại.
  const isFamilyVerified = isAuthenticated || !!viewerToken;

  const [familyData, setFamilyDataState] = useState(null);
  const [financeData, setFinanceDataState] = useState(null);
  const [newsData, setNewsDataState] = useState(null);
  const [aboutData, setAboutDataState] = useState(null);
  const [bannerData, setBannerDataState] = useState(null);
  const [galleryData, setGalleryDataState] = useState(null);
  const [contactAdminData, setContactAdminDataState] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Tải lại toàn bộ dữ liệu mỗi khi quyền truy cập thay đổi (đăng nhập/đăng xuất, hoặc vừa
  // xác thực/huỷ xác thực con cháu) — familyData và financeData giờ bị khoá phía máy chủ nên
  // chỉ tải được sau khi có quyền.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      // Dùng allSettled thay vì all: familyData/financeData sẽ trả 401 với khách chưa xác
      // thực, và đó là trạng thái BÌNH THƯỜNG — không được để nó làm hỏng cả trang (tin tức,
      // giới thiệu, thư viện ảnh vẫn phải xem được công khai).
      const results = await Promise.allSettled([
        apiGet('familyData', token),
        apiGet('financeData', token),
        apiGet('newsData'),
        apiGet('aboutData'),
        apiGet('bannerData'),
        apiGet('galleryData'),
        apiGet('contactAdminData')
      ]);
      if (cancelled) return;

      const setters = [
        [setFamilyDataState, DATA_DEFAULTS.familyData],
        [setFinanceDataState, DATA_DEFAULTS.financeData],
        [setNewsDataState, DATA_DEFAULTS.newsData],
        [setAboutDataState, DATA_DEFAULTS.aboutData],
        [setBannerDataState, DATA_DEFAULTS.bannerData],
        [setGalleryDataState, DATA_DEFAULTS.galleryData],
        [setContactAdminDataState, DATA_DEFAULTS.contactAdminData],
      ];

      let fatalError = null;
      results.forEach((res, i) => {
        const [setState, fallback] = setters[i];
        if (res.status === 'fulfilled') {
          setState(res.value ?? fallback);
        } else if (res.reason?.isAuthError) {
          setState(null); // chưa có quyền xem — giao diện sẽ hiện màn hình xác thực
        } else {
          fatalError = res.reason?.message || 'Không thể kết nối tới máy chủ.';
        }
      });

      // Chỉ báo lỗi toàn trang khi các dữ liệu CÔNG KHAI cũng tải hỏng (thật sự mất kết nối).
      setLoadError(fatalError);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, viewerToken]);

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

  // Trả về { ok, error } thay vì true/false: máy chủ có thể từ chối vì bị KHOÁ TẠM do đăng
  // nhập sai quá nhiều lần, và người dùng cần đọc đúng lý do đó — nếu vẫn báo chung chung
  // "sai mật khẩu" thì người nhập đúng mật khẩu sẽ không hiểu vì sao mãi không vào được.
  const login = async (username, password) => {
    const result = await apiLogin(username, password);
    if (result.ok && result.success) {
      setToken(result.token);
      setUser(result.user || null);
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('authUser', JSON.stringify(result.user || null));
      return { ok: true };
    }
    return { ok: false, error: result.error || 'Tài khoản hoặc mật khẩu không chính xác!' };
  };

  const logout = () => {
    apiLogout(token);
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  // Xác thực con cháu. Trả về { ok, error } để form hiển thị đúng thông báo từ máy chủ
  // (sai thông tin / bị khoá tạm do thử quá nhiều / quản trị chưa cấu hình câu hỏi).
  const verifyFamily = async ({ fullName, fatherName, teHoDay, teHoMonth }) => {
    const result = await apiVerifyFamily({ fullName, fatherName, teHoDay, teHoMonth });
    if (result.ok && result.success && result.viewerToken) {
      const member = result.member || null;
      localStorage.setItem(VIEWER_TOKEN_KEY, result.viewerToken);
      localStorage.setItem('familyViewerMember', JSON.stringify(member));
      setViewerMember(member);
      setViewerToken(result.viewerToken); // đổi state này sẽ tự kích hoạt tải lại dữ liệu
      return { ok: true };
    }
    return { ok: false, error: result.error || 'Xác thực không thành công. Vui lòng thử lại.' };
  };

  const clearFamilyVerification = () => {
    localStorage.removeItem(VIEWER_TOKEN_KEY);
    localStorage.removeItem('familyViewerMember');
    setViewerMember(null);
    setViewerToken(null);
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout, token,
      user, role, chiId,
      isFamilyVerified, viewerMember, verifyFamily, clearFamilyVerification,
      isLoading, loadError,
      familyData, setFamilyData,
      financeData, setFinanceData,
      newsData, setNewsData,
      aboutData, setAboutData,
      bannerData, setBannerData,
      galleryData, setGalleryData,
      contactAdminData, setContactAdminData
    }}>
      {children}
    </AppContext.Provider>
  );
};
