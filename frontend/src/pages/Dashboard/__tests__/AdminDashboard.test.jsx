import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../redux/slices/authSlice';
import adminService from '../../../services/adminService';
import { LanguageProvider } from '../../../i18n/LanguageContext';
import AdminDashboard from '../AdminDashboard';

jest.mock('../../../services/adminService');

const ADMIN_USER = { _id: 'admin-1', firstName: 'Hana', role: 'admin' };

const REAL_STATS = {
  stats: {
    totalUsers: 42,
    totalMerchants: 6,
    approvedMerchants: 3,
    activeMerchants: 2,
    pendingMerchants: 2,
    underReviewMerchants: 1,
    needsReviewMerchants: 3,
    totalProducts: 25,
    totalOrders: 11,
    totalRevenue: 98750,
    pendingCertifications: 1,
    issuedCertifications: 2,
  },
};

const REAL_QUEUE = {
  merchants: [
    {
      _id: 'merchant-9',
      businessName: 'Gondar Teff Collective',
      businessType: 'wholesale',
      verificationStatus: 'pending',
      createdAt: '2024-03-01T00:00:00.000Z',
    },
    {
      _id: 'merchant-10',
      businessName: 'Dire Dawa Butchery',
      businessType: 'butcher',
      verificationStatus: 'under_review',
      createdAt: '2024-03-02T00:00:00.000Z',
    },
  ],
  total: 2,
  totalPages: 1,
  currentPage: 1,
};

// Former hard-coded dashboard content that must never render.
const FORBIDDEN_SAMPLES = [
  'Harar Spice Market',
  'Addis Halal Foods',
  'Oromia Teff Farm',
  '12,450',
  '8,920',
  '+120 this month',
  '+23 this month',
  '+340 this week',
];

const renderDashboard = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user: ADMIN_USER, token: 't', isAuthenticated: true, isLoading: false, error: null, message: null },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <LanguageProvider>
          <AdminDashboard />
        </LanguageProvider>
      </MemoryRouter>
    </Provider>
  );
};

const expectNoSampleData = () => {
  FORBIDDEN_SAMPLES.forEach((text) => {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminDashboard — real data only', () => {
  it('shows loading states while stats and queue load', () => {
    adminService.getDashboard.mockReturnValue(new Promise(() => {}));
    adminService.getAllMerchants.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByTestId('admin-stats-loading')).toBeInTheDocument();
    expect(screen.getByTestId('admin-queue-loading')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('renders live statistics with clear definitions and no trend claims', async () => {
    adminService.getDashboard.mockResolvedValue(REAL_STATS);
    adminService.getAllMerchants.mockResolvedValue({ merchants: [], total: 0 });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-stats')).toBeInTheDocument());
    expect(screen.getByText('42')).toBeInTheDocument(); // total users
    expect(screen.getByText('98,750')).toBeInTheDocument(); // captured revenue
    expect(screen.getByText('Approved + active account')).toBeInTheDocument();
    expect(screen.getByText('Captured payments only')).toBeInTheDocument();
    expect(screen.getByText('Officially approved')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('renders each queued application with real details and deep review links', async () => {
    adminService.getDashboard.mockResolvedValue(REAL_STATS);
    adminService.getAllMerchants.mockResolvedValue(REAL_QUEUE);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-queue')).toBeInTheDocument());
    expect(
      adminService.getAllMerchants
    ).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: 'pending,under_review' })
    );
    expect(screen.getByText('Gondar Teff Collective')).toBeInTheDocument();
    expect(screen.getByText('Dire Dawa Butchery')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();

    const reviewLinks = screen.getAllByText('Review');
    expect(reviewLinks).toHaveLength(2);
    expect(reviewLinks[0].closest('a')).toHaveAttribute('href', '/admin/merchants/merchant-9');
    expect(reviewLinks[1].closest('a')).toHaveAttribute('href', '/admin/merchants/merchant-10');

    // No direct decision buttons on summary cards.
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expectNoSampleData();
  });

  it('shows an honest empty state when nothing waits for review', async () => {
    adminService.getDashboard.mockResolvedValue(REAL_STATS);
    adminService.getAllMerchants.mockResolvedValue({ merchants: [], total: 0 });

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-queue-empty')).toBeInTheDocument());
    expect(screen.getByText('No applications waiting for review.')).toBeInTheDocument();
    expectNoSampleData();
  });

  it('handles stats failure with retry without breaking the queue', async () => {
    adminService.getDashboard.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(REAL_STATS);
    adminService.getAllMerchants.mockResolvedValue(REAL_QUEUE);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-stats-error')).toBeInTheDocument());
    // Queue slice is unaffected.
    expect(await screen.findByTestId('admin-queue')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('retry-admin-stats'));
    await waitFor(() => expect(screen.getByTestId('admin-stats')).toBeInTheDocument());
    expect(adminService.getDashboard).toHaveBeenCalledTimes(2);
    expect(adminService.getAllMerchants).toHaveBeenCalledTimes(1);
    expectNoSampleData();
  });

  it('handles queue failure with retry without breaking stats', async () => {
    adminService.getDashboard.mockResolvedValue(REAL_STATS);
    adminService.getAllMerchants
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(REAL_QUEUE);

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('admin-queue-error')).toBeInTheDocument());
    expect(await screen.findByTestId('admin-stats')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('retry-admin-queue'));
    await waitFor(() => expect(screen.getByTestId('admin-queue')).toBeInTheDocument());
    expect(adminService.getAllMerchants).toHaveBeenCalledTimes(2);
    expect(adminService.getDashboard).toHaveBeenCalledTimes(1);
    expectNoSampleData();
  });

  it('offers View all navigation to the workspace', async () => {
    adminService.getDashboard.mockResolvedValue(REAL_STATS);
    adminService.getAllMerchants.mockResolvedValue(REAL_QUEUE);

    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('admin-queue')).toBeInTheDocument());

    expect(screen.getByText('View All').closest('a')).toHaveAttribute('href', '/admin/merchants');
  });
});
