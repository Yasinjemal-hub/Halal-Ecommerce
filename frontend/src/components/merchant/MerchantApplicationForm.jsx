import React, { useState } from 'react';
import { FiStar, FiTrendingUp, FiShield, FiFileText, FiUser } from 'react-icons/fi';
import mejilisService from '../../services/mejilisService';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';

// Single source of truth for the merchant application form, used by both
// the /merchant/register route and the Mejilis page register tab.
// Product rule: this is the ONLY application form. Majlis approval of this
// business registration also approves the business as halal certified —
// no certificate type selection, no evidence flow, no second application.
// Uses Mejilis.css classes (imported by the hosting page).
const BUSINESS_TYPES = [
    { value: 'restaurant', key: 'mtype_restaurant' },
    { value: 'grocery', key: 'mtype_grocery' },
    { value: 'butcher', key: 'mtype_butcher' },
    { value: 'bakery', key: 'mtype_bakery' },
    { value: 'wholesale', key: 'mtype_wholesale' },
    { value: 'cosmetics', key: 'mtype_cosmetics' },
    { value: 'clothing', key: 'mtype_clothing' },
    { value: 'spice_shop', key: 'mtype_spice_shop' },
    { value: 'supermarket', key: 'mtype_supermarket' },
    { value: 'other', key: 'mtype_other' },
];

const REGIONS = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa',
    'Gambella', 'Harari', 'Oromia', 'Sidama', 'Somali',
    'South West Ethiopia', 'Southern Nations', 'Tigray',
];

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const emptyForm = () => ({
    businessName: '',
    businessNameAmharic: '',
    description: '',
    businessType: '',
    businessPhone: '',
    businessEmail: '',
    city: '',
    region: '',
    subcity: '',
    street: '',
    applicationNotes: '',
});

const fromMerchant = (m) => ({
    businessName: m?.businessName || '',
    businessNameAmharic: m?.businessNameAmharic || '',
    description: m?.description || '',
    businessType: m?.businessType || '',
    businessPhone: m?.businessPhone || '',
    businessEmail: m?.businessEmail || '',
    city: m?.businessAddress?.city || '',
    region: m?.businessAddress?.region || '',
    subcity: m?.businessAddress?.subcity || '',
    street: m?.businessAddress?.street || '',
    applicationNotes: m?.applicationNotes || '',
});

/**
 * @param {'create'|'resubmit'} mode — create = new application (documents
 *        required); resubmit = edit existing (documents optional, existing
 *        files are kept unless replaced).
 */
const MerchantApplicationForm = ({ mode = 'create', initialValues = null, onSubmitted, onError, onCancel }) => {
    const { t } = useLanguage();
    const isResubmit = mode === 'resubmit';
    const [form, setForm] = useState(() => (initialValues ? fromMerchant(initialValues) : emptyForm()));
    const [licenseFile, setLicenseFile] = useState(null);
    const [nationalIdFile, setNationalIdFile] = useState(null);
    const [licenseDragOver, setLicenseDragOver] = useState(false);
    const [nationalIdDragOver, setNationalIdDragOver] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const fail = (message) => {
        setLocalError(message);
        if (onError) onError(message);
    };

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            fail(t('appform_img_type_error'));
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            fail(t('appform_img_size', { size: MAX_IMAGE_SIZE_MB }));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setLocalError('');

        try {
            const [licenseUrl, nationalIdUrl] = await Promise.all([
                licenseFile ? fileToBase64(licenseFile) : Promise.resolve(''),
                nationalIdFile ? fileToBase64(nationalIdFile) : Promise.resolve(''),
            ]);

            const payload = {
                businessName: form.businessName,
                businessNameAmharic: form.businessNameAmharic,
                description: form.description,
                businessType: form.businessType,
                businessPhone: form.businessPhone,
                businessEmail: form.businessEmail,
                businessAddress: {
                    city: form.city,
                    region: form.region,
                    subcity: form.subcity,
                    street: form.street,
                },
                applicationNotes: form.applicationNotes?.trim() || undefined,
            };
            // New files replace stored documents; otherwise existing
            // documents are preserved server-side (fields simply omitted).
            if (licenseUrl) payload.governmentLicense = { url: licenseUrl };
            if (nationalIdUrl) payload.nationalId = { url: nationalIdUrl };

            const result = isResubmit
                ? await mejilisService.updateRegistration(payload)
                : await mejilisService.registerMerchant(payload);
            if (onSubmitted) onSubmitted(result.merchant, result.message);
        } catch (err) {
            fail(backendError(t, err, 'appform_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const docsRequired = !isResubmit;

    return (
        <div className="mejilis-register-form-card">
            <h3>{isResubmit ? t('appform_update_title') : t('appform_create_title')}</h3>
            <p>
                {isResubmit ? t('appform_update_desc') : t('appform_create_desc')}
            </p>
            {localError && (
                <div className="mejilis-error-message" role="alert">
                    <p>{localError}</p>
                </div>
            )}
            <form className="mejilis-form" onSubmit={handleSubmit}>
                {/* ── SECTION 1: BUSINESS IDENTITY ── */}
                <div className="mejilis-form-section">
                    <h4 className="mejilis-form-section-title"><FiStar /> {t('appform_identity')}</h4>
                    <div className="mejilis-form-row">
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-business-name">
                                {t('appform_name')} <span className="required">*</span>
                            </label>
                            <input
                                className="mejilis-form-input"
                                type="text"
                                placeholder={t('appform_name_ph')}
                                value={form.businessName}
                                onChange={(e) => updateForm('businessName', e.target.value)}
                                required
                                id="app-business-name"
                            />
                        </div>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-business-name-am">{t('appform_name_am')}</label>
                            <input
                                className="mejilis-form-input"
                                type="text"
                                placeholder="e.g. አዲስ ሐላል ስጋ"
                                value={form.businessNameAmharic}
                                onChange={(e) => updateForm('businessNameAmharic', e.target.value)}
                                id="app-business-name-am"
                            />
                        </div>
                    </div>

                    <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                        <label className="mejilis-form-label" htmlFor="app-business-type">
                            {t('appform_type')} <span className="required">*</span>
                        </label>
                        <select
                            className="mejilis-form-select"
                            value={form.businessType}
                            onChange={(e) => updateForm('businessType', e.target.value)}
                            required
                            id="app-business-type"
                        >
                            <option value="">{t('appform_select_type')}</option>
                            {BUSINESS_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {t(type.key)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mejilis-form-group full-width">
                        <label className="mejilis-form-label" htmlFor="app-description">
                            {t('appform_description')} <span className="required">*</span>
                        </label>
                        <textarea
                            className="mejilis-form-textarea"
                            placeholder={t('appform_description_ph')}
                            value={form.description}
                            onChange={(e) => updateForm('description', e.target.value)}
                            required
                            rows={4}
                            id="app-description"
                        />
                    </div>

                    <div className="mejilis-form-group full-width">
                        <label className="mejilis-form-label" htmlFor="app-application-notes">
                            {t('appform_notes')}
                        </label>
                        <textarea
                            className="mejilis-form-textarea"
                            placeholder={t('appform_notes_ph')}
                            value={form.applicationNotes}
                            onChange={(e) => updateForm('applicationNotes', e.target.value)}
                            rows={3}
                            id="app-application-notes"
                        />
                    </div>
                </div>

                {/* ── SECTION 2: CONTACT & LOCATION ── */}
                <div className="mejilis-form-section">
                    <h4 className="mejilis-form-section-title"><FiTrendingUp /> {t('appform_contact')}</h4>
                    <div className="mejilis-form-row">
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-phone">
                                {t('appform_phone')} <span className="required">*</span>
                            </label>
                            <input
                                className="mejilis-form-input"
                                type="tel"
                                placeholder="+251911223344"
                                value={form.businessPhone}
                                onChange={(e) => updateForm('businessPhone', e.target.value)}
                                required
                                id="app-phone"
                            />
                        </div>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-email">{t('appform_email')}</label>
                            <input
                                className="mejilis-form-input"
                                type="email"
                                placeholder={t('appform_email_ph')}
                                value={form.businessEmail}
                                onChange={(e) => updateForm('businessEmail', e.target.value)}
                                id="app-email"
                            />
                        </div>
                    </div>

                    <div className="mejilis-form-row">
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-region">{t('appform_region')}</label>
                            <select
                                className="mejilis-form-select"
                                value={form.region}
                                onChange={(e) => updateForm('region', e.target.value)}
                                id="app-region"
                            >
                                <option value="">{t('appform_select_region')}</option>
                                {REGIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-city">{t('appform_city')}</label>
                            <input
                                className="mejilis-form-input"
                                type="text"
                                placeholder="e.g. Addis Ababa"
                                value={form.city}
                                onChange={(e) => updateForm('city', e.target.value)}
                                id="app-city"
                            />
                        </div>
                    </div>

                    <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-subcity">{t('appform_subcity')}</label>
                            <input
                                className="mejilis-form-input"
                                type="text"
                                placeholder="e.g. Bole"
                                value={form.subcity}
                                onChange={(e) => updateForm('subcity', e.target.value)}
                                id="app-subcity"
                            />
                        </div>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-street">{t('appform_street')}</label>
                            <input
                                className="mejilis-form-input"
                                type="text"
                                placeholder="e.g. Churchill Ave"
                                value={form.street}
                                onChange={(e) => updateForm('street', e.target.value)}
                                id="app-street"
                            />
                        </div>
                    </div>
                </div>

                {/* ── SECTION 3: OFFICIAL DOCUMENTS ── */}
                <div className="mejilis-form-section">
                    <h4 className="mejilis-form-section-title"><FiShield /> {t('appform_docs')}</h4>
                    {isResubmit && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                            {t('appform_docs_kept')}
                        </p>
                    )}
                    <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-license">
                                {t('appform_license')} {!isResubmit && <span className="required">*</span>}
                            </label>
                            <label
                                className={`mejilis-upload-input ${licenseDragOver ? 'dragover' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setLicenseDragOver(true); }}
                                onDragLeave={() => setLicenseDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setLicenseDragOver(false);
                                    const f = e.dataTransfer.files?.[0] || null;
                                    if (f && validateImageFile(f)) setLicenseFile(f);
                                }}
                            >
                                <FiFileText size={16} />
                                <span>{licenseFile ? licenseFile.name : t('appform_license_drop')}</span>
                                <small>{t('appform_file_types', { size: MAX_IMAGE_SIZE_MB })}</small>
                                <input
                                    id="app-license"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        if (f && validateImageFile(f)) setLicenseFile(f);
                                    }}
                                    required={docsRequired}
                                />
                            </label>
                            {licenseFile && (
                                <div className="mejilis-file-preview">
                                    <img src={URL.createObjectURL(licenseFile)} alt="Government license preview" />
                                    <button type="button" onClick={() => setLicenseFile(null)}>{t('appform_remove')}</button>
                                </div>
                            )}
                        </div>
                        <div className="mejilis-form-group">
                            <label className="mejilis-form-label" htmlFor="app-national-id">
                                {t('appform_id')} {!isResubmit && <span className="required">*</span>}
                            </label>
                            <label
                                className={`mejilis-upload-input ${nationalIdDragOver ? 'dragover' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setNationalIdDragOver(true); }}
                                onDragLeave={() => setNationalIdDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setNationalIdDragOver(false);
                                    const f = e.dataTransfer.files?.[0] || null;
                                    if (f && validateImageFile(f)) setNationalIdFile(f);
                                }}
                            >
                                <FiUser size={16} />
                                <span>{nationalIdFile ? nationalIdFile.name : t('appform_id_drop')}</span>
                                <small>{t('appform_file_types', { size: MAX_IMAGE_SIZE_MB })}</small>
                                <input
                                    id="app-national-id"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        if (f && validateImageFile(f)) setNationalIdFile(f);
                                    }}
                                    required={docsRequired}
                                />
                            </label>
                            {nationalIdFile && (
                                <div className="mejilis-file-preview">
                                    <img src={URL.createObjectURL(nationalIdFile)} alt="National ID preview" />
                                    <button type="button" onClick={() => setNationalIdFile(null)}>{t('appform_remove')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                        type="submit"
                        className="mejilis-form-submit"
                        disabled={submitting}
                        id="app-submit-btn"
                    >
                        {submitting ? (
                            <><div className="spinner" /> {t('appform_submitting')}</>
                        ) : (
                            <><FiShield size={18} /> {isResubmit ? t('appform_resubmit') : t('appform_submit')}</>
                        )}
                    </button>
                    {onCancel && (
                        <button type="button" className="btn btn-white-outline" onClick={onCancel} disabled={submitting}>
                            {t('cancel')}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default MerchantApplicationForm;
