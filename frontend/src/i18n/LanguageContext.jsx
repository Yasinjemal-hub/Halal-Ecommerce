import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './translations/en';
import am from './translations/am';
import ar from './translations/ar';
import om from './translations/om';
import so from './translations/so';

const translations = { en, am };

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
    { code: 'am', name: 'Amharic', flag: '🇪🇹', nativeName: 'አማርኛ' },
    // { code: 'om', name: 'Afan Oromo', flag: '🇪🇹', nativeName: 'Afaan Oromoo' },
    // { code: 'so', name: 'Somali', flag: '🇸🇴', nativeName: 'Af-Soomaali' },
    // { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
];

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('halal_lang') || 'en';
    });

    const currentTranslations = translations[language] || translations.en;
    const dir = currentTranslations.dir || 'ltr';

    useEffect(() => {
        localStorage.setItem('halal_lang', language);
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', language);
    }, [language, dir]);

    const setLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguageState(lang);
        }
    }, []);

    const t = useCallback((key, replacements = {}) => {
        let text = currentTranslations[key] || translations.en[key] || key;
        Object.entries(replacements).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, v);
        });
        return text;
    }, [currentTranslations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir, languages: LANGUAGES }}>
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
