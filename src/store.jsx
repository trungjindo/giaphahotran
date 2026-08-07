import React, { createContext, useState, useEffect } from 'react';
import {
  familyData as initialFamily,
  financeData as initialFinance,
  newsData as initialNews,
  aboutData as initialAbout,
  bannerData as initialBanner,
  galleryData as initialGallery
} from './data';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });

  // Data States
  const [familyData, setFamilyData] = useState(() => {
    const saved = localStorage.getItem('familyData_v3');
    return saved ? JSON.parse(saved) : initialFamily;
  });

  const [financeData, setFinanceData] = useState(() => {
    const saved = localStorage.getItem('financeData_v2');
    return saved ? JSON.parse(saved) : initialFinance;
  });

  const [newsData, setNewsData] = useState(() => {
    const saved = localStorage.getItem('newsData');
    return saved ? JSON.parse(saved) : initialNews;
  });

  const [aboutData, setAboutData] = useState(() => {
    const saved = localStorage.getItem('aboutData');
    return saved ? JSON.parse(saved) : initialAbout;
  });

  const [bannerData, setBannerData] = useState(() => {
    const saved = localStorage.getItem('bannerData');
    return saved ? JSON.parse(saved) : initialBanner;
  });

  const [galleryData, setGalleryData] = useState(() => {
    const saved = localStorage.getItem('galleryData');
    return saved ? JSON.parse(saved) : initialGallery;
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('isAuth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('familyData_v3', JSON.stringify(familyData));
  }, [familyData]);

  useEffect(() => {
    localStorage.setItem('financeData_v2', JSON.stringify(financeData));
  }, [financeData]);

  useEffect(() => {
    localStorage.setItem('newsData', JSON.stringify(newsData));
  }, [newsData]);

  useEffect(() => {
    localStorage.setItem('aboutData', JSON.stringify(aboutData));
  }, [aboutData]);

  useEffect(() => {
    localStorage.setItem('bannerData', JSON.stringify(bannerData));
  }, [bannerData]);

  useEffect(() => {
    localStorage.setItem('galleryData', JSON.stringify(galleryData));
  }, [galleryData]);

  const login = (username, password) => {
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout,
      familyData, setFamilyData,
      financeData, setFinanceData,
      newsData, setNewsData,
      aboutData, setAboutData,
      bannerData, setBannerData,
      galleryData, setGalleryData
    }}>
      {children}
    </AppContext.Provider>
  );
};
