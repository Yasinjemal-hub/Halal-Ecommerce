import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MerchantRegister from '../MerchantRegister';
import mejilisService from '../../services/mejilisService';
import authService from '../../services/authService';
import { WithProviders } from '../../test-utils';

jest.mock('../../services/mejilisService');
jest.mock('../../services/authService');

const renderPage = () =>
  render(
    <WithProviders>
      <MemoryRouter>
        <MerchantRegister />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:mock');
});

describe('MerchantRegister route', () => {
  it('asks signed-out visitors to sign in', () => {
    authService.isAuthenticated.mockReturnValue(false);
    authService.getCurrentUser.mockReturnValue(null);

    renderPage();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
    expect(mejilisService.getRegistrationStatus).not.toHaveBeenCalled();
  });

  it('guides consumer accounts instead of showing the form', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'consumer' });
    mejilisService.getRegistrationStatus.mockResolvedValue({ isRegistered: false });

    renderPage();
    await waitFor(() => expect(screen.getByText('Merchant Registration Restricted')).toBeInTheDocument());
    expect(screen.queryByText('Merchant Application Form')).not.toBeInTheDocument();
  });

  it('shows the complete application form to new merchant users', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'merchant' });
    mejilisService.getRegistrationStatus.mockResolvedValue({ isRegistered: false });

    renderPage();
    await waitFor(() => expect(screen.getByText('Merchant Application Form')).toBeInTheDocument());
    expect(screen.getByLabelText(/Business Name \*/)).toBeInTheDocument();
    expect(screen.getByText('Submit for Mejilis Verification')).toBeInTheDocument();
  });

  it('shows the persistent status page after submission', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'merchant' });
    mejilisService.getRegistrationStatus.mockResolvedValue({
      isRegistered: true,
      merchant: {
        _id: 'm1',
        businessName: 'Sunrise Grocery',
        verificationStatus: 'pending',
        createdAt: '2024-02-01T00:00:00.000Z',
        halalCertification: null,
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('application-status')).toBeInTheDocument());
    expect(screen.getByText('My Application')).toBeInTheDocument();
    expect(screen.getByText('Business Review Under Way')).toBeInTheDocument();
    expect(screen.queryByText('Merchant Application Form')).not.toBeInTheDocument();
  });

  it('switches a rejected application into resubmit editing', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'merchant' });
    mejilisService.getRegistrationStatus.mockResolvedValue({
      isRegistered: true,
      merchant: {
        _id: 'm1',
        businessName: 'Fixable Shop',
        description: 'Old description',
        businessType: 'grocery',
        businessPhone: '+251911223344',
        verificationStatus: 'rejected',
        rejectionReason: 'License photo is unreadable',
        createdAt: '2024-02-01T00:00:00.000Z',
        halalCertification: null,
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Fix and Resubmit Application')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Fix and Resubmit Application'));

    await waitFor(() => expect(screen.getByText('Update Your Application')).toBeInTheDocument());
    expect(screen.getByLabelText(/Business Name \*/)).toHaveValue('Fixable Shop');
  });

  it('shows the issued certificate directly once the business is approved (no second form)', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'merchant' });
    mejilisService.getRegistrationStatus.mockResolvedValue({
      isRegistered: true,
      merchant: {
        _id: 'm1',
        businessName: 'Sunrise Grocery',
        verificationStatus: 'approved',
        createdAt: '2024-02-01T00:00:00.000Z',
        halalCertification: {
          certificateNumber: 'HC-2026-ABC123',
          issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
          status: 'approved',
          issueDate: '2024-03-01T00:00:00.000Z',
          expiryDate: '2027-03-01T00:00:00.000Z',
        },
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId('certificate-card')).toBeInTheDocument());
    expect(screen.getByText('Congratulations! Your Business Is Approved & Halal Certified!')).toBeInTheDocument();
    expect(screen.getByText('View Certificate')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  it('keeps request failures as an error state instead of showing the blank form', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'merchant' });
    mejilisService.getRegistrationStatus.mockRejectedValue({ response: { status: 500 } });

    renderPage();
    // Title + detail both render the localized fallback for unknown errors.
    await waitFor(() => expect(screen.getAllByText("Couldn't load your application")).toHaveLength(2));
    expect(screen.queryByText('Merchant Application Form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(mejilisService.getRegistrationStatus).toHaveBeenCalledTimes(2));
  });
});
