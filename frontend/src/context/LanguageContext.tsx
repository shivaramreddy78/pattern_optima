"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

const defaultContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  formatDate: (dateString: string) => dateString,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

const localesMap: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.language && localesMap[user.language as Language]) {
      setLanguageState(user.language as Language);
      localStorage.setItem('pattern_optima_language', user.language);
    } else {
      const storedLang = localStorage.getItem('pattern_optima_language') as Language;
      if (storedLang && localesMap[storedLang]) {
        setLanguageState(storedLang);
      }
    }
  }, [user]);

  // Load translation dictionary
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const res = await fetch(`/locales/${language}.json`);
        if (res.ok) {
          const data = await res.json();
          setTranslations(data);
        } else {
          console.warn(`Failed to load translations for ${language}`);
        }
      } catch (err) {
        console.warn(`Error loading translations for ${language}`, err);
      }
    };
    
    document.documentElement.lang = language;
    loadTranslations();
  }, [language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pattern_optima_language', lang);

    if (user) {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const payload = {
          email: user.email,
          full_name: user.full_name,
          company_name: user.company_name,
          mobile_number: user.mobile_number,
          profile_image: user.profile_image,
          accent_color: user.accent_color,
          theme: user.theme,
          language: lang,
        };

        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("Failed to sync language to backend", err);
      }
    }
  };

  const t = (key: string): string => {
    if (!key) return key;
    const trimmedKey = typeof key === 'string' ? key.trim() : key;
    if (translations[trimmedKey]) {
      return translations[trimmedKey];
    }
    return key;
  };

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat(localesMap[language], {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `₹${value.toFixed(0)}`;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(localesMap[language], {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
