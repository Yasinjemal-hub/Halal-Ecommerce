import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Merchants from '../Merchants';
import merchantService from '../../services/merchantService';
import { WithProviders } from '../../test-utils';

jest.mock('../../services/merchantService');

const issuedCert = {
  certificateNumber: 'HC-2026-ABC123',
  issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
  certificateType: 'halal_establishment',
  status: 'approved',
  issueDate: '2024-03-01T00:00:00.000Z',
  expiryDate: '2027-03-01T00:00:00.000Z',
  scope: 'Retail grocery',
};

const certifiedMerchant = {
  _id: 'api-1',
  businessName: 'Real API Grocery',
  businessNameAmharic: 'ሪል ሱቅ',
  description: 'A real store from the database.',
  businessType: 'grocery',
  businessPhone: '+251911000001',
  businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa' },
  verificationStatus: 'approved',
  ratingsAverage: 4.5,
  ratingsCount: 10,
  totalProducts: 3,
  totalOrders: 42,
  halalCertification: issuedCert,
};

const uncertifiedMerchant = {
  _id: 'api-2',
  businessName: 'Uncertified Bakery',
  description: 'Approved but no certificate yet.',
  businessType: 'bakery',
  businessAddress: { city: 'Harar', region: 'Harari' },
  verificationStatus: 'approved',
  ratingsAverage: 0,
  ratingsCount: 0,
  totalProducts: 0,
  totalOrders: 0,
  halalCertification: null,
};

const renderPage = () =>
  render(
    <WithProviders>
      <MemoryRouter>
        <Merchants />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Merchants page (API-driven, no hardcoded demo list)', () => {
  it('renders merchants from the API and never the hardcoded demo entries', async () => {
    merchantService.getAll.mockResolvedValue({
      merchants: [certifiedMerchant],
      total: 1,
      totalPages: 1,
      currentPage: 1,
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Real API Grocery')).toBeInTheDocument());
    expect(merchantService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ verified: 'true', page: 1 })
    );
    // Hardcoded fallback entries must never appear
    expect(screen.queryByText('Addis Halal Meats')).not.toBeInTheDocument();
    expect(screen.queryByText('Harar Spice Market')).not.toBeInTheDocument();
    expect(screen.queryByText('Dire Dawa Bakery')).not.toBeInTheDocument();
  });

  it('shows the verified badge only with a valid issued certificate', async () => {
    merchantService.getAll.mockResolvedValue({
      merchants: [certifiedMerchant, uncertifiedMerchant],
      total: 2,
      totalPages: 1,
      currentPage: 1,
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Uncertified Bakery')).toBeInTheDocument());
    // Exactly one badge (en label for merchants_verified) for the certified store
    expect(screen.getAllByText('Majlis Verified')).toHaveLength(1);
  });

  it('shows an empty state without fake merchants when the database returns none', async () => {
    merchantService.getAll.mockResolvedValue({ merchants: [], total: 0, totalPages: 0, currentPage: 1 });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('merchants-empty-database')).toBeInTheDocument());
    expect(screen.queryByText('Addis Halal Meats')).not.toBeInTheDocument();
  });

  it('shows an error with a working retry action on API failure (no fake merchants)', async () => {
    merchantService.getAll
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({ merchants: [certifiedMerchant], total: 1, totalPages: 1, currentPage: 1 });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('merchants-error')).toBeInTheDocument());
    expect(screen.queryByText('Addis Halal Meats')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('retry-merchants'));
    await waitFor(() => expect(screen.getByText('Real API Grocery')).toBeInTheDocument());
    expect(merchantService.getAll).toHaveBeenCalledTimes(2);
  });

  it('loads later pages via Load more instead of stopping at the first page', async () => {
    const page2Merchant = { ...uncertifiedMerchant, _id: 'api-3', businessName: 'Page Two Store' };
    merchantService.getAll
      .mockResolvedValueOnce({ merchants: [certifiedMerchant], total: 2, totalPages: 2, currentPage: 1 })
      .mockResolvedValueOnce({ merchants: [page2Merchant], total: 2, totalPages: 2, currentPage: 2 });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('load-more-merchants')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('load-more-merchants'));

    await waitFor(() => expect(screen.getByText('Page Two Store')).toBeInTheDocument());
    // First-page results stay visible (appended, not replaced)
    expect(screen.getByText('Real API Grocery')).toBeInTheDocument();
    expect(merchantService.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });
});
