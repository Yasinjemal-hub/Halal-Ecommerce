import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../redux/slices/authSlice';
import RequireAuth from '../RequireAuth';

const renderWithProviders = (initialAuthState, initialRoute = '/') => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: initialAuthState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <RequireAuth>
                <div>Protected Content</div>
              </RequireAuth>
            }
          />
          <Route
            path="/admin-only"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <div>Admin Content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('RequireAuth Component', () => {
  it('renders children when user is authenticated', () => {
    renderWithProviders({
      isAuthenticated: true,
      user: { role: 'consumer' },
    }, '/protected');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    renderWithProviders({
      isAuthenticated: false,
      user: null,
    }, '/protected');

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to / when user lacks required role', () => {
    renderWithProviders({
      isAuthenticated: true,
      user: { role: 'consumer' },
    }, '/admin-only');

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('allows access when user has required role', () => {
    renderWithProviders({
      isAuthenticated: true,
      user: { role: 'admin' },
    }, '/admin-only');

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('allows access when allowedRoles is not specified', () => {
    renderWithProviders({
      isAuthenticated: true,
      user: { role: 'consumer' },
    }, '/protected');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
