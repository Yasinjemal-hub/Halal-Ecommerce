import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyCertificate from '../VerifyCertificate';
import mejilisService from '../../services/mejilisService';
import { WithProviders } from '../../test-utils';

jest.mock('../../services/mejilisService');

const renderAt = (number) =>
  render(
    <WithProviders>
      <MemoryRouter initialEntries={[`/verify-certificate/${number}`]}>
        <Routes>
          <Route path="/verify-certificate/:certificateNumber" element={<VerifyCertificate />} />
        </Routes>
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VerifyCertificate page', () => {
  it('confirms a genuine certificate with public facts', async () => {
    mejilisService.verifyCertificate.mockResolvedValue({
      certificate: {
        certificateNumber: 'HC-2026-ABC123',
        businessName: 'Sunrise Grocery',
        certificateType: 'halal_establishment',
        issuingAuthority: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
        status: 'approved',
        issueDate: '2024-03-01T00:00:00.000Z',
        expiryDate: '2027-03-01T00:00:00.000Z',
        issued: true,
      },
    });

    renderAt('HC-2026-ABC123');
    await waitFor(() => expect(screen.getByText(/genuine and in force/)).toBeInTheDocument());
    expect(mejilisService.verifyCertificate).toHaveBeenCalledWith('HC-2026-ABC123');
    expect(screen.getByText('HC-2026-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Sunrise Grocery')).toBeInTheDocument();
  });

  it('reports unknown numbers honestly', async () => {
    mejilisService.verifyCertificate.mockRejectedValue({ response: { status: 404 } });

    renderAt('HC-2099-NOPE');
    await waitFor(() => expect(screen.getByText('Certificate Not Found')).toBeInTheDocument());
  });
});
