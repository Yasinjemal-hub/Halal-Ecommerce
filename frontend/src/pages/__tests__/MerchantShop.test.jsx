import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MerchantShop from '../MerchantShop';
import merchantService from '../../services/merchantService';
import { WithProviders } from '../../test-utils';

jest.mock('../../services/merchantService');

const baseMerchant = {
  _id: 'shop-1',
  businessName: 'Sunrise Grocery',
  description: 'A test shop.',
  businessType: 'grocery',
  businessPhone: '+251911223344',
  businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa' },
  verificationStatus: 'approved',
  ratingsAverage: 4.5,
  ratingsCount: 10,
  operatingHours: { weekdays: '8-8', saturday: '8-6', sunday: 'Closed' },
};

const issuedCert = {
  certificateNumber: 'HC-2026-ABC123',
  issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
  certificateType: 'halal_establishment',
  status: 'approved',
  issueDate: '2024-03-01T00:00:00.000Z',
  expiryDate: '2027-03-01T00:00:00.000Z',
  scope: 'Retail grocery',
};

const renderShop = () =>
  render(
    <WithProviders>
      <MemoryRouter initialEntries={['/shop/shop-1']}>
        <Routes>
          <Route path="/shop/:id" element={<MerchantShop />} />
        </Routes>
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
});

describe('MerchantShop halal verification display (one-approval rule)', () => {
  it('shows the Halal Verified badge and card only with an issued certificate', async () => {
    merchantService.getById.mockResolvedValue({ merchant: { ...baseMerchant, halalCertification: issuedCert } });
    merchantService.getMerchantProducts.mockResolvedValue({ products: [] });
    renderShop();

    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    expect(screen.getAllByText('Halal Verified').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HC-2026-ABC123/)).toBeInTheDocument();
    expect(screen.getByText(/Verify certificate/)).toBeInTheDocument();
  });

  it('shows no Halal Verified claims for approved businesses without a certificate', async () => {
    merchantService.getById.mockResolvedValue({ merchant: { ...baseMerchant, halalCertification: null } });
    merchantService.getMerchantProducts.mockResolvedValue({ products: [] });
    renderShop();

    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    expect(screen.queryByText('Halal Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Not Certified')).toBeInTheDocument();
  });

  it('shows no Halal Verified claims for revoked or suspended businesses', async () => {
    merchantService.getById.mockResolvedValue({
      merchant: { ...baseMerchant, verificationStatus: 'suspended', halalCertification: { ...issuedCert, status: 'suspended' } },
    });
    merchantService.getMerchantProducts.mockResolvedValue({ products: [] });
    renderShop();

    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    expect(screen.queryByText('Halal Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Not Certified')).toBeInTheDocument();
  });

  it('shows no Halal Verified claims for pending businesses', async () => {
    merchantService.getById.mockResolvedValue({
      merchant: { ...baseMerchant, verificationStatus: 'pending', halalCertification: null },
    });
    merchantService.getMerchantProducts.mockResolvedValue({ products: [] });
    renderShop();

    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    expect(screen.queryByText('Halal Verified')).not.toBeInTheDocument();
  });
});
