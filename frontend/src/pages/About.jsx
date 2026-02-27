import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShield, FiUsers, FiZap, FiGlobe, FiCheckCircle } from 'react-icons/fi';
import { useLanguage } from '../i18n/LanguageContext';
import './About.css';

const About = () => {
    const { t } = useLanguage();

    const values = [
        { icon: <FiShield />, titleKey: 'about_value_trust', descKey: 'about_value_trust_desc', color: '#0D7C3D' },
        { icon: <FiUsers />, titleKey: 'about_value_community', descKey: 'about_value_community_desc', color: '#2563eb' },
        { icon: <FiZap />, titleKey: 'about_value_innovation', descKey: 'about_value_innovation_desc', color: '#d97706' },
        { icon: <FiGlobe />, titleKey: 'about_value_inclusion', descKey: 'about_value_inclusion_desc', color: '#7c3aed' },
    ];

    return (
        <div className="about-page">
            {/* Hero */}
            <section className="about-hero">
                <div className="about-hero-bg">
                    <div className="pattern-overlay" />
                </div>
                <div className="container about-hero-content">
                    <span className="about-badge"><FiCheckCircle /> {t('about_subtitle')}</span>
                    <h1 className="heading-hero">{t('about_title')}</h1>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="about-section">
                <div className="container">
                    <div className="about-grid">
                        <div className="about-card about-card-mission">
                            <div className="about-card-icon" style={{ background: '#0D7C3D15', color: '#0D7C3D' }}>🕌</div>
                            <h2>{t('about_mission_title')}</h2>
                            <p>{t('about_mission_text')}</p>
                        </div>
                        <div className="about-card about-card-vision">
                            <div className="about-card-icon" style={{ background: '#2563eb15', color: '#2563eb' }}>🌍</div>
                            <h2>{t('about_vision_title')}</h2>
                            <p>{t('about_vision_text')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="about-section about-values-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="heading-section section-title">{t('about_values_title')}</h2>
                    </div>
                    <div className="about-values-grid">
                        {values.map((val) => (
                            <div key={val.titleKey} className="about-value-card">
                                <div className="about-value-icon" style={{ background: `${val.color}15`, color: val.color }}>
                                    {val.icon}
                                </div>
                                <h3>{t(val.titleKey)}</h3>
                                <p>{t(val.descKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team / Community */}
            <section className="about-section about-team-section">
                <div className="container">
                    <div className="about-team-content">
                        <div className="about-team-visual">
                            <div className="about-team-pattern pattern-overlay" />
                            <div className="about-team-stats">
                                <div className="about-team-stat"><span className="about-team-stat-emoji">🇪🇹</span><span className="about-team-stat-val">13</span><span>Regions</span></div>
                                <div className="about-team-stat"><span className="about-team-stat-emoji">🕌</span><span className="about-team-stat-val">500+</span><span>Merchants</span></div>
                                <div className="about-team-stat"><span className="about-team-stat-emoji">🌍</span><span className="about-team-stat-val">4</span><span>Languages</span></div>
                                <div className="about-team-stat"><span className="about-team-stat-emoji">⭐</span><span className="about-team-stat-val">50K+</span><span>Customers</span></div>
                            </div>
                        </div>
                        <div className="about-team-text">
                            <h2 className="heading-section">{t('about_team_title')}</h2>
                            <p className="text-body">{t('about_team_text')}</p>
                            <Link to="/shop" className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-6)' }}>
                                {t('about_cta')} <FiArrowRight />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
