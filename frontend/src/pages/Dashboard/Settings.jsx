import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiCheckCircle, FiSave } from 'react-icons/fi';
import { getProfile } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import { toast } from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
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
            toast.error('Unable to load profile. Please try again.');
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
            toast.success('Profile update request submitted. Name, email or phone changes require admin approval.');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to submit profile update.');
        } finally {
            setSaving(false);
        }
    };

    const pending = profile?.pendingProfileUpdate;
    const pendingChangeFields = ['firstName', 'lastName', 'email', 'phone'];
    const hasPending =
        pending?.status === 'pending' &&
        pendingChangeFields.some((field) => Boolean(pending[field]));
    const roleLabel = profile?.role === 'admin' ? 'Admin' : profile?.role === 'merchant' ? 'Merchant' : 'Consumer';

    return (
        <div className="settings-page">
            <div className="settings-hero card">
                <div>
                    <span className="badge badge-halal">Account Settings</span>
                    <h1>Manage your profile</h1>
                    <p>
                        Keep your contact details up to date, manage address preferences, and submit changes for admin review.
                        Name, email, and phone changes require approval before they go live.
                    </p>
                </div>
                <div className="settings-hero-actions">
                    <div className="settings-hero-meta">
                        <span className="settings-hero-meta-label">Signed in as</span>
                        <strong>{profile?.email || '—'}</strong>
                        <div className="settings-role-badge">{roleLabel}</div>
                    </div>
                    <Link to={profile?.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-secondary btn-sm">
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            {hasPending && (
                <div className="card settings-pending-card">
                    <div className="settings-card-header">
                        <FiCheckCircle /> Pending Approval
                    </div>
                    <p className="settings-note">
                        Your update request is waiting for approval. Once reviewed by admin, your name, email, or phone changes will be applied.
                    </p>
                    <div className="settings-pending-list">
                        {pending.firstName && <div><strong>First name:</strong> {pending.firstName}</div>}
                        {pending.lastName && <div><strong>Last name:</strong> {pending.lastName}</div>}
                        {pending.email && <div><strong>Email:</strong> {pending.email}</div>}
                        {pending.phone && <div><strong>Phone:</strong> {pending.phone}</div>}
                        {pending.reviewNotes && <div><strong>Admin notes:</strong> {pending.reviewNotes}</div>}
                    </div>
                </div>
            )}

            <div className="settings-grid">
                <div className="card settings-card">
                    <div className="settings-card-header">Profile details</div>
                    {loading ? (
                        <div className="settings-loading">Loading profile…</div>
                    ) : (
                        <form className="settings-form" onSubmit={handleSubmit}>
                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">First Name</label>
                                    <input
                                        className="input"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        type="text"
                                        placeholder="First name"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Last Name</label>
                                    <input
                                        className="input"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        type="text"
                                        placeholder="Last name"
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">Email address</label>
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
                                    <label className="input-label">Phone number</label>
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
                                <label className="input-label">Preferred language</label>
                                <select
                                    className="input"
                                    value={formData.preferredLanguage}
                                    onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                                >
                                    <option value="en">English</option>
                                    <option value="am">Amharic</option>
                                    <option value="om">Oromiffa</option>
                                    <option value="so">Somali</option>
                                </select>
                            </div>

                            <div className="settings-card-subtitle">Address</div>
                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">Street</label>
                                    <div className="input-with-icon">
                                        <FiMapPin className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.addressStreet}
                                            onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                                            type="text"
                                            placeholder="Street address"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Subcity</label>
                                    <input
                                        className="input"
                                        value={formData.addressSubcity}
                                        onChange={(e) => handleInputChange('addressSubcity', e.target.value)}
                                        type="text"
                                        placeholder="Subcity"
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">City</label>
                                    <input
                                        className="input"
                                        value={formData.addressCity}
                                        onChange={(e) => handleInputChange('addressCity', e.target.value)}
                                        type="text"
                                        placeholder="City"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Region</label>
                                    <input
                                        className="input"
                                        value={formData.addressRegion}
                                        onChange={(e) => handleInputChange('addressRegion', e.target.value)}
                                        type="text"
                                        placeholder="Region"
                                    />
                                </div>
                            </div>

                            <div className="settings-grid-cols">
                                <div className="input-group">
                                    <label className="input-label">Postal code</label>
                                    <input
                                        className="input"
                                        value={formData.addressPostalCode}
                                        onChange={(e) => handleInputChange('addressPostalCode', e.target.value)}
                                        type="text"
                                        placeholder="Postal code"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Country</label>
                                    <div className="input-with-icon">
                                        <FiGlobe className="input-icon" />
                                        <input
                                            className="input"
                                            value={formData.addressCountry}
                                            onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                                            type="text"
                                            placeholder="Country"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary settings-save-button" disabled={saving}>
                                <FiSave /> {saving ? 'Saving...' : 'Save changes'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="card settings-card settings-summary-card">
                    <div className="settings-card-header">Quick account summary</div>
                    <div className="settings-summary-list">
                        <div>
                            <strong>Name</strong>
                            <p>{profile?.firstName} {profile?.lastName}</p>
                        </div>
                        <div>
                            <strong>Email</strong>
                            <p>{profile?.email}</p>
                        </div>
                        <div>
                            <strong>Phone</strong>
                            <p>{profile?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <strong>Role</strong>
                            <p>{roleLabel}</p>
                        </div>
                        <div>
                            <strong>Language</strong>
                            <p>{profile?.preferredLanguage || 'en'}</p>
                        </div>
                    </div>
                    <p className="settings-summary-note">
                        Updates to email, phone, and name are staged for admin approval. Other changes apply immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
