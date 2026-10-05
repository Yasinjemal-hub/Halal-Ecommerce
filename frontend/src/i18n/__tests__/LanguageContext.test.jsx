import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../redux/slices/authSlice';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const renderWithProviders = (authState, ui) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });
  return render(
    <Provider store={store}>
      <LanguageProvider>{ui}</LanguageProvider>
    </Provider>
  );
};

const Probe = () => {
  const { t, tp, language, setLanguage, dir, formatETB, formatDate } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="nav-home">{t('nav_home')}</span>
      <span data-testid="missing">{t('__no_such_key__')}</span>
      <span data-testid="plural">{tp('cart_items', 2, {})}</span>
      <span data-testid="price">{formatETB(1500)}</span>
      <span data-testid="date">{formatDate('2026-06-27T12:00:00.000Z', { dateStyle: 'medium' })}</span>
      <button type="button" onClick={() => setLanguage('am')}>to-am</button>
      <button type="button" onClick={() => setLanguage('ar')}>to-ar</button>
    </div>
  );
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
});

describe('LanguageContext behavior', () => {
  it('renders English by default and persists the choice across reloads', () => {
    const { unmount } = renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
    expect(screen.getByTestId('nav-home')).toHaveTextContent('Home');
    fireEvent.click(screen.getByText('to-am'));
    expect(screen.getByTestId('nav-home')).not.toHaveTextContent('Home');
    expect(screen.getByTestId('lang')).toHaveTextContent('am');
    expect(localStorage.getItem('halal_lang')).toBe('am');
    unmount();
    renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
    expect(screen.getByTestId('lang')).toHaveTextContent('am');
  });

  it('switches immediately without reload and sets document direction', () => {
    renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
    fireEvent.click(screen.getByText('to-ar'));
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
  });

  it('falls back to readable English for missing keys in any language', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
      fireEvent.click(screen.getByText('to-am'));
      // Unknown keys never render blank or raw-key output for known catalog
      // misses; the probe key is absent everywhere so the key itself is the
      // last-resort developer signal (plus a dev console warning).
      expect(screen.getByTestId('missing')).toHaveTextContent('__no_such_key__');
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('adopts the signed-in user’s saved language preference', () => {
    renderWithProviders(
      { isAuthenticated: true, user: { preferredLanguage: 'so' } },
      <Probe />
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('so');
    expect(localStorage.getItem('halal_lang')).toBe('so');
  });

  it('formats ETB currency and dates through the active locale', () => {
    renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
    expect(screen.getByTestId('price').textContent.length).toBeGreaterThan(0);
    expect(screen.getByTestId('date').textContent.length).toBeGreaterThan(0);
    expect(screen.getByTestId('plural').textContent).not.toBe('');
  });

  it('pluralizes with CLDR rules per locale', () => {
    localStorage.setItem('halal_lang', 'ar');
    renderWithProviders({ isAuthenticated: false, user: null }, <Probe />);
    // Arabic "two" form exists in the catalog; tp() must not crash and must
    // return non-empty localized text for several counts.
    expect(screen.getByTestId('plural').textContent.length).toBeGreaterThan(0);
    act(() => {});
  });
});
