import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [hideBalances, setHideBalances] = useState(() => {
    const saved = localStorage.getItem('hideBalances');
    return saved === 'true';
  });
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark'; // 'light' or 'dark'
  }); // 'light' or 'dark'

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      return newTheme;
    });
  };

  useEffect(() => {
    localStorage.setItem('hideBalances', hideBalances);
  }, [hideBalances]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const value = {
    hideBalances,
    setHideBalances,
    isRecoveryMode,
    setIsRecoveryMode,
    theme,
    toggleTheme,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
