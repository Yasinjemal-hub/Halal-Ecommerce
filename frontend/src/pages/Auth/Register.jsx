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
  const { isLoading, error, isAuthenticated } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const { confirmPassword, ...data } = formData;
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
            <h2>Join Our Community</h2>
            <p
              className="text-ethiopic"
              style={{ fontSize: "1.5rem", marginBottom: "8px" }}
            >
              ይመዝገቡ!
            </p>
            <p>
              Create an account to shop halal-certified products, track orders,
              and connect with verified merchants across Ethiopia.
            </p>
            <div className="auth-left-features">
              <div className="auth-feature">Free Consumer Account</div>
              <div className="auth-feature">
                Merchant Registration Available
              </div>
              <div className="auth-feature">Secure & Private</div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1 className="heading-section">Create Account</h1>
            <p className="text-body">Fill in your details to get started</p>
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
                Consumer
              </button>
              <button
                type="button"
                className={`role-option ${formData.role === "merchant" ? "role-active" : ""}`}
                onClick={() => setFormData({ ...formData, role: "merchant" })}
              >
                <span>
                  <FiGrid />
                </span>{" "}
                Merchant
              </button>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="firstName">
                  First Name
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
                    placeholder="First name"
                    required
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="lastName">
                  Last Name
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
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-email">
                Email Address
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
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="phone">
                Phone Number
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
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label" htmlFor="reg-password">
                  Password
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
                    placeholder="Min 8 characters"
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
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
                  Confirm Password
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
                    placeholder="Confirm password"
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
                  Create Account <FiArrowRight />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
