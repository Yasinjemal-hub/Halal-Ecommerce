import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../../../redux/slices/cartSlice';
import wishlistReducer from '../../../redux/slices/wishlistSlice';
import authReducer from '../../../redux/slices/authSlice';
import ProductCard from '../ProductCard';
import { LanguageProvider } from '../../../i18n/LanguageContext';

const mockProduct = {
  _id: '123',
  name: 'Test Product',
  price: 100,
  discountPrice: 80,
  images: [{ url: 'http://example.com/img.jpg', alt: 'Test' }],
  category: 'meat',
  ratingsAverage: 4.5,
  ratingsCount: 10,
  halalCertified: true,
  isInStock: true,
  merchant: { businessName: 'Test Merchant' },
};

const renderProductCard = (product = mockProduct, authState = { isAuthenticated: false, user: null }) => {
  const store = configureStore({
    reducer: {
      cart: cartReducer,
      wishlist: wishlistReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: authState,
      cart: { items: [], isCartOpen: false },
      wishlist: { items: [] },
    },
  });

  return render(
    <Provider store={store}>
      <LanguageProvider>
        <BrowserRouter>
          <ProductCard product={product} />
        </BrowserRouter>
      </LanguageProvider>
    </Provider>
  );
};

describe('ProductCard Component', () => {
  it('renders product name', () => {
    renderProductCard();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders merchant name', () => {
    renderProductCard();
    expect(screen.getByText('Test Merchant')).toBeInTheDocument();
  });

  it('renders price correctly', () => {
    renderProductCard();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('renders original price when discount exists', () => {
    renderProductCard();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('renders rating', () => {
    renderProductCard();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('shows out-of-stock state', () => {
    renderProductCard({ ...mockProduct, isInStock: false });
    const addBtn = screen.getByTitle('Out of Stock');
    expect(addBtn).toBeDisabled();
  });

  it('links to product detail page', () => {
    renderProductCard();
    const links = screen.getAllByRole('link');
    const productLink = links.find(l => l.getAttribute('href') === '/product/123');
    expect(productLink).toBeInTheDocument();
  });

  it('renders loading=lazy on images', () => {
    renderProductCard();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('shows save badge when discount exists', () => {
    renderProductCard();
    expect(screen.getByText(/Save/)).toBeInTheDocument();
  });

  it('does not show add to cart for merchant users', () => {
    renderProductCard(mockProduct, {
      isAuthenticated: true,
      user: { role: 'merchant', _id: 'merchant1' },
    });
    const addBtn = screen.getByTitle('Merchants cannot add to cart');
    expect(addBtn).toBeDisabled();
  });

  it('shows the Halal Verified badge for approved + certified stores', () => {
    renderProductCard({
      ...mockProduct,
      merchant: {
        businessName: 'Certified Store',
        verificationStatus: 'approved',
        halalCertification: { status: 'approved', certificateNumber: 'HC-2026-X1', expiryDate: '2027-01-01T00:00:00.000Z' },
      },
    });
    expect(screen.getByText('Halal Verified')).toBeInTheDocument();
  });

  it('hides the Halal Verified badge for pending, rejected, or suspended stores', () => {
    for (const verificationStatus of ['pending', 'rejected', 'suspended']) {
      const { unmount } = render(
        <Provider store={configureStore({ reducer: { cart: cartReducer, wishlist: wishlistReducer, auth: authReducer }, preloadedState: { auth: { isAuthenticated: false, user: null }, cart: { items: [], isCartOpen: false }, wishlist: { items: [] } } })}>
          <LanguageProvider>
            <BrowserRouter>
              <ProductCard product={{ ...mockProduct, merchant: { businessName: 'S', verificationStatus, halalCertification: { status: 'approved', certificateNumber: 'HC-2026-X1', expiryDate: '2027-01-01T00:00:00.000Z' } } }} />
            </BrowserRouter>
          </LanguageProvider>
        </Provider>
      );
      expect(screen.queryByText('Halal Verified')).not.toBeInTheDocument();
      unmount();
    }
  });
});
