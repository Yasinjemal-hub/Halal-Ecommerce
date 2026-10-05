import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './redux/slices/authSlice';
import { LanguageProvider } from './i18n/LanguageContext';

// Shared test harness: redux auth state + language context, mirroring the
// production provider tree (Provider > LanguageProvider > app).
export const createTestStore = (auth = { isAuthenticated: false, user: null }) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth },
  });

export const WithProviders = ({ children, auth }) => (
  <Provider store={createTestStore(auth)}>
    <LanguageProvider>{children}</LanguageProvider>
  </Provider>
);

export default WithProviders;
