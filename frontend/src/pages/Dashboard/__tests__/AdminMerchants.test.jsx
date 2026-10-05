import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminService from '../../../services/adminService';
import AdminMerchants from '../AdminMerchants';
import { WithProviders } from '../../../test-utils';

jest.mock('../../../services/adminService');

const LIST_MERCHANT = {
  _id: 'merchant-1',
  businessName: 'Harar Spice House',
  verificationStatus: 'pending',
  isActive: true,
  businessEmail: 'info@hararspice.et',
  businessPhone: '+251911223344',
  businessAddress: { city: 'Harar' },
  createdAt: '2024-01-02T00:00:00.000Z',
  user: { _id: 'user-1', firstName: 'Amina', lastName: 'Yusuf', email: 'amina@example.com' },
  // Documents must never appear in list payloads:
  governmentLicense: undefined,
  nationalId: undefined,
};

const DETAIL_MERCHANT = {
  ...LIST_MERCHANT,
  businessType: 'spice_shop',
  description: 'Family-run spice shop.',
  applicationNotes: 'Please expedite — harvest season.',
  website: '',
  businessAddress: { street: 'Main Rd', city: 'Harar', region: 'Harari' },
  governmentLicense: { url: 'data:image/png;base64,iVBOR' },
  nationalId: undefined, // missing on purpose
  verificationNotes: '',
  rejectionReason: '',
  verifiedBy: null,
  verifiedAt: null,
  halalCertification: null,
};

const listResponse = (merchants = [LIST_MERCHANT]) => ({
  merchants,
  total: merchants.length,
  totalPages: 1,
  currentPage: 1,
  statusCounts: { pending: 1, under_review: 0, approved: 0, rejected: 0, suspended: 0 },
});

const renderWorkspace = (route = '/admin/merchants') =>
  render(
    <WithProviders>
      <MemoryRouter initialEntries={[route]}>
        <AdminMerchants />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminMerchants review workspace (one-approval rule)', () => {
  it('shows a loading state while merchants load', () => {
    adminService.getAllMerchants.mockReturnValue(new Promise(() => {}));
    renderWorkspace();
    expect(screen.getByTestId('merchants-loading')).toBeInTheDocument();
  });

  it('renders server-provided merchants and status counts', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    expect(screen.getByText('info@hararspice.et')).toBeInTheDocument();
    expect(document.querySelector('.mm-badge-pending')).toHaveTextContent('Pending');
    expect(screen.getByTestId('merchant-status-counts')).toBeInTheDocument();
  });

  it('shows an empty state when no merchants match', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse([]));
    renderWorkspace();

    await waitFor(() => expect(screen.getByTestId('merchants-empty')).toBeInTheDocument());
    expect(screen.getByText('No merchants found')).toBeInTheDocument();
  });

  it('shows an error with retry when loading fails', async () => {
    adminService.getAllMerchants
      .mockRejectedValueOnce({ response: { data: { message: 'DB down' } } })
      .mockResolvedValueOnce(listResponse());
    renderWorkspace();

    await waitFor(() => expect(screen.getByTestId('merchants-error')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('retry-merchants'));

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    expect(adminService.getAllMerchants).toHaveBeenCalledTimes(2);
  });

  it('passes search, status filter, and sort to the server', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse([]));
    renderWorkspace();
    await waitFor(() => expect(adminService.getAllMerchants).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Filter by verification status'), {
      target: { value: 'pending' },
    });
    fireEvent.change(screen.getByLabelText('Sort merchants'), { target: { value: 'name' } });

    await waitFor(() =>
      expect(adminService.getAllMerchants).toHaveBeenLastCalledWith(
        expect.objectContaining({ verificationStatus: 'pending', sort: 'name' })
      )
    );
  });

  it('shows the one-approval notice (approval also certifies)', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.getMerchantById.mockResolvedValue({ merchant: DETAIL_MERCHANT });
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));

    await waitFor(() => expect(screen.getByText('Merchant application')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument());
    expect(screen.getByText(/did not upload this document/)).toBeInTheDocument();
    expect(screen.getByText(/also approves it as halal certified/i)).toBeInTheDocument();
  });

  it('closes the detail on Escape', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.getMerchantById.mockResolvedValue({ merchant: DETAIL_MERCHANT });
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => expect(screen.getByText('Merchant application')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('Merchant application')).not.toBeInTheDocument()
    );
  });

  it('approves with a single decision that issues the certificate (no type/evidence inputs)', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.getMerchantById.mockResolvedValue({ merchant: DETAIL_MERCHANT });
    adminService.verifyMerchant.mockResolvedValue({
      merchant: { ...DETAIL_MERCHANT, verificationStatus: 'approved' },
      certification: { _id: 'cert-1', status: 'approved', certificateNumber: 'HC-2026-X1' },
    });
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => expect(screen.getByText('Merchant application')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument());

    expect(screen.queryByLabelText(/Certificate Type/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Certification decision/)).not.toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Approve'));
    fireEvent.click(within(dialog).getByText('Continue to Approved'));
    expect(within(dialog).getByTestId('decision-confirm')).toBeInTheDocument();
    expect(within(dialog).getByTestId('decision-cert-summary')).toHaveTextContent('automatically');
    fireEvent.click(within(dialog).getByText('Confirm'));

    await waitFor(() =>
      expect(adminService.verifyMerchant).toHaveBeenCalledWith(
        'merchant-1',
        expect.objectContaining({ verificationStatus: 'approved' })
      )
    );
    const payload = adminService.verifyMerchant.mock.calls[0][1];
    expect(payload.certification).toBeUndefined();
    await waitFor(() => expect(screen.getByTestId('decision-saved')).toBeInTheDocument());
  });

  it('requires a rejection reason before rejecting', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.getMerchantById.mockResolvedValue({ merchant: DETAIL_MERCHANT });
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => expect(screen.getByText('Merchant application')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument());

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Reject'));
    fireEvent.click(within(dialog).getByText('Continue to Rejected'));

    expect(within(dialog).getByText(/rejection reason is required/i)).toBeInTheDocument();
    expect(adminService.verifyMerchant).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/rejection reason \(required\)/i), {
      target: { value: 'License expired' },
    });
    adminService.verifyMerchant.mockResolvedValue({
      merchant: { ...DETAIL_MERCHANT, verificationStatus: 'rejected', rejectionReason: 'License expired' },
    });
    fireEvent.click(within(dialog).getByText('Continue to Rejected'));
    fireEvent.click(within(dialog).getByText('Confirm'));

    await waitFor(() =>
      expect(adminService.verifyMerchant).toHaveBeenCalledWith(
        'merchant-1',
        expect.objectContaining({ verificationStatus: 'rejected', rejectionReason: 'License expired' })
      )
    );
  });

  it('shows the issued certificate in the single-decision review', async () => {
    const issuedCert = {
      _id: 'cert-1',
      certificateNumber: 'HC-2026-X1',
      issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
      status: 'approved',
      issueDate: '2024-01-03T00:00:00.000Z',
      expiryDate: '2025-01-03T00:00:00.000Z',
    };
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.getMerchantById.mockResolvedValue({ merchant: { ...DETAIL_MERCHANT, halalCertification: issuedCert } });
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Review'));
    await waitFor(() => expect(screen.getByText('Merchant application')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('cert-application')).toBeInTheDocument());

    expect(screen.getByText(/HC-2026-X1/)).toBeInTheDocument();
  });

  it('confirms account deactivation with the owner user id', async () => {
    adminService.getAllMerchants.mockResolvedValue(listResponse());
    adminService.toggleUserStatus.mockResolvedValue({});
    renderWorkspace();

    await waitFor(() => expect(screen.getByText('Harar Spice House')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Deactivate account'));
    fireEvent.click(screen.getByText('Confirm deactivate'));

    await waitFor(() => expect(adminService.toggleUserStatus).toHaveBeenCalledWith('user-1'));
  });
});
