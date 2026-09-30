/*
 * API pública da @detrasoft.com/billing
 *
 * Assinaturas, cobrança e Apple IAP para produtos Detrasoft.
 * Depende apenas do detrasoft-core-api e da @detrasoft.com/detra-ng.
 */

/* ── Configuração / providers ── */
export * from './lib/billing.config';

/* ── Rotas ── */
export * from './lib/billing.routes';

/* ── Models ── */
export * from './lib/models/billing.model';
export * from './lib/models/apple-iap.model';

/* ── Services ── */
export * from './lib/services/billing-api.service';
export * from './lib/services/billing-platform.service';
export * from './lib/services/billing.store';
export * from './lib/services/apple-iap.service';

/* ── Utils ── */
export * from './lib/utils/format.util';

/* ── Components ── */
export { BillingOverviewComponent } from './lib/components/billing-overview/billing-overview.component';
export { SubscriptionPlansComponent } from './lib/components/subscription-plans/subscription-plans.component';
export { SubscriptionConfirmationComponent } from './lib/components/subscription-confirmation/subscription-confirmation.component';
export { SubscriptionCancellationComponent } from './lib/components/subscription-cancellation/subscription-cancellation.component';

/* ── Components compartilhados ── */
export { BillingPageHeaderComponent } from './lib/components/shared/billing-page-header.component';
export { BillingStateComponent } from './lib/components/shared/billing-state.component';
