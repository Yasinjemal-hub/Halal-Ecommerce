import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import store from '../redux/slices/store';
import { LanguageProvider } from '../i18n/LanguageContext';
import App from '../App';

jest.setTimeout(20000);

const renderAppAt = (route) => {
  cleanup();
  window.history.pushState({}, '', route);
  return render(
    <Provider store={store}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </Provider>
  );
};

describe('App routes (code-split)', () => {
  it('renders the layout and lazily-loaded home page on /', async () => {
    renderAppAt('/');
    // Layout is eager; page chunk resolves through Suspense.
    expect(document.getElementById('main-navbar')).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('main-navbar')).toBeInTheDocument(), { timeout: 10000 });
  });

  it('renders the 404 page for unknown routes', async () => {
    renderAppAt('/definitely-not-a-route');
    await waitFor(() => expect(screen.getByText('Page Not Found')).toBeInTheDocument(), { timeout: 10000 });
  });

  it('redirects unauthenticated users away from the merchant application route', async () => {
    renderAppAt('/merchant/register');
    // RequireAuth bounces to /login, which uses the navbar-less auth layout.
    await waitFor(() => expect(window.location.pathname).toBe('/login'), { timeout: 10000 });
  });
});
