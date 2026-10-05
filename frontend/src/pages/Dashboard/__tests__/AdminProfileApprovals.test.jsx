import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import adminService from '../../../services/adminService';
import AdminProfileApprovals from '../AdminProfileApprovals';
import { WithProviders } from '../../../test-utils';

jest.mock('../../../services/adminService');

const REQUEST_USER = {
  _id: 'user-1',
  firstName: 'Old',
  lastName: 'Name',
  email: 'old@example.com',
  phone: '+251911000001',
  role: 'consumer',
  isActive: true,
  pendingProfileUpdate: {
    firstName: 'New',
    requestedAt: '2026-09-01T10:00:00.000Z',
    status: 'pending',
  },
};

const queueResponse = (users = [REQUEST_USER], total = users.length) => ({
  users,
  count: users.length,
  total,
  totalPages: total === 0 ? 0 : 1,
  currentPage: 1,
  limit: 10,
});

const renderPage = () =>
  render(
    <WithProviders>
      <MemoryRouter initialEntries={['/admin/profile-approvals']}>
        <AdminProfileApprovals />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AdminProfileApprovals review workspace', () => {
  it('shows a loading state while the queue loads', () => {
    adminService.getPendingProfileUpdates.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('approvals-loading')).toBeInTheDocument();
  });

  it('renders current vs requested values and omits unchanged fields', async () => {
    adminService.getPendingProfileUpdates.mockResolvedValue(queueResponse());
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approval-card')).toBeInTheDocument());
    const card = screen.getByTestId('approval-card');
    expect(within(card).getByText('Old Name')).toBeInTheDocument();
    // Requested first name shown next to the current value…
    expect(within(screen.getByTestId('approval-field-firstName')).getByText('New')).toBeInTheDocument();
    // …while unchanged last name / email / phone are never listed as changes.
    expect(screen.queryByTestId('approval-field-lastName')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-field-email')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-field-phone')).not.toBeInTheDocument();
    expect(adminService.getPendingProfileUpdates).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('shows an empty state when the queue is clear', async () => {
    adminService.getPendingProfileUpdates.mockResolvedValue(queueResponse([], 0));
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approvals-empty')).toBeInTheDocument());
  });

  it('shows an error with retry that reloads the queue', async () => {
    adminService.getPendingProfileUpdates
      .mockRejectedValueOnce({ response: { data: { message: 'Server down' } } })
      .mockResolvedValueOnce(queueResponse([], 0));
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approvals-error')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('retry-approvals'));

    await waitFor(() => expect(screen.getByTestId('approvals-empty')).toBeInTheDocument());
    expect(adminService.getPendingProfileUpdates).toHaveBeenCalledTimes(2);
  });

  it('confirms before deciding and removes the record only after server success', async () => {
    adminService.getPendingProfileUpdates
      .mockResolvedValueOnce(queueResponse())
      .mockResolvedValueOnce(queueResponse([], 0));
    adminService.approveUserProfileUpdate.mockResolvedValue({ success: true });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approval-card')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Approve'));

    // Confirmation step appears first; nothing is sent yet.
    expect(screen.getByTestId('decision-confirm')).toBeInTheDocument();
    expect(adminService.approveUserProfileUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() =>
      expect(adminService.approveUserProfileUpdate).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          action: 'approved',
          expectedRequestedAt: '2026-09-01T10:00:00.000Z',
        })
      )
    );
    await waitFor(() => expect(screen.getByTestId('approvals-empty')).toBeInTheDocument());
  });

  it('keeps the record in the queue when the decision fails', async () => {
    adminService.getPendingProfileUpdates.mockResolvedValue(queueResponse());
    adminService.approveUserProfileUpdate.mockRejectedValue({
      response: { status: 400, data: { message: 'Requested email is already in use by another account.' } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approval-card')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Reject'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(adminService.approveUserProfileUpdate).toHaveBeenCalled());
    // No false success: the record stays for retry.
    expect(screen.getByTestId('approval-card')).toBeInTheDocument();
  });

  it('flags records with no displayable changes and disables decisions', async () => {
    const hollow = {
      ...REQUEST_USER,
      _id: 'user-2',
      pendingProfileUpdate: { status: 'pending', requestedAt: '2026-09-02T10:00:00.000Z' },
    };
    adminService.getPendingProfileUpdates.mockResolvedValue(queueResponse([hollow]));
    renderPage();

    await waitFor(() => expect(screen.getByTestId('approval-no-changes')).toBeInTheDocument());
    expect(screen.getByText('Approve').closest('button')).toBeDisabled();
    expect(screen.getByText('Reject').closest('button')).toBeDisabled();
  });
});
