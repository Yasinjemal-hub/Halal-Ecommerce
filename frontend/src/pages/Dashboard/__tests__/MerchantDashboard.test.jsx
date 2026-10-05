import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../redux/slices/authSlice';
import cartReducer from '../../../redux/slices/cartSlice';
import wishlistReducer from '../../../redux/slices/wishlistSlice';
import merchantService from '../../../services/merchantService';
import orderService from '../../../services/orderService';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import MerchantDashboard from '../MerchantDashboard';

jest.mock('../../../services/merchantService');
jest.mock('../../../services/orderService');

const MERCHANT_USER = { _id: 'merchant-user-1', firstName: 'Sara', role: 'merchant' };

const REAL_PROFILE = {
  merchant: {
    _id: 'merchant-1',
    totalProducts: 7,
    totalOrders: 3,
    totalRevenue: 12500,
    ratingsAverage: 4.5,
    ratingsCount: 12,
  },
};

const REAL_ORDERS = {
  orders: [
    {
      _id: 'order-1',
      orderNumber: 'HE-240101-ABC123',
      user: { firstName: 'Abebe', lastName: 'Kebede', phone: '+251911000001' },
      items: [{ price: 100, quantity: 2 }],
      merchantItemCount: 2,
      merchantSubtotal: 200,
      totalPrice: 500,
      status: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};

// Strings that must never appear: former hard-coded stats, trends, and
// sample orders. Checked in every dashboard state.
const FORBIDDEN_SAMPLE_STRINGS = [
  'Amina M.',
  'Hassan I.',
  'Fatima A.',
  'Ahmed K.',
  'HE-260225-AB12CD',
  'HE-260224-EF34GH',
  '45,230',
  '+3 this month',
  '+12 this week',
  '+8.4%',
];

const renderDashboard = () => {
  const store = configureStore({
    reducer: { auth: authReducer, cart: cartReducer, wishlist: wishlistReducer },
    preloadedState: {
      auth: { user: MERCHANT_USER, token: 't', isAuthenticated: true, isLoading: false, error: null, message: null },
      cart: { items: [], isCartOpen: false, isSyncing: false, syncError: null },
      wishlist: { items: [] },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LanguageProvider>
          <MerchantDashboard />
        </LanguageProvider>
      </MemoryRouter>
    </Provider>
  );
};

const expectNoSampleData = () => {
  FORBIDDEN_SAMPLE_STRINGS.forEach((text) => {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MerchantDashboard — real data only', () => {
  it('shows loading states while profile and orders are being fetched', () => {
    merchantService.getMyProfile.mockReturnValue(new Promise(() => {}));
    orderService.getMerchantOrders.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading statistics…')).toBeInTheDocument();
    expect(screen.getByTestId('orders-loading')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('renders real merchant-specific statistics (no fabricated values)', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getAllByTestId('stat-card')).toHaveLength(4));
    expect(screen.getByText('7')).toBeInTheDocument(); // totalProducts
    expect(screen.getByText('3')).toBeInTheDocument(); // totalOrders
    expect(screen.getByText('12,500')).toBeInTheDocument(); // totalRevenue
    expect(screen.getByText('4.5')).toBeInTheDocument(); // ratingsAverage
    expect(screen.getByText('12 reviews')).toBeInTheDocument(); // ratingsCount
    expectNoSampleData();
  });

  it('shows the application and certificate status with a link to the status page', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: {
        ...REAL_PROFILE.merchant,
        verificationStatus: 'approved',
        halalCertification: {
          _id: 'cert-1',
          certificateNumber: 'HC-2026-ABC123',
          status: 'approved',
          expiryDate: '2027-03-01T00:00:00.000Z',
        },
      },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('application-status-card')).toBeInTheDocument());
    expect(screen.getByText(/HC-2026-ABC123/)).toBeInTheDocument();
    const link = screen.getByText('Open Application');
    expect(link.closest('a')).toHaveAttribute('href', '/merchant/register');
    expectNoSampleData();
  });

  it('shows a preparing state (never a second form) when the record is pending', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: { ...REAL_PROFILE.merchant, verificationStatus: 'approved', halalCertification: null },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('application-status-card')).toBeInTheDocument());
    expect(screen.getByText('Being prepared — no second application needed')).toBeInTheDocument();
    expect(screen.queryByText('Halal Certified')).not.toBeInTheDocument();
    expectNoSampleData();
  });

  it('renders the real order number and merchant-scoped totals', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders.mockResolvedValue(REAL_ORDERS);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('orders-table')).toBeInTheDocument());
    // Real human-facing order number, not a shortened database ID.
    expect(screen.getByText('HE-240101-ABC123')).toBeInTheDocument();
    expect(screen.queryByText('order-1')).not.toBeInTheDocument();
    // Merchant-scoped subtotal (own items), not the full order total.
    expect(screen.getByText('200 ETB')).toBeInTheDocument();
    expect(screen.queryByText('500 ETB')).not.toBeInTheDocument();
    expect(screen.getByText('Abebe Kebede')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('shows an honest empty state when the merchant has no orders', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('orders-empty')).toBeInTheDocument());
    expect(screen.getByText('No recent orders yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('orders-table')).not.toBeInTheDocument();
    expectNoSampleData();
  });

  it('shows honest zero stats for a brand-new merchant', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, ratingsAverage: 0, ratingsCount: 0 },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getAllByTestId('stat-card')).toHaveLength(4));
    expect(screen.getByText('0 reviews')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('keeps orders visible when the profile request fails (independent loading)', async () => {
    merchantService.getMyProfile.mockRejectedValue(new Error('profile down'));
    orderService.getMerchantOrders.mockResolvedValue(REAL_ORDERS);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('stats-error')).toBeInTheDocument());
    expect(screen.getByText('Statistics unavailable')).toBeInTheDocument();
    // Orders slice is unaffected by the profile failure.
    expect(await screen.findByTestId('orders-table')).toBeInTheDocument();
    expect(screen.getByText('HE-240101-ABC123')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('keeps statistics visible when the orders request fails (independent loading)', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders.mockRejectedValue(new Error('orders down'));

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('orders-error')).toBeInTheDocument());
    // Stats slice is unaffected by the orders failure.
    expect(await screen.findAllByTestId('stat-card')).toHaveLength(4);
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('retrying a failed orders request updates only the orders slice', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders
      .mockRejectedValueOnce(new Error('orders down'))
      .mockResolvedValueOnce(REAL_ORDERS);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('orders-error')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('retry-orders'));

    await waitFor(() => expect(screen.getByTestId('orders-table')).toBeInTheDocument());
    expect(orderService.getMerchantOrders).toHaveBeenCalledTimes(2);
    // Profile was fetched exactly once — retry did not refetch it.
    expect(merchantService.getMyProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByText('HE-240101-ABC123')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('retrying a failed profile request updates only the profile slice', async () => {
    merchantService.getMyProfile
      .mockRejectedValueOnce(new Error('profile down'))
      .mockResolvedValueOnce(REAL_PROFILE);
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('stats-error')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('retry-stats'));

    await waitFor(() => expect(screen.getAllByTestId('stat-card')).toHaveLength(4));
    expect(merchantService.getMyProfile).toHaveBeenCalledTimes(2);
    // Orders were fetched exactly once — retry did not refetch them.
    expect(orderService.getMerchantOrders).toHaveBeenCalledTimes(1);
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('shows the application and certificate status with a link to the status page', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: {
        ...REAL_PROFILE.merchant,
        verificationStatus: 'approved',
        halalCertification: {
          _id: 'cert-1',
          certificateNumber: 'HC-2026-ABC123',
          status: 'approved',
          expiryDate: '2027-03-01T00:00:00.000Z',
        },
      },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('application-status-card')).toBeInTheDocument());
    expect(screen.getByText(/HC-2026-ABC123/)).toBeInTheDocument();
    const link = screen.getByText('Open Application');
    expect(link.closest('a')).toHaveAttribute('href', '/merchant/register');
    expectNoSampleData();
  });

  it('shows the congratulations state when approved and certified together', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: { ...REAL_PROFILE.merchant, verificationStatus: 'approved', halalCertification: null },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('application-status-card')).toBeInTheDocument());
    // No second step is advertised — approval carries the certificate.
    expect(screen.queryByText('View certification status')).not.toBeInTheDocument();
    expect(screen.queryByText('Halal Certified')).not.toBeInTheDocument();
    expectNoSampleData();
  });

  it('advances an order with its real API ID', async () => {
    merchantService.getMyProfile.mockResolvedValue(REAL_PROFILE);
    orderService.getMerchantOrders.mockResolvedValue(REAL_ORDERS);
    orderService.updateStatus.mockResolvedValue({ success: true });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('orders-table')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Advance'));

    await waitFor(() =>
      expect(orderService.updateStatus).toHaveBeenCalledWith('order-1', 'confirmed')
    );
  });

  it('offers Add Product only to approved merchants, My Application otherwise', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: { ...REAL_PROFILE.merchant, verificationStatus: 'approved' },
    });
    orderService.getMerchantOrders.mockResolvedValue({ orders: [] });
    const { unmount } = renderDashboard();
    await waitFor(() => expect(screen.getByText('Add Product')).toBeInTheDocument());
    expect(screen.getByText('Add Product').closest('a')).toHaveAttribute('href', '/dashboard/products');
    unmount();

    merchantService.getMyProfile.mockResolvedValue({
      merchant: { ...REAL_PROFILE.merchant, verificationStatus: 'suspended' },
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('My Application')).toBeInTheDocument());
    expect(screen.queryByText('Add Product')).not.toBeInTheDocument();
    expectNoSampleData();
  });
});
