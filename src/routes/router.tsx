import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { ConfigurationErrorPage } from '../pages/ConfigurationErrorPage';
import { RequireAuth, RequireConfiguration, RequireShop } from './RouteGuards';

function pageModule<TModule extends Record<string, ComponentType>, TKey extends keyof TModule & string>(
  load: () => Promise<TModule>,
  componentName: TKey,
) {
  return async () => {
    const module = await load();
    return { Component: module[componentName] };
  };
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'login', lazy: pageModule(() => import('../pages/LoginPage'), 'LoginPage') },
      { path: 'forgot-password', lazy: pageModule(() => import('../pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
      { path: 'reset-password', lazy: pageModule(() => import('../pages/ResetPasswordPage'), 'ResetPasswordPage') },
      { path: 'configuration', element: <ConfigurationErrorPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireConfiguration>
        <RequireAuth>
          <PublicLayout />
        </RequireAuth>
      </RequireConfiguration>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'onboarding', lazy: pageModule(() => import('../pages/OnboardingPage'), 'OnboardingPage') },
      {
        path: 'membership-suspended',
        lazy: pageModule(() => import('../pages/MembershipSuspendedPage'), 'MembershipSuspendedPage'),
      },
    ],
  },
  {
    path: '/',
    element: (
      <RequireConfiguration>
        <RequireAuth>
          <RequireShop>
            <AuthenticatedLayout />
          </RequireShop>
        </RequireAuth>
      </RequireConfiguration>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', lazy: pageModule(() => import('../pages/DashboardPage'), 'DashboardPage') },
      { path: 'customers', lazy: pageModule(() => import('../pages/CustomersPage'), 'CustomersPage') },
      { path: 'customers/new', lazy: pageModule(() => import('../pages/NewCustomerPage'), 'NewCustomerPage') },
      {
        path: 'customers/:customerId/edit',
        lazy: pageModule(() => import('../pages/EditCustomerPage'), 'EditCustomerPage'),
      },
      {
        path: 'customers/:customerId/measurements',
        lazy: pageModule(() => import('../pages/CustomerMeasurementsPage'), 'CustomerMeasurementsPage'),
      },
      {
        path: 'customers/:customerId/measurements/new',
        lazy: pageModule(() => import('../pages/NewCustomerMeasurementPage'), 'NewCustomerMeasurementPage'),
      },
      {
        path: 'customers/:customerId/measurements/:measurementId',
        lazy: pageModule(
          () => import('../pages/CustomerMeasurementDetailPage'),
          'CustomerMeasurementDetailPage',
        ),
      },
      {
        path: 'customers/:customerId',
        lazy: pageModule(() => import('../pages/CustomerProfilePage'), 'CustomerProfilePage'),
      },
      { path: 'measurements', lazy: pageModule(() => import('../pages/MeasurementsPage'), 'MeasurementsPage') },
      { path: 'orders', lazy: pageModule(() => import('../pages/OrdersPage'), 'OrdersPage') },
      { path: 'orders/new', lazy: pageModule(() => import('../pages/NewOrderPage'), 'NewOrderPage') },
      { path: 'entry/new-order', element: <Navigate to="/orders/new" replace /> },
      { path: 'orders/:orderId', lazy: pageModule(() => import('../pages/OrderDetailPage'), 'OrderDetailPage') },
      { path: 'orders/:orderId/edit', lazy: pageModule(() => import('../pages/EditOrderPage'), 'EditOrderPage') },
      {
        path: 'orders/:orderId/payment',
        lazy: pageModule(() => import('../pages/OrderPaymentPage'), 'OrderPaymentPage'),
      },
      { path: 'token-search', lazy: pageModule(() => import('../pages/TokenSearchPage'), 'TokenSearchPage') },
      { path: 'search', element: <Navigate to="/token-search" replace /> },
      { path: 'production', lazy: pageModule(() => import('../pages/ProductionPage'), 'ProductionPage') },
      { path: 'deliveries', lazy: pageModule(() => import('../pages/DeliveriesPage'), 'DeliveriesPage') },
      { path: 'payments', lazy: pageModule(() => import('../pages/PaymentsDuePage'), 'PaymentsDuePage') },
      { path: 'reports', lazy: pageModule(() => import('../pages/ReportsPage'), 'ReportsPage') },
      { path: 'settings', lazy: pageModule(() => import('../pages/SettingsPage'), 'SettingsPage') },
      {
        path: 'settings/garments',
        lazy: pageModule(() => import('../pages/GarmentSettingsPage'), 'GarmentSettingsPage'),
      },
      {
        path: 'settings/garments/:garmentId',
        lazy: pageModule(() => import('../pages/GarmentDetailPage'), 'GarmentDetailPage'),
      },
      {
        path: 'settings/measurement-fields',
        lazy: pageModule(() => import('../pages/MeasurementFieldsSettingsPage'), 'MeasurementFieldsSettingsPage'),
      },
      {
        path: 'settings/style-fields',
        lazy: pageModule(() => import('../pages/StyleFieldsSettingsPage'), 'StyleFieldsSettingsPage'),
      },
    ],
  },
  {
    path: '*',
    lazy: pageModule(() => import('../pages/NotFoundPage'), 'NotFoundPage'),
    errorElement: <ErrorBoundary />,
  },
]);
