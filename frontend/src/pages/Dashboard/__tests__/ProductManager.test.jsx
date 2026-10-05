import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import merchantService from '../../../services/merchantService';
import { WithProviders } from '../../../test-utils';
import ProductManager from '../ProductManager';

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under review',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

jest.mock('../../../services/merchantService');
jest.mock('../../../services/productService');

const renderManager = () =>
  render(
    <WithProviders>
      <MemoryRouter>
        <ProductManager />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProductManager approval gate', () => {
  it('shows the product list and form to approved merchants', async () => {
    merchantService.getMyProfile.mockResolvedValue({
      merchant: { _id: 'm1', verificationStatus: 'approved' },
    });
    merchantService.getMerchantProducts.mockResolvedValue({
      products: [{ _id: 'p1', name: 'Beef', category: 'meat', price: 100, stock: 5, images: [] }],
    });

    renderManager();

    await waitFor(() => expect(screen.getByText('Beef')).toBeInTheDocument());
    expect(screen.getByText('Add New Product')).toBeInTheDocument();
    expect(screen.getByText('Create Product')).toBeInTheDocument();
    expect(screen.queryByTestId('product-access-gate')).not.toBeInTheDocument();
  });

  it('shows a status message instead of products and controls for other statuses', async () => {
    for (const verificationStatus of ['pending', 'under_review', 'rejected', 'suspended']) {
      merchantService.getMyProfile.mockResolvedValue({
        merchant: { _id: 'm1', verificationStatus },
      });

      const { unmount } = renderManager();

      await waitFor(() => expect(screen.getByTestId('product-access-gate')).toBeInTheDocument());
      expect(screen.getByTestId('product-access-gate')).toHaveTextContent(`while ${STATUS_LABELS[verificationStatus]}`);
      expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
      expect(screen.queryByText('Your Products')).not.toBeInTheDocument();
      // No product list request is made for non-approved merchants.
      expect(merchantService.getMerchantProducts).not.toHaveBeenCalled();
      unmount();
      jest.clearAllMocks();
    }
  });
});
