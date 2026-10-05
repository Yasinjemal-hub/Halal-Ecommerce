import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MerchantApplicationForm from '../MerchantApplicationForm';
import mejilisService from '../../../services/mejilisService';
import { WithProviders } from '../../../test-utils';

jest.mock('../../../services/mejilisService');

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/Business Name \*/), { target: { value: 'Sunrise Grocery' } });
  fireEvent.change(screen.getByLabelText(/Business Type \*/), { target: { value: 'grocery' } });
  fireEvent.change(screen.getByLabelText(/Description \*/), { target: { value: 'A halal grocery store.' } });
  fireEvent.change(screen.getByLabelText(/Business Phone \*/), { target: { value: '+251911223344' } });
};

const renderForm = (props = {}) =>
  render(
    <WithProviders>
      <MemoryRouter>
        <MerchantApplicationForm onSubmitted={jest.fn()} {...props} />
      </MemoryRouter>
    </WithProviders>
  );

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:mock');
});

describe('MerchantApplicationForm (single application form)', () => {
  it('submits a new application with the entered values and no certification block', async () => {
    const onSubmitted = jest.fn();
    mejilisService.registerMerchant.mockResolvedValue({ merchant: { _id: 'm1' }, message: 'Submitted!' });
    render(
      <WithProviders>
        <MemoryRouter>
          <MerchantApplicationForm onSubmitted={onSubmitted} />
        </MemoryRouter>
      </WithProviders>
    );

    fillRequiredFields();
    fireEvent.click(screen.getByText('Submit for Mejilis Verification'));

    await waitFor(() => expect(mejilisService.registerMerchant).toHaveBeenCalled());
    const payload = mejilisService.registerMerchant.mock.calls[0][0];
    expect(payload.businessName).toBe('Sunrise Grocery');
    expect(payload.businessType).toBe('grocery');
    expect(payload.certification).toBeUndefined();
    expect(onSubmitted).toHaveBeenCalled();
  });

  it('renders no certificate type selection or evidence flow', () => {
    renderForm();
    expect(screen.queryByLabelText(/Certificate Type/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Also request halal certification/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apply for Halal Certification/)).not.toBeInTheDocument();
  });

  it('encodes newly chosen documents as data URLs', async () => {
    mejilisService.registerMerchant.mockResolvedValue({ merchant: { _id: 'm1' } });
    renderForm();

    fillRequiredFields();
    const file = new File(['license-bytes'], 'license.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Government License Image/), { target: { files: [file] } });

    fireEvent.click(screen.getByText('Submit for Mejilis Verification'));

    await waitFor(() => expect(mejilisService.registerMerchant).toHaveBeenCalled());
    const payload = mejilisService.registerMerchant.mock.calls[0][0];
    expect(payload.governmentLicense.url).toMatch(/^data:image\/png;base64,/);
  });

  it('shows server validation errors without losing the form', async () => {
    mejilisService.registerMerchant.mockRejectedValue({
      response: { data: { message: 'A merchant with this business name already exists. Please choose a different name.' } },
    });
    renderForm();

    fillRequiredFields();
    fireEvent.click(screen.getByText('Submit for Mejilis Verification'));

    await waitFor(() =>
      expect(screen.getByText('A merchant with this business name already exists. Please choose a different name.')).toBeInTheDocument()
    );
    // Entered data is preserved.
    expect(screen.getByLabelText(/Business Name \*/)).toHaveValue('Sunrise Grocery');
  });

  it('prefills values and resubmits in resubmit mode', async () => {
    const onSubmitted = jest.fn();
    mejilisService.updateRegistration.mockResolvedValue({ merchant: { _id: 'm1' } });
    render(
      <WithProviders>
        <MemoryRouter>
          <MerchantApplicationForm
            mode="resubmit"
            initialValues={{
              businessName: 'Fixable Shop',
              description: 'Old description',
              businessType: 'grocery',
              businessPhone: '+251911223344',
            }}
            onSubmitted={onSubmitted}
          />
        </MemoryRouter>
      </WithProviders>
    );

    expect(screen.getByLabelText(/Business Name \*/)).toHaveValue('Fixable Shop');
    fireEvent.change(screen.getByLabelText(/Description \*/), { target: { value: 'Corrected description' } });
    fireEvent.click(screen.getByText('Resubmit for Verification'));

    await waitFor(() => expect(mejilisService.updateRegistration).toHaveBeenCalled());
    const payload = mejilisService.updateRegistration.mock.calls[0][0];
    expect(payload.description).toBe('Corrected description');
    expect(payload.businessName).toBe('Fixable Shop');
    expect(onSubmitted).toHaveBeenCalled();
  });
});
