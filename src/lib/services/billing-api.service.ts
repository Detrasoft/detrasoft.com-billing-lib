import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BILLING_CONFIG } from '../billing.config';
import {
  BillingAccount,
  BillingCheckoutResponse,
  BillingCountersResponse,
  BillingInvoice,
  BillingPlan,
  BillingSimulation,
  BillingSubscription,
  BillingUsageCounters,
} from '../models/billing.model';
import { AppleSubscriptionStatus } from '../models/apple-iap.model';

/**
 * Cliente HTTP do detrasoft-core-api para cobrança.
 *
 * Todos os paths são parametrizados por `config.software`, o que elimina o
 * segmento fixo (`task` / `speak`) que existia nas versões anteriores e permite
 * reaproveitar a lib em qualquer produto Detrasoft.
 */
@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(BILLING_CONFIG);

  /** `{base}/{path}/billing` */
  private get billingUrl(): string {
    return `${this.config.coreBaseUrl}${this.config.corePath}/billing`;
  }

  /**
   * `{base}/{path}/public` — **irmão** de `/billing`, não filho.
   *
   * O `PublicController` está mapeado em `/public`. A implementação anterior no
   * app montava `/billing/public/...`, que resultava em 404 e deixava a lista
   * de planos sempre vazia.
   */
  private get publicUrl(): string {
    return `${this.config.coreBaseUrl}${this.config.corePath}/public`;
  }

  getAccount(): Observable<BillingAccount> {
    return this.http.get<BillingAccount>(`${this.billingUrl}/${this.config.software}/account`);
  }

  /**
   * Assinatura ativa.
   *
   * Responde **404 quando não há assinatura** — situação esperada (conta no
   * plano gratuito), então convertemos para `null` em vez de propagar erro.
   */
  getActiveSubscription(): Observable<BillingSubscription | null> {
    return this.http
      .get<BillingSubscription>(`${this.billingUrl}/${this.config.software}/active-subscription`)
      .pipe(catchError(() => of(null)));
  }

  getInvoices(): Observable<BillingInvoice[]> {
    return this.http
      .get<BillingInvoice[]>(`${this.billingUrl}/stripe/${this.config.software}/invoices`)
      .pipe(map(invoices => invoices ?? []));
  }

  /** Catálogo público de planos. */
  getPlans(): Observable<BillingPlan[]> {
    return this.http
      .get<BillingPlan[]>(`${this.publicUrl}/stripe/${this.config.software}/plans`)
      .pipe(map(plans => plans ?? []));
  }

  /**
   * Contadores de uso do produto. Vive em outro microserviço, então só é
   * chamado quando `countersBaseUrl` foi configurado.
   */
  getCounters(): Observable<BillingUsageCounters | null> {
    if (!this.config.countersBaseUrl) return of(null);

    const url = `${this.config.countersBaseUrl}${this.config.countersPath}/search/counters`;
    return this.http
      .get<BillingCountersResponse>(url, { params: new HttpParams().set('unpaged', 'true') })
      .pipe(
        map(response => response?.data?.content?.[0] ?? null),
        catchError(() => of(null)),
      );
  }

  /**
   * Prévia da próxima fatura. Pode responder `checkoutUrl` em vez da simulação
   * quando o backend decide mandar direto ao Checkout.
   */
  simulate(priceId: string, activeUsers?: number | null): Observable<BillingSimulation> {
    let params = new HttpParams();
    if (activeUsers != null) params = params.set('activeUsers', String(activeUsers));

    return this.http.get<BillingSimulation>(
      `${this.billingUrl}/stripe/${this.config.software}/subscription/simulate/${priceId}`,
      { params },
    );
  }

  /** Primeira assinatura — devolve `checkoutUrl` do Stripe Checkout. */
  createSubscription(priceId: string): Observable<BillingCheckoutResponse> {
    return this.http.post<BillingCheckoutResponse>(
      `${this.billingUrl}/stripe/${this.config.software}/subscription/${priceId}`,
      {},
    );
  }

  /** Troca de plano em assinatura existente. */
  updateSubscription(priceId: string): Observable<BillingCheckoutResponse> {
    return this.http.put<BillingCheckoutResponse>(
      `${this.billingUrl}/stripe/${this.config.software}/subscription/${priceId}`,
      {},
    );
  }

  /** Agenda o cancelamento para o fim do período vigente. */
  cancelSubscription(): Observable<BillingCheckoutResponse> {
    return this.http.delete<BillingCheckoutResponse>(
      `${this.billingUrl}/stripe/${this.config.software}/cancel-subscription`,
    );
  }

  /** Valida o recibo da App Store e sincroniza a assinatura no backend. */
  verifyAppleReceipt(
    receipt: string,
    productId?: string,
    transactionId?: string,
  ): Observable<AppleSubscriptionStatus> {
    return this.http.post<AppleSubscriptionStatus>(`${this.billingUrl}/apple/verify`, {
      receipt,
      productId,
      transactionId,
    });
  }
}
