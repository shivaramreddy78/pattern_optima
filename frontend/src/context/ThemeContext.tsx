"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type AccentColor = 'blue' | 'cyan' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'indigo';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  isLoadingTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  accentColor: 'blue',
  setAccentColor: () => {},
  theme: 'dark',
  setTheme: () => {},
  isLoadingTheme: true,
});

export const PRESET_COLORS: Record<AccentColor, string> = {
  blue: '59 130 246',    // Tailwind blue-500
  cyan: '6 182 212',     // Tailwind cyan-500
  purple: '168 85 247',  // Tailwind purple-500
  green: '34 197 94',    // Tailwind green-500
  orange: '249 115 22',  // Tailwind orange-500
  red: '239 68 68',      // Tailwind red-500
  pink: '236 72 153',    // Tailwind pink-500
  indigo: '99 102 241',  // Tailwind indigo-500
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  // Initialize theme on mount and when user changes
  useEffect(() => {
    // 1. Check user profile for accent color
    if (user && user.accent_color && PRESET_COLORS[user.accent_color as AccentColor]) {
      setAccentColorState(user.accent_color as AccentColor);
      localStorage.setItem('pattern_optima_accent_color', user.accent_color);
    } else {
      const storedColor = localStorage.getItem('pattern_optima_accent_color') as AccentColor;
      if (storedColor && PRESET_COLORS[storedColor]) {
        setAccentColorState(storedColor);
      }
    }
    
    // 2. Check user profile for theme mode
    if (user && user.theme && (user.theme === 'light' || user.theme === 'dark')) {
      setThemeState(user.theme as ThemeMode);
      localStorage.setItem('pattern_optima_theme', user.theme);
    } else {
      const storedTheme = localStorage.getItem('pattern_optima_theme') as ThemeMode;
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setThemeState(storedTheme);
      }
    }

    setIsLoadingTheme(false);
  }, [user]);

  // Apply CSS variables whenever accentColor changes and handle dark mode class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const rgbValue = PRESET_COLORS[accentColor];
      document.documentElement.style.setProperty('--color-accent', rgbValue);
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [accentColor, theme]);

  // Public setter that also syncs to backend
  const setAccentColor = async (color: AccentColor) => {
    if (!PRESET_COLORS[color]) return;
    
    // Optimistic UI update
    setAccentColorState(color);
    localStorage.setItem('pattern_optima_accent_color', color);

    // Sync to backend if logged in
    if (user) {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // We only send the fields we want to update.
        // Assuming the backend accepts partial updates or we send the full profile.
        // Based on the endpoint `PUT /api/v1/auth/profile`, it expects `UserBase` schema.
        // We will send the existing fields + the new accent_color
        const payload = {
          email: user.email,
          full_name: user.full_name,
          company_name: user.company_name,
          mobile_number: user.mobile_number,
          profile_image: user.profile_image,
          accent_color: color,
          theme: theme, // Keep existing theme
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
        console.error("Failed to sync accent color to backend", err);
      }
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('pattern_optima_theme', mode);

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
          accent_color: accentColor, // Keep existing accent_color
          theme: mode,
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
        console.error("Failed to sync theme to backend", err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor, theme, setTheme, isLoadingTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
