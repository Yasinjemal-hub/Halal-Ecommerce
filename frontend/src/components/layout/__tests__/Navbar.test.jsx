import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../redux/slices/authSlice';
import cartReducer from '../../../redux/slices/cartSlice';
import wishlistReducer from '../../../redux/slices/wishlistSlice';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import Navbar from '../Navbar';

const renderNavbar = (authState = { isAuthenticated: false, user: null }) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
    },
    preloadedState: {
      auth: authState,
      cart: { items: [], isCartOpen: false },
      wishlist: { items: [] },
    },
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>
        <LanguageProvider>
          <Navbar />
        </LanguageProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('Navbar Component', () => {
  it('renders the logo', () => {
    renderNavbar();
    expect(screen.getAllByText('Market').length).toBeGreaterThanOrEqual(1);
  });

  it('renders navigation links', () => {
    renderNavbar();
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Shop').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Merchants').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mejilis').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('About').length).toBeGreaterThanOrEqual(1);
  });

  it('shows login and register buttons when not authenticated', () => {
    renderNavbar();
    expect(screen.getAllByText('Login').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Register').length).toBeGreaterThanOrEqual(1);
  });

  it('shows user menu when authenticated', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'consumer' },
    });

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders search form', () => {
    renderNavbar();
    expect(screen.getByPlaceholderText(/Search/)).toBeInTheDocument();
  });

  it('renders category links', () => {
    renderNavbar();
    expect(screen.getAllByText('Meat & Poultry').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dairy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ethiopian Spices').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bakery').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ethiopian Honey').length).toBeGreaterThanOrEqual(1);
  });

  it('renders cart button when user is not merchant/admin', () => {
    renderNavbar();
    const cartBtn = screen.getByLabelText('Cart');
    expect(cartBtn).toBeInTheDocument();
  });

  it('does not render cart button for merchants', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'M', role: 'merchant' },
    });
    expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
  });

  it('does not render cart button for admins', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'A', role: 'admin' },
    });
    expect(screen.queryByLabelText('Cart')).not.toBeInTheDocument();
  });

  it('shows a My Application link to merchants in the user menu', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'M', role: 'merchant' },
    });
    fireEvent.click(screen.getByText('M'));
    const links = screen.getAllByText('My Application');
    // Desktop dropdown + mobile menu both link to the status page.
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => {
      expect(link.closest('a')).toHaveAttribute('href', '/merchant/register');
    });
  });

  it('does not show My Application to consumers', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'C', role: 'consumer' },
    });
    fireEvent.click(screen.getByText('C'));
    expect(screen.queryByText('My Application')).not.toBeInTheDocument();
  });

  it('shows My Application in the mobile menu for merchants', () => {
    renderNavbar({
      isAuthenticated: true,
      user: { firstName: 'M', role: 'merchant' },
    });
    // User dropdown is closed, so this resolves to the mobile menu link.
    const link = screen.getByText('My Application');
    expect(link.closest('a')).toHaveAttribute('href', '/merchant/register');
  });
});
