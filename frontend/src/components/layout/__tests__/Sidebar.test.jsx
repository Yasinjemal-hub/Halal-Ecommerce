import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WithProviders } from '../../../test-utils';
import Sidebar from '../Sidebar';

const renderSidebar = (user) => {
  return render(
    <WithProviders auth={{ isAuthenticated: true, user }}>
      <MemoryRouter>
        <Sidebar isOpen onClose={jest.fn()} />
      </MemoryRouter>
    </WithProviders>
  );
};

describe('Sidebar merchant navigation', () => {
  it('shows an obvious My Application link to merchants', () => {
    renderSidebar({ firstName: 'M', lastName: 'K', role: 'merchant' });
    const link = screen.getByText('My Application');
    expect(link.closest('a')).toHaveAttribute('href', '/merchant/register');
  });

  it('does not show My Application to admins', () => {
    renderSidebar({ firstName: 'A', lastName: 'D', role: 'admin' });
    expect(screen.queryByText('My Application')).not.toBeInTheDocument();
  });
});
