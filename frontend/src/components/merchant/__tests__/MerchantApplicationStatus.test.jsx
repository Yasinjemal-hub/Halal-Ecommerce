import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MerchantApplicationStatus from '../MerchantApplicationStatus';
import mejilisService from '../../../services/mejilisService';
import { WithProviders } from '../../../test-utils';

jest.mock('../../../services/mejilisService');

const baseMerchant = {
  _id: 'm1',
  businessName: 'Sunrise Grocery',
  verificationStatus: 'pending',
  createdAt: '2024-02-01T00:00:00.000Z',
  halalCertification: null,
};

const issuedCert = {
  _id: 'c1',
  certificateNumber: 'HC-2026-ABC123',
  issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
  certificateType: 'halal_establishment',
  status: 'approved',
  issueDate: '2024-03-01T00:00:00.000Z',
  expiryDate: '2027-03-01T00:00:00.000Z',
  scope: 'Retail grocery',
};

const renderStatus = (merchant, { onUpdateRequest = jest.fn() } = {}) => {
  render(
    <WithProviders>
      <MemoryRouter>
        <MerchantApplicationStatus
          merchant={merchant}
          onUpdateRequest={onUpdateRequest}
        />
      </MemoryRouter>
    </WithProviders>
  );
  return { onUpdateRequest };
};

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:mock');
  URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = jest.fn();
});

describe('MerchantApplicationStatus (one-approval rule)', () => {
  it('shows pending state with submission date and update affordance', () => {
    const { onUpdateRequest } = renderStatus(baseMerchant);

    expect(screen.getByText('Business Review Under Way')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Update Application')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Update Application'));
    expect(onUpdateRequest).toHaveBeenCalled();
  });

  it('shows the reviewer message when rejected and offers resubmission', () => {
    renderStatus({
      ...baseMerchant,
      verificationStatus: 'rejected',
      rejectionReason: 'License photo is unreadable',
    });

    expect(screen.getByText('Application Needs Attention')).toBeInTheDocument();
    expect(screen.getByTestId('reviewer-message')).toHaveTextContent('License photo is unreadable');
    expect(screen.getByText('Fix and Resubmit Application')).toBeInTheDocument();
    // Rejection issues no certificate.
    expect(screen.queryByTestId('certificate-card')).not.toBeInTheDocument();
  });

  it('congratulates and shows the certificate once approved — no second step', () => {
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', verifiedAt: '2024-03-01T00:00:00.000Z', halalCertification: issuedCert });

    expect(screen.getByText('Congratulations! Your Business Is Approved & Halal Certified!')).toBeInTheDocument();
    expect(screen.getByTestId('certificate-card')).toBeInTheDocument();
    expect(screen.queryByText(/apply for it|separate next step/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Halal Evidence')).not.toBeInTheDocument();
  });

  it('shows a repair notice (never a background-job promise) when approved without a record', () => {
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', verifiedAt: '2024-03-01T00:00:00.000Z' });

    expect(screen.getByTestId('certificate-missing')).toBeInTheDocument();
    expect(screen.getByText('Halal certificate record missing')).toBeInTheDocument();
    expect(screen.queryByText(/being prepared/i)).not.toBeInTheDocument();
    expect(screen.queryByText('View Certificate')).not.toBeInTheDocument();
    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });

  it('hides the certificate for suspended businesses', () => {
    renderStatus({ ...baseMerchant, verificationStatus: 'suspended', halalCertification: { ...issuedCert, status: 'suspended' } });

    expect(screen.getByText('Account Suspended')).toBeInTheDocument();
    expect(screen.queryByTestId('certificate-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });

  it('shows full certificate facts and downloads the PDF when issued', async () => {
    mejilisService.downloadCertificatePdf.mockResolvedValue(new Blob(['%PDF-mock'], { type: 'application/pdf' }));
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', halalCertification: issuedCert });

    expect(screen.getByTestId('certificate-card')).toBeInTheDocument();
    expect(screen.getByText('HC-2026-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Ethiopian Islamic Affairs Supreme Council (Majlis)')).toBeInTheDocument();
    expect(screen.getByText('VALID')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Download PDF'));
    await waitFor(() => expect(mejilisService.downloadCertificatePdf).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Download started. Check your downloads folder.')).toBeInTheDocument());
    // The object URL must survive the click so the browser can fetch it.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('localizes blob error responses instead of rendering raw backend sentences', async () => {
    mejilisService.downloadCertificatePdf.mockRejectedValue({
      response: { data: new Blob([JSON.stringify({ success: false, message: 'Certificate gone' })], { type: 'application/json' }) },
    });
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', halalCertification: issuedCert });

    fireEvent.click(screen.getByText('Download PDF'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not download the certificate. Please try again.'));
    // The other action stays usable.
    expect(screen.getByText('View Certificate').closest('button')).not.toBeDisabled();
  });

  it('surfaces PDF download failures honestly', async () => {
    mejilisService.downloadCertificatePdf.mockRejectedValue({ response: { data: { message: 'Not issued' } } });
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', halalCertification: issuedCert });

    fireEvent.click(screen.getByText('Download PDF'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not download the certificate. Please try again.'));
    expect(screen.getByText('Retry Download')).toBeInTheDocument();
  });

  it('opens the viewer tab inside the click gesture (popup-safe) and loads the PDF into it', async () => {
    mejilisService.downloadCertificatePdf.mockResolvedValue(new Blob(['%PDF-mock'], { type: 'application/pdf' }));
    const tab = { location: {}, close: jest.fn() };
    window.open = jest.fn().mockReturnValue(tab);
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', halalCertification: issuedCert });

    fireEvent.click(screen.getByText('View Certificate'));
    // Opened synchronously with a placeholder — gesture preserved.
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'noopener,noreferrer');
    await waitFor(() => expect(tab.location.href).toBe('blob:mock'));
    await waitFor(() => expect(screen.getByText('Certificate opened in a new tab.')).toBeInTheDocument());
    expect(tab.close).not.toHaveBeenCalled();
  });

  it('shows a recoverable error when the viewer tab is blocked', async () => {
    window.open = jest.fn().mockReturnValue(null);
    renderStatus({ ...baseMerchant, verificationStatus: 'approved', halalCertification: issuedCert });

    fireEvent.click(screen.getByText('View Certificate'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/blocked/i));
    expect(mejilisService.downloadCertificatePdf).not.toHaveBeenCalled();
    expect(screen.getByText('Retry View')).toBeInTheDocument();
    // Download still works after a blocked view.
    expect(screen.getByText('Download PDF').closest('button')).not.toBeDisabled();
  });

  it('offers no editing for suspended accounts', () => {
    renderStatus({ ...baseMerchant, verificationStatus: 'suspended' });

    expect(screen.getByText('Account Suspended')).toBeInTheDocument();
    expect(screen.queryByText('Update Application')).not.toBeInTheDocument();
    expect(screen.queryByText('Fix and Resubmit Application')).not.toBeInTheDocument();
  });
});
