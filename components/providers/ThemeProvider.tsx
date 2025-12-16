'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'financeflow-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [mounted, setMounted] = useState(false);

    // Get the resolved theme (light or dark) based on current theme setting
    const getResolvedTheme = (currentTheme: Theme): 'light' | 'dark' => {
        if (currentTheme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return currentTheme;
    };

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        setMounted(true);

        // Load theme from localStorage on mount
        try {
            const savedTheme = localStorage.getItem(storageKey) as Theme | null;
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                setThemeState(savedTheme);
                const resolved = getResolvedTheme(savedTheme);
                setResolvedTheme(resolved);
                applyTheme(resolved);
            } else {
                const resolved = getResolvedTheme(defaultTheme);
                setResolvedTheme(resolved);
                applyTheme(resolved);
            }
        } catch (e) {
            // localStorage might not be available
            const resolved = getResolvedTheme(defaultTheme);
            setResolvedTheme(resolved);
            applyTheme(resolved);
        }
    }, [defaultTheme, storageKey]);

    // Listen for system theme changes when theme is set to 'system'
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            const newResolvedTheme = e.matches ? 'dark' : 'light';
            setResolvedTheme(newResolvedTheme);
            applyTheme(newResolvedTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const applyTheme = (themeToApply: 'light' | 'dark') => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(themeToApply);

        // Also set data-theme attribute for additional styling hooks
        root.setAttribute('data-theme', themeToApply);
    };

    const setTheme = (newTheme: Theme) => {
        try {
            localStorage.setItem(storageKey, newTheme);
        } catch (e) {
            // localStorage might not be available
        }

        setThemeState(newTheme);
        const resolved = getResolvedTheme(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    };

    // Prevent flash of unstyled content
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
