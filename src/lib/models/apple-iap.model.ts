/**
 * Models do In-App Purchase da Apple.
 *
 * `AppleReceiptVerifyRequest` / `AppleSubscriptionStatusResponse` espelham os
 * DTOs do detrasoft-core-api (`/billing/apple/verify`).
 */

/** Corpo de `POST /billing/apple/verify`. `receipt` é obrigatório no backend. */
export interface AppleReceiptVerifyRequest {
  receipt: string;
  productId?: string;
  transactionId?: string;
}

/** Resposta de `POST /billing/apple/verify`. */
export interface AppleSubscriptionStatus {
  active: boolean;
  /** `FREE`, `PRO` ou `PREMIUM`. */
  plan?: string;
  productId?: string;
  originalTransactionId?: string;
  expiresAt?: string;
  inTrialPeriod?: boolean;
  autoRenewEnabled?: boolean;
  environment?: string;
  message?: string;
  errorMessage?: string;
  errorCode?: string;
}

/**
 * Produto de assinatura normalizado a partir do payload do
 * `cordova-plugin-purchase`.
 *
 * A Apple já devolve preço e descrição localizados — nunca formatamos preço de
 * IAP no cliente, é exigência da App Store exibir exatamente o que ela informa.
 */
export interface AppleIapProduct {
  id: string;
  title: string;
  description: string;
  /** Preço localizado pela App Store (ex.: `R$ 29,90`). */
  price: string;
  /** Valor em micros, quando disponível — só para ordenar/comparar. */
  priceMicros?: number;
  currency?: string;
  /** `P1M`, `P1Y`, … */
  billingPeriod?: string;
  hasFreeTrial: boolean;
  trialPeriod?: string;
  owned: boolean;
  canPurchase: boolean;
}

/** Estado exposto pelo serviço de IAP para a tela de paywall. */
export interface AppleIapState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  products: AppleIapProduct[];
}

/** `true` quando o produto é anual, pelo período ou pelo id. */
export function isAnnualProduct(product?: AppleIapProduct | null): boolean {
  if (!product) return false;
  if (product.billingPeriod) return product.billingPeriod.toUpperCase().includes('Y');
  return /annual|year|anual/i.test(product.id);
}

export function isMonthlyProduct(product?: AppleIapProduct | null): boolean {
  if (!product) return false;
  if (product.billingPeriod) return product.billingPeriod.toUpperCase().includes('M');
  return /month|mensal/i.test(product.id);
}
