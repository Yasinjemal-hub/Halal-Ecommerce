import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/common/CartDrawer';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import About from './pages/About';
import MerchantDashboard from './pages/Dashboard/MerchantDashboard';
import AdminDashboard from './pages/Dashboard/AdminDashboard';

// Layout Component — wraps pages with Navbar + Footer
const MainLayout = ({ children }) => (
  <>
    <Navbar />
    <main style={{ minHeight: '60vh' }}>{children}</main>
    <Footer />
    <CartDrawer />
  </>
);

// Auth Layout — no Navbar/Footer
const AuthLayout = ({ children }) => (
  <>{children}</>
);

function App() {
  return (
    <Router>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
          },
          success: {
            iconTheme: { primary: '#0D7C3D', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },
        }}
      />

      <Routes>
        {/* Auth Routes (no Navbar/Footer) */}
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

        {/* Main Routes */}
        <Route path="/" element={<MainLayout><Home /></MainLayout>} />
        <Route path="/shop" element={<MainLayout><Shop /></MainLayout>} />
        <Route path="/product/:id" element={<MainLayout><ProductDetails /></MainLayout>} />
        <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
        <Route path="/checkout" element={<MainLayout><Checkout /></MainLayout>} />
        <Route path="/about" element={<MainLayout><About /></MainLayout>} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<MainLayout><MerchantDashboard /></MainLayout>} />
        <Route path="/admin" element={<MainLayout><AdminDashboard /></MainLayout>} />

        {/* Catch-all 404 */}
        <Route
          path="*"
          element={
            <MainLayout>
              <div style={{ textAlign: 'center', padding: '120px 20px', minHeight: '60vh' }}>
                <h1 style={{ fontSize: '4rem', marginBottom: '16px' }}>404</h1>
                <h2 style={{ marginBottom: '8px' }}>Page Not Found</h2>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '24px' }}>
                  The page you're looking for doesn't exist.
                </p>
                <a href="/" className="btn btn-primary">Go Home</a>
              </div>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
