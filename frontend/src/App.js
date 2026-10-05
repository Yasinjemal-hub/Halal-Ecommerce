import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layout (needed on first paint — kept eager)
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import CartDrawer from "./components/common/CartDrawer";
import Loader from "./components/common/Loader";
import RequireAuth from "./components/common/RequireAuth";
import { useLanguage } from "./i18n/LanguageContext";

// Pages — loaded on demand so the initial bundle only contains the
// layout + the first route. Each lazily-loaded page becomes its own chunk.
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const Merchants = lazy(() => import("./pages/Merchants"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const MerchantDashboard = lazy(() => import("./pages/Dashboard/MerchantDashboard"));
const AdminDashboard = lazy(() => import("./pages/Dashboard/AdminDashboard"));
const AdminConsumers = lazy(() => import("./pages/Dashboard/AdminConsumers"));
const AdminMerchants = lazy(() => import("./pages/Dashboard/AdminMerchants"));
const AdminCertifications = lazy(() => import("./pages/Dashboard/AdminCertifications"));
const AdminProfileApprovals = lazy(() => import("./pages/Dashboard/AdminProfileApprovals"));
const ProductManager = lazy(() => import("./pages/Dashboard/ProductManager"));
const Settings = lazy(() => import("./pages/Dashboard/Settings"));
const Mejilis = lazy(() => import("./pages/Mejilis"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const MerchantShop = lazy(() => import("./pages/MerchantShop"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const MerchantRegister = lazy(() => import("./pages/MerchantRegister"));

// Layout Component — wraps pages with Navbar + Footer
const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <main style={{ minHeight: "60vh" }}>
      <Suspense fallback={<Loader size="page" text="Loading page..." />}>
        {children}
      </Suspense>
    </main>
    <Footer />
    <CartDrawer />
  </>
);

// Auth Layout — no Navbar/Footer
const AuthLayout = ({ children }) => (
  <Suspense fallback={<Loader size="page" text="Loading page..." />}>
    {children}
  </Suspense>
);

// Localized 404 page (numeric code is universal; text is translated)
const NotFound = () => {
  const { t } = useLanguage();
  return (
    <div
      style={{
        textAlign: "center",
        padding: "120px 20px",
        minHeight: "60vh",
      }}
    >
      <h1 style={{ fontSize: "4rem", marginBottom: "16px" }}>404</h1>
      <h2 style={{ marginBottom: "8px" }}>{t('not_found_title')}</h2>
      <p
        style={{
          color: "var(--text-tertiary)",
          marginBottom: "24px",
        }}
      >
        {t('not_found_desc')}
      </p>
      <a href="/" className="btn btn-primary">
        {t('not_found_home')}
      </a>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            fontFamily: "var(--font-body)",
            fontSize: "0.9375rem",
          },
          success: {
            iconTheme: { primary: "#0D7C3D", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#dc2626", secondary: "#fff" },
          },
        }}
      />

      <Routes>
        {/* Auth Routes (no Navbar/Footer) */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthLayout>
              <ForgotPassword />
            </AuthLayout>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <AuthLayout>
              <ResetPassword />
            </AuthLayout>
          }
        />

        {/* Main Routes */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Home />
            </MainLayout>
          }
        />
        <Route
          path="/shop"
          element={
            <MainLayout>
              <Shop />
            </MainLayout>
          }
        />
        <Route
          path="/merchants"
          element={
            <MainLayout>
              <Merchants />
            </MainLayout>
          }
        />
        <Route
          path="/product/:id"
          element={
            <MainLayout>
              <ProductDetails />
            </MainLayout>
          }
        />
        <Route
          path="/merchant/:id"
          element={
            <MainLayout>
              <MerchantShop />
            </MainLayout>
          }
        />
        <Route
          path="/cart"
          element={
            <MainLayout>
              <Cart />
            </MainLayout>
          }
        />
        <Route
          path="/checkout"
          element={
            <MainLayout>
              <Checkout />
            </MainLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <MainLayout>
              <RequireAuth>
              <Orders />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <MainLayout>
              <RequireAuth>
                <OrderDetails />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/wishlist"
          element={
            <MainLayout>
              <RequireAuth>
              <Wishlist />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/merchant/register"
          element={
            <MainLayout>
              <RequireAuth>
              <MerchantRegister />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/about"
          element={
            <MainLayout>
              <About />
            </MainLayout>
          }
        />
        <Route
          path="/mejilis"
          element={
            <MainLayout>
              <Mejilis />
            </MainLayout>
          }
        />
        <Route
          path="/verify-certificate/:certificateNumber"
          element={
            <MainLayout>
              <VerifyCertificate />
            </MainLayout>
          }
        />

        {/* Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["merchant", "consumer"]}>
              <MerchantDashboard />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["merchant", "consumer"]}>
                <Settings />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/dashboard/products"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["merchant"]}>
              <ProductManager />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/dashboard/orders"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["merchant"]}>
                <MerchantDashboard />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminDashboard />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin/consumers"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminConsumers />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin/merchants"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminMerchants />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin/merchants/:id"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminMerchants />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin/certifications"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminCertifications />
              </RequireAuth>
            </MainLayout>
          }
        />
        <Route
          path="/admin/profile-approvals"
          element={
            <MainLayout>
              <RequireAuth allowedRoles={["admin", "superadmin"]}>
              <AdminProfileApprovals />
              </RequireAuth>
            </MainLayout>
          }
        />

        {/* Catch-all 404 */}
        <Route
          path="*"
          element={
            <MainLayout>
              <NotFound />
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
