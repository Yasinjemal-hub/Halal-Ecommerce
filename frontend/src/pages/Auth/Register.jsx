import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiPhone,
  FiArrowRight,
  FiShoppingBag,
  FiGrid,
  FiShield,
} from "react-icons/fi";
import { register, clearError } from "../../redux/slices/authSlice";
import { useLanguage } from "../../i18n/LanguageContext";
import { mapBackendMessage } from "../../utils/backendErrors";
import toast from "react-hot-toast";
import "./Auth.css";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "consumer",
  });
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isLoading, error, isAuthenticated } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(mapBackendMessage(t, error) || t("err_registration_failed"));
      dispatch(clearError());
    }
  }, [error, dispatch, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t("auth_passwords_no_match"));
      return;
    }
    if (formData.password.length < 8) {
      toast.error(t("auth_password_min"));
      return;
    }
    const { confirmPassword, ...data } = formData;
    if (!data.phone || !String(data.phone).trim()) {
      delete data.phone;
    }
    dispatch(register(data));
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-pattern pattern-overlay" />
          <div className="auth-left-inner">
            <Link to="/" className="auth-logo">
              <div className="auth-logo-icon">
                <FiShield />
              </div>
              <span>
                Halal<span className="logo-accent">Market</span>
              </span>
            </Link>
            <h2>{t("auth_join")}</h2>
            <p
              className="text-ethiopic"
              style={{ fontSize: "1.5rem", marginBottom: "8px" }}
            >
              {t("auth_greeting_register")}
            </p>
            <p>
              {t("auth_community_desc")}
            </p>
            <div className="auth-left-features">
              <div className="auth-feature">{t("auth_register_feature_1")}</div>
              <div className="auth-feature">
                {t("auth_register_feature_2")}
              </div>
              <div className="auth-feature">{t("auth_register_feature_3")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1 className="heading-section">{t("auth_create_account")}</h1>
            <p className="text-body">{t("auth_register_desc")}</p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            id="register-form"
          >
            {/* Role Selector */}
            <div className="role-selector">
              <button
                type="button"
                className={`role-option ${formData.role === "consumer" ? "role-active" : ""}`}
                onClick={() => setFormData({ ...formData, role: "consumer" })}
              >
                <span>
                  <FiShoppingBag />
                </span>{" "}
                {t("auth_consumer")}
              </button>
              <button
                type="button"
                className={`role-option ${formData.role === "merchant" ? "role-active" : ""}`}
                onClick={() => setFormData({ ...formData, role: "merchant" })}
              >
                <span>
                  <FiGrid />
                </span>{" "}
                {t("auth_merchant")}
              </button>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="firstName">
                  {t("auth_first_name")}
                </label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input"
                    placeholder={t("auth_first_name_placeholder")}
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="lastName">
                  {t("auth_last_name")}
                </label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                    placeholder={t("auth_last_name_placeholder")}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-email">
                {t("auth_email")}
              </label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  id="reg-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder={t("auth_email_placeholder")}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="phone">
                {t("auth_phone")}
              </label>
              <div className="input-with-icon">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder={t("auth_phone_placeholder")}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="reg-password">
                  {t("auth_password")}
                </label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="reg-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder={t("auth_password_min_placeholder")}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={t("a11y_toggle_password")}
                  >
                    {showPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="confirmPassword">
                  {t("auth_confirm_password")}
                </label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input"
                    placeholder={t("auth_confirm_password_placeholder")}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={isLoading}
              id="register-submit"
            >
              {isLoading ? (
                <span className="spinner spinner-sm" />
              ) : (
                <>
                  {t("auth_submit_register")} <FiArrowRight />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {t("auth_has_account")} <Link to="/login">{t("auth_sign_in_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
