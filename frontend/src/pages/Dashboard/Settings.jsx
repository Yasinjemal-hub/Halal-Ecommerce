import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiCheckCircle, FiSave } from 'react-icons/fi';
import { getProfile } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import { getChangedFields, getRequestStatus, hasGenuinePendingRequest } from '../../utils/profileUpdates';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import { toast } from 'react-hot-toast';
import './Settings.css';

const FIELD_KEYS = {
    firstName: 'pa_field_first',
    lastName: 'pa_field_last',
    email: 'pa_field_email',
    phone: 'pa_field_phone',
};

const ROLE_KEYS = {
    consumer: 'auth_consumer',
    merchant: 'auth_merchant',
    admin: 'pa_role_admin',
    superadmin: 'pa_role_superadmin',
};

// Native names stay untranslated in every locale. Only the server
// languages (en/am/om/so) can be saved to the profile — Arabic is
// local-only (see LanguageContext SERVER_LANGUAGES).
const LANG_NAMES = {
    en: 'English',
    am: 'አማርኛ',
    om: 'Afaan Oromoo',
    so: 'Af-Soomaali',
};

const Settings = () => {
    const { t, formatDate } = useLanguage();
    const dispatch = useDispatch();
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        preferredLanguage: 'en',
        addressStreet: '',
        addressSubcity: '',
        addressCity: '',
        addressRegion: 'Addis Ababa',
        addressPostalCode: '',
        addressCountry: 'Ethiopia',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await authService.getProfile();
            const user = response.user || response;
            setProfile(user);
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                preferredLanguage: user.preferredLanguage || 'en',
                addressStreet: user.address?.street || '',
                addressSubcity: user.address?.subcity || '',
                addressCity: user.address?.city || 'Addis Ababa',
                addressRegion: user.address?.region || 'Addis Ababa',
                addressPostalCode: user.address?.postalCode || '',
                addressCountry: user.address?.country || 'Ethiopia',
            });
        } catch (error) {
            console.error(error);
            toast.error(backendError(t, error, 'set_err_load'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleInputChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);

        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            preferredLanguage: formData.preferredLanguage,
            address: {
                street: formData.addressStreet,
                subcity: formData.addressSubcity,
                city: formData.addressCity,
                region: formData.addressRegion,
                postalCode: formData.addressPostalCode,
                country: formData.addressCountry,
            },
        };

        try {
            const response = await authService.updateProfile(payload);
            const updatedUser = response.user || response;
            setProfile(updatedUser);
            dispatch(getProfile());
            toast.success(response.pendingReview
                ? t('set_pending_review_toast')
                : (response.message || t('set_updated_toast')));
        } catch (error) {
            console.error(error);
            toast.error(backendError(t, error, 'set_err_submit'));
        } finally {
            setSaving(false);
        }
    };

    const pending = profile?.pendingProfileUpdate;
    // Genuine requests only: status + request date + ≥1 real changed field
    // (mirrors the backend queue predicate).
    const hasPending = hasGenuinePendingRequest(profile);
    const requestStatus = getRequestStatus(profile);
    const wasReviewed =
        (requestStatus === 'approved' || requestStatus === 'rejected') &&
        getChangedFields(profile).length > 0;
    const changedFields = getChangedFields(profile);
    const fieldLabel = (field) => (FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : String(field || ''));
    const roleLabel = ROLE_KEYS[profile?.role] ? t(ROLE_KEYS[profile.role]) : String(profile?.role || '');

    return (
        <div className="settings-page">
            <div className="settings-hero card">
                <div>
                    <span className="badge badge-halal">{t('set_badge')}</span>
                    <h1>{t('set_title')}</h1>
                    <p>
                        {t('set_desc')}
                    </p>
                </div>
                <div className="settings-hero-actions">
                    <div className="settings-hero-meta">
                        <span className="settings-hero-meta-label">{t('set_signed_in')}</span>
                        <strong>{profile?.email || '—'}</strong>
                        <div className="settings-role-badge">{roleLabel}</div>
                    </div>
                    <Link to={profile?.role === 'admin' || profile?.role === 'superadmin' ? '/admin' : '/dashboard'} className="btn btn-secondary btn-sm">
                        {t('set_back')}
                    </Link>
                </div>
            </div>

            {hasPending && (
                <div className="card settings-pending-card">
                    <div className="settings-card-header">
                        <FiCheckCircle /> {t('set_pending_title')}
                    </div>
                    <p className="settings-note">
                        {t('set_pending_desc')}
                    </p>
                    <div className="settings-pending-list">
                        {changedFields.map(({ field, current, requested }) => (
                            <div key={field}>
                                <strong>{fieldLabel(field)}:</strong> {String(current) === '' ? '—' : String(current)}
                                {' → '}
                                {String(requested)}
                            </div>
                        ))}
                        {pending.requestedAt && <div><strong>{t('set_requested')}</strong> {formatDate(pending.requestedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                </div>
            )}

            {wasReviewed && (
                <div className="card settings-pending-card">
                    <div className="settings-card-header">
                        <FiCheckCircle /> {pending.status === 'approved' ? t('set_approved_title') : t('set_rejected_title')}
                    </div>
                    <p className="settings-note">
                        {pending.status === 'approved'
                            ? t('set_approved_desc')
                            : t('set_rejected_desc')}
                    </p>
                    <div className="settings-pending-list">
                        {changedFields.map(({ field, requested }) => (
                            <div key={field}>
                                <strong>{fieldLabel(field)} {t('set_requested_suffix')}</strong> {String(requested)}
                            </div>
                        ))}
                        {pending.reviewedAt && <div><strong>{t('set_reviewed')}</strong> {formatDate(pending.reviewedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                        {pending.reviewNotes && <div><strong>{t('set_admin_notes')}</strong> {pending.reviewNotes}</div>}
                    </div>
                </div>
            )}

            <div className="settings-grid">
                <div className="card settings-card">
                    <div className="settings-card-header">{t('set_profile_details')}</div>
                    {loading ? (
                        <div className="settings-loading">{t('set_loading')}</div>
                    ) : (
                        <form className="settings-form" onSubmit={handleSubmit}>
                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">{t('pa_field_first')}</label>
                                    <input
                                        className="input"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        type="text"
                                        placeholder={t('pa_field_first')}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('pa_field_last')}</label>
                                    <input
                                        className="input"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        type="text"
                                        placeholder={t('pa_field_last')}
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">{t('pa_field_email')}</label>
                                    <div className="input-with-icon">
                                        <FiMail className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            type="email"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('pa_field_phone')}</label>
                                    <div className="input-with-icon">
                                        <FiPhone className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            type="tel"
                                            placeholder="0912345678"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">{t('set_lang_label')}</label>
                                <select
                                    className="input"
                                    value={formData.preferredLanguage}
                                    onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                                >
                                    {Object.entries(LANG_NAMES).map(([code, name]) => (
                                        <option key={code} value={code}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="settings-card-subtitle">{t('set_address')}</div>
                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">{t('set_street')}</label>
                                    <div className="input-with-icon">
                                        <FiMapPin className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.addressStreet}
                                            onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                                            type="text"
                                            placeholder={t('set_street_ph')}
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('set_subcity')}</label>
                                    <input
                                        className="input"
                                        value={formData.addressSubcity}
                                        onChange={(e) => handleInputChange('addressSubcity', e.target.value)}
                                        type="text"
                                        placeholder={t('set_subcity_ph')}
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">{t('set_city')}</label>
                                    <input
                                        className="input"
                                        value={formData.addressCity}
                                        onChange={(e) => handleInputChange('addressCity', e.target.value)}
                                        type="text"
                                        placeholder={t('set_city_ph')}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('set_region')}</label>
                                    <input
                                        className="input"
                                        value={formData.addressRegion}
                                        onChange={(e) => handleInputChange('addressRegion', e.target.value)}
                                        type="text"
                                        placeholder={t('set_region_ph')}
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">{t('set_postal')}</label>
                                    <input
                                        className="input"
                                        value={formData.addressPostalCode}
                                        onChange={(e) => handleInputChange('addressPostalCode', e.target.value)}
                                        type="text"
                                        placeholder={t('set_postal_ph')}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('set_country')}</label>
                                    <div className="input-with-icon">
                                        <FiGlobe className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.addressCountry}
                                            onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                                            type="text"
                                            placeholder={t('set_country_ph')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary settings-save-button" disabled={saving}>
                                <FiSave /> {saving ? t('set_saving') : t('set_save')}
                            </button>
                        </form>
                    )}
                </div>

                <div className="card settings-card settings-summary-card">
                    <div className="settings-card-header">{t('set_summary')}</div>
                    <div className="settings-summary-list">
                        <div>
                            <strong>{t('set_sum_name')}</strong>
                            <p>{profile?.firstName} {profile?.lastName}</p>
                        </div>
                        <div>
                            <strong>{t('set_sum_email')}</strong>
                            <p>{profile?.email}</p>
                        </div>
                        <div>
                            <strong>{t('set_sum_phone')}</strong>
                            <p>{profile?.phone || t('cc_not_provided')}</p>
                        </div>
                        <div>
                            <strong>{t('set_sum_role')}</strong>
                            <p>{roleLabel}</p>
                        </div>
                        <div>
                            <strong>{t('set_sum_lang')}</strong>
                            <p>{LANG_NAMES[profile?.preferredLanguage] || profile?.preferredLanguage || 'en'}</p>
                        </div>
                    </div>
                    <p className="settings-summary-note">
                        {t('set_summary_note')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
