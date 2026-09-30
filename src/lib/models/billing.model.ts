/**
 * Models de cobrança — espelham os DTOs reais do detrasoft-core-api.
 *
 * Conferidos campo a campo contra `AccountDTO`, `SubscriptionDTO`, `InvoiceDTO`
 * e `PriceSoftwareDTO`. Datas chegam como ISO string (`Instant` serializado).
 */

/** Espelha `AccountDTO`. */
export interface BillingAccount {
  id?: string;
  /** `Long` no backend. */
  code?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  /** Guarda `activeUsers` e `stripeCustomerId`. */
  customFields?: Record<string, unknown>;
}

/**
 * Espelha `SubscriptionDTO`.
 *
 * Dois pontos que o código legado errava:
 * - `cancelAtPeriodEnd` é `Instant` no backend, **não** booleano: quando
 *   preenchido, carrega a data do cancelamento agendado. O legado o tratava
 *   como flag (funcionava por acidente, pois string não vazia é truthy) e lia a
 *   data de um campo `cancelAt` que não existe no DTO.
 * - o nome do plano é `name`, não `planName`.
 */
export interface BillingSubscription {
  id?: string;
  /** `"Apple"` ou `"Stripe"` — define se a gestão é in-app ou na App Store. */
  platform?: string;
  customerId?: string;
  subscriptionId?: string;
  name?: string;
  created?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  /** Data do cancelamento agendado (ISO) ou ausente/nulo. */
  cancelAtPeriodEnd?: string | null;
  canceledAt?: string;
  endedAt?: string;
  deletedAt?: string;
  updatedAt?: string;
  priceId?: string;
  productId?: string;
  quantity?: number;
  interval?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

/** Espelha `InvoiceDTO`. */
export interface BillingInvoice {
  id?: string;
  created?: string;
  amountDue?: number;
  total?: number;
  status?: string;
  customerEmail?: string;
  /** URL do PDF/fatura hospedada. */
  downloadUrl?: string;
  periodStart?: string;
  periodEnd?: string;
  number?: string;
}

/**
 * Espelha `PriceSoftwareDTO`.
 *
 * O backend manda `features` como `Map<String,String>`, mas o catálogo real
 * traz a lista legível em `metadata.features_pt`, separada por `;` — é o que a
 * UI usa (`parsePlanFeatures`).
 */
export interface BillingPlan {
  priceId?: string;
  software?: string;
  name?: string;
  /** `month`, `year` ou nulo (plano gratuito). */
  recurring?: string | null;
  price?: number;
  metadata?: Record<string, string>;
  features?: Record<string, string>;
}

/** Linha da fatura simulada. */
export interface BillingInvoiceLine {
  description?: string;
  amount?: string;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Prévia da próxima fatura (`/subscription/simulate/{priceId}`).
 *
 * Promovida a model de verdade: no speak-ui era declarada inline dentro do
 * componente de confirmação. `nextInvoiceAmount` chega **já formatado** pelo
 * backend.
 */
export interface BillingSimulation {
  message?: string;
  nextInvoiceAmount?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
  trialEndDate?: string;
  invoiceLines?: BillingInvoiceLine[];
  activeUsers?: number;
  newPriceId?: string;
  /**
   * Presente quando o backend decide ir direto ao Checkout em vez de simular
   * (caso de primeira assinatura).
   */
  checkoutUrl?: string;
}

/** Resposta de criação/atualização/cancelamento. */
export interface BillingCheckoutResponse {
  checkoutUrl?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

/** Contadores de uso do produto. */
export interface BillingUsageCounters {
  activeProjectCount?: number;
  rootFolderCount?: number;
  boardCount?: number;
  totalStorageSize?: number;
  activeUserCount?: number;
}

/** Envelope paginado do endpoint de contadores. */
export interface BillingCountersResponse {
  data?: { content?: BillingUsageCounters[] };
}

/* ── Helpers de domínio ──────────────────────────────────────────────────── */

/** `true` quando a assinatura dá acesso (ativa ou em teste). */
export function isSubscriptionActive(subscription?: BillingSubscription | null): boolean {
  const status = subscription?.status?.toLowerCase();
  return status === 'active' || status === 'trialing';
}

/** `true` quando há cancelamento agendado para o fim do período. */
export function isCancelScheduled(subscription?: BillingSubscription | null): boolean {
  return !!subscription?.cancelAtPeriodEnd;
}

/** Data do cancelamento agendado, com fallback para o fim do período. */
export function cancelDate(subscription?: BillingSubscription | null): string | null {
  return subscription?.cancelAtPeriodEnd ?? subscription?.currentPeriodEnd ?? null;
}

/** `true` quando a assinatura foi comprada na App Store. */
export function isApplePlatform(subscription?: BillingSubscription | null): boolean {
  return (subscription?.platform ?? '').toLowerCase() === 'apple';
}

/** Lista legível de recursos do plano, a partir de `metadata.features_pt`. */
export function parsePlanFeatures(plan?: BillingPlan | null): string[] {
  const raw = plan?.metadata?.['features_pt'];
  if (raw) {
    return raw
      .split(';')
      .map(feature => feature.trim())
      .filter(feature => feature.length > 0);
  }

  const fromMap = Object.values(plan?.features ?? {});
  return fromMap.map(feature => String(feature).trim()).filter(feature => feature.length > 0);
}

export function isFreePlan(plan?: BillingPlan | null): boolean {
  return !plan?.price || plan.price === 0;
}

export function isAnnualPlan(plan?: BillingPlan | null): boolean {
  return plan?.recurring === 'year';
}

export function isPlanHighlighted(plan?: BillingPlan | null): boolean {
  const flag = plan?.metadata?.['most_popular'];
  return flag === 'true' || flag === '1';
}
