import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';

const LanguageSwitcher = () => {
    const { language, setLanguage, languages } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    const currentLang = languages.find((l) => l.code === language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (code) => {
        setLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="lang-switcher" ref={ref} id="language-switcher">
            <button
                className="lang-switcher-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Switch language"
                id="lang-switcher-toggle"
            >
                <FiGlobe size={14} />
                <span className="lang-switcher-current">
                    {currentLang.flag} {currentLang.nativeName}
                </span>
                <FiChevronDown size={12} className={`lang-chevron ${isOpen ? 'lang-chevron-open' : ''}`} />
            </button>

            {isOpen && (
                <div className="lang-dropdown animate-scale-in" id="lang-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            className={`lang-option ${language === lang.code ? 'lang-option-active' : ''}`}
                            onClick={() => handleSelect(lang.code)}
                            id={`lang-option-${lang.code}`}
                        >
                            <span className="lang-option-flag">{lang.flag}</span>
                            <span className="lang-option-name">{lang.nativeName}</span>
                            {language === lang.code && <span className="lang-option-check">active</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
