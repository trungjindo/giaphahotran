import React, { createContext, useState, useEffect } from 'react';
import { familyData as initialFamily, financeData as initialFinance, newsData as initialNews } from './data';

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
    const saved = localStorage.getItem('financeData');
    return saved ? JSON.parse(saved) : initialFinance;
  });

  const [newsData, setNewsData] = useState(() => {
    const saved = localStorage.getItem('newsData');
    return saved ? JSON.parse(saved) : initialNews;
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('isAuth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('familyData_v3', JSON.stringify(familyData));
  }, [familyData]);

  useEffect(() => {
    localStorage.setItem('financeData', JSON.stringify(financeData));
  }, [financeData]);

  useEffect(() => {
    localStorage.setItem('newsData', JSON.stringify(newsData));
  }, [newsData]);

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
      newsData, setNewsData
    }}>
      {children}
    </AppContext.Provider>
  );
};
