import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import en from './translations/en';
import am from './translations/am';
import om from './translations/om';
import so from './translations/so';
import ar from './translations/ar';
import authService from '../services/authService';
import { setUser } from '../redux/slices/authSlice';

// Bundled local catalogs only — the app never calls an external
// translation service at runtime and never sends user text anywhere.
const translations = { en, am, om, so, ar };

export const SUPPORTED_LANGUAGES = ['en', 'am', 'om', 'so', 'ar'];

// BCP-47 tags for locale-aware formatting (dates, numbers, currency).
export const LOCALE_TAGS = {
    en: 'en-ET',
    am: 'am-ET',
    om: 'om-ET',
    so: 'so-SO',
    ar: 'ar-EG',
};

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
    { code: 'am', name: 'Amharic', flag: '🇪🇹', nativeName: 'አማርኛ' },
    { code: 'om', name: 'Afan Oromo', flag: '🇪🇹', nativeName: 'Afaan Oromoo' },
    { code: 'so', name: 'Somali', flag: '🇸🇴', nativeName: 'Af-Soomaali' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
];

const STORAGE_KEY = 'halal_lang';

// Languages the backend account profile accepts. Arabic is local-only:
// it works fully in the UI but cannot be saved to the user profile.
export const SERVER_LANGUAGES = ['en', 'am', 'om', 'so'];

const isSupported = (code) => SUPPORTED_LANGUAGES.includes(code);

// Fill every {var} occurrence (not just the first).
const fill = (text, vars) => {
    let out = String(text);
    for (const [k, v] of Object.entries(vars || {})) {
        out = out.split(`{${k}}`).join(String(v));
    }
    return out;
};

// Look up a key with full English fallback: a missing translation always
// resolves to readable English, never a blank string or raw key (the en
// catalog is validated complete by `npm run i18n:validate`).
const lookup = (lang, key) => {
    const table = translations[lang] || {};
    if (table[key] !== undefined) return table[key];
    if (translations.en[key] !== undefined) return translations.en[key];
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing key "${key}" — English fallback also missing`);
    }
    return key;
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const [language, setLanguageState] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return isSupported(saved) ? saved : 'en';
    });
    const syncingRef = useRef(false);

    const currentTranslations = translations[language] || translations.en;
    const dir = currentTranslations.dir || 'ltr';

    // Immediate switch + persistence, no reload, no blocking.
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', language);
    }, [language, dir]);

    const setLanguage = useCallback((lang) => {
        if (isSupported(lang)) setLanguageState(lang);
    }, []);

    // Respect the signed-in user's saved preference: when auth state
    // arrives/changes, adopt a valid saved preference. Arabic has no
    // backend slot, so a stored 'ar' choice is never overwritten.
    useEffect(() => {
        if (syncingRef.current) return;
        const pref = user?.preferredLanguage;
        if (isAuthenticated && isSupported(pref) && pref !== language && language !== 'ar') {
            syncingRef.current = true;
            setLanguageState(pref);
            syncingRef.current = false;
        }
    }, [isAuthenticated, user, language]);

    // Persist a manual switch to the account profile when possible
    // (server languages only), keeping the local choice either way.
    const setLanguageAndPersist = useCallback((lang) => {
        if (!isSupported(lang)) return;
        setLanguageState(lang);
        try {
            const stored = authService.getCurrentUser?.();
            if (stored && SERVER_LANGUAGES.includes(lang) && stored.preferredLanguage !== lang) {
                authService.updateProfile({ preferredLanguage: lang })
                    .then((res) => {
                        const updated = res.user || res;
                        if (updated?.preferredLanguage) dispatch(setUser(updated));
                    })
                    .catch(() => { /* local preference already applied */ });
            }
        } catch {
            /* local preference already applied */
        }
    }, [dispatch]);

    const t = useCallback((key, replacements = {}) => (
        fill(lookup(language, key), replacements)
    ), [language]);

    // CLDR plural forms via Intl.PluralRules: resolves
    // `${base}_{zero,one,two,few,many,other}` then falls back to the base
    // key and finally English — never concatenation of fragments.
    const tp = useCallback((base, count, replacements = {}) => {
        const n = Number(count);
        let suffix = 'other';
        try {
            suffix = new Intl.PluralRules(LOCALE_TAGS[language] || 'en').select(n);
        } catch {
            suffix = n === 1 ? 'one' : 'other';
        }
        const table = translations[language] || {};
        const pick = [`${base}_${suffix}`, `${base}_other`, base]
            .map((k) => (table[k] !== undefined ? table[k] : translations.en[k]))
            .find((v) => v !== undefined);
        return fill(pick !== undefined ? pick : base, { ...replacements, count: n });
    }, [language]);

    const formatDate = useCallback((value, options) => {
        if (value === null || value === undefined || value === '') return '';
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        try {
            return new Intl.DateTimeFormat(LOCALE_TAGS[language] || 'en-ET', options).format(date);
        } catch {
            return date.toLocaleDateString();
        }
    }, [language]);

    const formatNumber = useCallback((value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '';
        try {
            return new Intl.NumberFormat(LOCALE_TAGS[language] || 'en-ET').format(n);
        } catch {
            return String(n);
        }
    }, [language]);

    const formatETB = useCallback((value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '';
        try {
            return new Intl.NumberFormat(LOCALE_TAGS[language] || 'en-ET', {
                style: 'currency',
                currency: 'ETB',
                maximumFractionDigits: 0,
            }).format(n);
        } catch {
            return `${n} ETB`;
        }
    }, [language]);

    return (
        <LanguageContext.Provider value={{
            language, setLanguage, setLanguageAndPersist, t, tp, dir,
            languages: LANGUAGES, formatDate, formatNumber, formatETB,
            locale: LOCALE_TAGS[language] || 'en-ET',
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
