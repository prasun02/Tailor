import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { ConfigurationErrorPage } from '../pages/ConfigurationErrorPage';
import type { ShopRole } from '../types/database';
import {
  ADMIN_ROLES,
  CUSTOMER_TOKEN_PRINT_ROLES,
  ORDER_ENTRY_ROLES,
  PRODUCTION_PRINT_ROLES,
  PRODUCTION_ROLES,
  SEARCH_DELIVERY_ROLES,
  STORE_PRINT_ROLES,
} from '../utils/authorization';
import { RequireAuth, RequireConfiguration, RequireRole, RequireShop, RoleHomeRedirect } from './RouteGuards';

function pageModule<TModule extends object, TKey extends keyof TModule & string>(
  load: () => Promise<TModule>,
  componentName: TKey,
) {
  return async () => {
    const module = await load();
    return { Component: module[componentName] as ComponentType };
  };
}

function protectedPageModule<TModule extends object, TKey extends keyof TModule & string>(
  load: () => Promise<TModule>,
  componentName: TKey,
  allowedRoles: ReadonlyArray<ShopRole>,
) {
  return async () => {
    const module = await load();
    const Component = module[componentName] as ComponentType;
    const ProtectedComponent = () => (
      <RequireRole allowedRoles={allowedRoles}>
        <Component />
      </RequireRole>
    );

    return { Component: ProtectedComponent };
  };
}

function protectedRedirect(to: string, allowedRoles: ReadonlyArray<ShopRole>) {
  return (
    <RequireRole allowedRoles={allowedRoles}>
      <Navigate to={to} replace />
    </RequireRole>
  );
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
      { index: true, element: <RoleHomeRedirect /> },
      { path: 'dashboard', lazy: protectedPageModule(() => import('../pages/DashboardPage'), 'DashboardPage', ADMIN_ROLES) },
      { path: 'customers', lazy: protectedPageModule(() => import('../pages/CustomersPage'), 'CustomersPage', ADMIN_ROLES) },
      { path: 'customers/new', lazy: protectedPageModule(() => import('../pages/NewCustomerPage'), 'NewCustomerPage', ADMIN_ROLES) },
      {
        path: 'customers/:customerId/edit',
        lazy: protectedPageModule(() => import('../pages/EditCustomerPage'), 'EditCustomerPage', ADMIN_ROLES),
      },
      {
        path: 'customers/:customerId/measurements',
        lazy: protectedPageModule(() => import('../pages/CustomerMeasurementsPage'), 'CustomerMeasurementsPage', ADMIN_ROLES),
      },
      {
        path: 'customers/:customerId/measurements/new',
        lazy: protectedPageModule(() => import('../pages/NewCustomerMeasurementPage'), 'NewCustomerMeasurementPage', ADMIN_ROLES),
      },
      {
        path: 'customers/:customerId/measurements/:measurementId',
        lazy: protectedPageModule(
          () => import('../pages/CustomerMeasurementDetailPage'),
          'CustomerMeasurementDetailPage',
          ADMIN_ROLES,
        ),
      },
      {
        path: 'customers/:customerId',
        lazy: protectedPageModule(() => import('../pages/CustomerProfilePage'), 'CustomerProfilePage', ADMIN_ROLES),
      },
      { path: 'measurements', lazy: protectedPageModule(() => import('../pages/MeasurementsPage'), 'MeasurementsPage', ADMIN_ROLES) },
      { path: 'orders', lazy: protectedPageModule(() => import('../pages/OrdersPage'), 'OrdersPage', ADMIN_ROLES) },
      { path: 'orders/new', lazy: protectedPageModule(() => import('../pages/NewOrderPage'), 'NewOrderPage', ORDER_ENTRY_ROLES) },
      { path: 'entry/new-order', element: protectedRedirect('/orders/new', ORDER_ENTRY_ROLES) },
      { path: 'orders/:orderId/success', lazy: protectedPageModule(() => import('../pages/OrderSuccessPage'), 'OrderSuccessPage', CUSTOMER_TOKEN_PRINT_ROLES) },
      {
        path: 'orders/:orderId/print/customer-token',
        lazy: protectedPageModule(() => import('../pages/OrderPrintPage'), 'CustomerTokenPrintPage', CUSTOMER_TOKEN_PRINT_ROLES),
      },
      {
        path: 'orders/:orderId/print/production-copy',
        lazy: protectedPageModule(() => import('../pages/OrderPrintPage'), 'ProductionCopyPrintPage', PRODUCTION_PRINT_ROLES),
      },
      {
        path: 'orders/:orderId/print/store-copy',
        lazy: protectedPageModule(() => import('../pages/OrderPrintPage'), 'StoreCopyPrintPage', STORE_PRINT_ROLES),
      },
      {
        path: 'orders/:orderId/print/all',
        lazy: protectedPageModule(() => import('../pages/OrderPrintPage'), 'AllCopiesPrintPage', STORE_PRINT_ROLES),
      },
      { path: 'orders/:orderId', lazy: protectedPageModule(() => import('../pages/OrderDetailPage'), 'OrderDetailPage', CUSTOMER_TOKEN_PRINT_ROLES) },
      { path: 'orders/:orderId/edit', lazy: protectedPageModule(() => import('../pages/EditOrderPage'), 'EditOrderPage', ADMIN_ROLES) },
      {
        path: 'orders/:orderId/payment',
        lazy: protectedPageModule(() => import('../pages/OrderPaymentPage'), 'OrderPaymentPage', ADMIN_ROLES),
      },
      { path: 'token-search', lazy: protectedPageModule(() => import('../pages/TokenSearchPage'), 'TokenSearchPage', SEARCH_DELIVERY_ROLES) },
      { path: 'search', element: protectedRedirect('/token-search', SEARCH_DELIVERY_ROLES) },
      { path: 'production', lazy: protectedPageModule(() => import('../pages/ProductionPage'), 'ProductionPage', PRODUCTION_ROLES) },
      { path: 'deliveries', lazy: protectedPageModule(() => import('../pages/DeliveriesPage'), 'DeliveriesPage', SEARCH_DELIVERY_ROLES) },
      { path: 'payments', lazy: protectedPageModule(() => import('../pages/PaymentsDuePage'), 'PaymentsDuePage', ADMIN_ROLES) },
      { path: 'reports', lazy: protectedPageModule(() => import('../pages/ReportsPage'), 'ReportsPage', ADMIN_ROLES) },
      { path: 'settings', lazy: protectedPageModule(() => import('../pages/SettingsPage'), 'SettingsPage', ADMIN_ROLES) },
      {
        path: 'settings/shop-profile',
        lazy: protectedPageModule(() => import('../pages/ShopProfileSettingsPage'), 'ShopProfileSettingsPage', ADMIN_ROLES),
      },
      {
        path: 'settings/sms',
        lazy: protectedPageModule(() => import('../pages/SmsSettingsPage'), 'SmsSettingsPage', ADMIN_ROLES),
      },
      {
        path: 'settings/backup',
        lazy: protectedPageModule(() => import('../pages/BackupCentrePage'), 'BackupCentrePage', ADMIN_ROLES),
      },
      {
        path: 'settings/garments',
        lazy: protectedPageModule(() => import('../pages/GarmentSettingsPage'), 'GarmentSettingsPage', ADMIN_ROLES),
      },
      {
        path: 'settings/garments/:garmentId',
        lazy: protectedPageModule(() => import('../pages/GarmentDetailPage'), 'GarmentDetailPage', ADMIN_ROLES),
      },
      {
        path: 'settings/measurement-fields',
        lazy: protectedPageModule(() => import('../pages/MeasurementFieldsSettingsPage'), 'MeasurementFieldsSettingsPage', ADMIN_ROLES),
      },
      {
        path: 'settings/style-fields',
        lazy: protectedPageModule(() => import('../pages/StyleFieldsSettingsPage'), 'StyleFieldsSettingsPage', ADMIN_ROLES),
      },
      {
        path: 'settings/designs',
        lazy: protectedPageModule(() => import('../pages/DesignLibrarySettingsPage'), 'DesignLibrarySettingsPage', ADMIN_ROLES),
      },
    ],
  },
  {
    path: '*',
    lazy: pageModule(() => import('../pages/NotFoundPage'), 'NotFoundPage'),
    errorElement: <ErrorBoundary />,
  },
]);
