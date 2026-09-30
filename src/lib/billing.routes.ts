import { Routes } from '@angular/router';

/**
 * Rotas de "Conta & Assinatura".
 *
 * Monte com `loadChildren` no app hospedeiro e informe o mesmo caminho em
 * `provideBilling({ basePath })` para a navegação interna bater:
 *
 * ```ts
 * {
 *   path: 'account',
 *   loadChildren: () => import('@detrasoft.com/billing').then(m => m.BILLING_ROUTES),
 *   data: { title: 'Conta' },
 * }
 * ```
 */
export const BILLING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/billing-overview/billing-overview.component').then(
        m => m.BillingOverviewComponent,
      ),
    data: { title: 'Conta & assinatura' },
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./components/subscription-plans/subscription-plans.component').then(
        m => m.SubscriptionPlansComponent,
      ),
    data: { title: 'Planos' },
  },
  {
    path: 'plans/:priceId/confirm',
    loadComponent: () =>
      import('./components/subscription-confirmation/subscription-confirmation.component').then(
        m => m.SubscriptionConfirmationComponent,
      ),
    data: { title: 'Confirmar assinatura' },
  },
  {
    path: 'confirm',
    loadComponent: () =>
      import('./components/subscription-confirmation/subscription-confirmation.component').then(
        m => m.SubscriptionConfirmationComponent,
      ),
    data: { title: 'Confirmar assinatura' },
  },
  {
    path: 'cancel',
    loadComponent: () =>
      import('./components/subscription-cancellation/subscription-cancellation.component').then(
        m => m.SubscriptionCancellationComponent,
      ),
    data: { title: 'Cancelar assinatura' },
  },
];
