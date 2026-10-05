import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminCertifications from '../AdminCertifications';
import mejilisService from '../../../services/mejilisService';
import { WithProviders } from '../../../test-utils';

jest.mock('../../../services/mejilisService');

const LIST_CERT = {
  _id: 'cert-1',
  certificateType: 'halal_establishment',
  certificateNumber: 'HC-2026-X1',
  status: 'approved',
  applicationDate: '2024-04-01T00:00:00.000Z',
  scope: 'Retail grocery',
  merchant: { _id: 'm1', businessName: 'Sunrise Grocery', businessType: 'grocery' },
};

const DETAIL_CERT = {
  ...LIST_CERT,
  issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
  issueDate: '2024-04-02T00:00:00.000Z',
  expiryDate: '2025-04-02T00:00:00.000Z',
  statusHistory: [],
};

const queueResponse = (certs = [LIST_CERT]) => ({
  certifications: certs,
  total: certs.length,
  totalPages: 1,
  currentPage: 1,
  statusCounts: { pending: 0, under_review: 0, approved: 1, rejected: 0, expired: 0, revoked: 0, suspended: 0 },
});

const renderQueue = () =>
  render(
    <WithProviders>
      <MemoryRouter>
        <AdminCertifications />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminCertifications (read-only issued list)', () => {
  it('shows a loading state, then the list with counts', async () => {
    let resolveQueue;
    mejilisService.getCertifications.mockReturnValue(
      new Promise((resolve) => { resolveQueue = resolve; })
    );
    renderQueue();
    expect(screen.getByTestId('certs-loading')).toBeInTheDocument();

    resolveQueue(queueResponse());
    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    expect(screen.getByTestId('cert-status-counts')).toBeInTheDocument();
    expect(screen.getByText('Issued Halal Certificates')).toBeInTheDocument();
  });

  it('shows empty and error states with retry', async () => {
    mejilisService.getCertifications.mockResolvedValueOnce(queueResponse([]));
    renderQueue();
    await waitFor(() => expect(screen.getByTestId('certs-empty')).toBeInTheDocument());

    mejilisService.getCertifications
      .mockRejectedValueOnce({ response: { data: { message: 'DB down' } } })
      .mockResolvedValueOnce(queueResponse());
    renderQueue();
    await waitFor(() => expect(screen.getByTestId('certs-error')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('retry-certs'));
    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
  });

  it('opens a read-only detail with no second decision', async () => {
    mejilisService.getCertifications.mockResolvedValue(queueResponse());
    mejilisService.getCertificationById.mockResolvedValue({ certification: DETAIL_CERT });
    renderQueue();

    await waitFor(() => expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));

    await waitFor(() => expect(screen.getByText(/Separate certification review is retired/)).toBeInTheDocument());
    expect(screen.queryByText('Approve & Issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirm Decision')).not.toBeInTheDocument();
  });
});
