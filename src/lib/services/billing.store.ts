import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { BILLING_CONFIG } from '../billing.config';
import { BillingApiService } from './billing-api.service';
import {
  BillingAccount,
  BillingInvoice,
  BillingPlan,
  BillingSubscription,
  BillingUsageCounters,
  isCancelScheduled,
  isSubscriptionActive,
} from '../models/billing.model';

/**
 * Estado de cobrança compartilhado pelas telas da lib.
 *
 * Substitui o `AccountService` mutável do legado (campos públicos lidos direto
 * nos templates) por sinais somente-leitura. Diferenças que importam:
 *
 * - **não** faz auto-bootstrap no construtor: quem carrega é a tela, o que
 *   evita requisição de cobrança em quem nunca abre a área de assinatura;
 * - cada chamada tem `catchError` próprio, então uma falha isolada (faturas,
 *   por exemplo) não zera a tela inteira;
 * - `selectedPlan` existe apenas como cache de navegação — as telas resolvem o
 *   plano pelo `priceId` da rota, para sobreviver a recarga e link direto.
 */
@Injectable({ providedIn: 'root' })
export class BillingStore {
  private readonly api = inject(BillingApiService);
  private readonly config = inject(BILLING_CONFIG);

  private readonly _account = signal<BillingAccount | null>(null);
  private readonly _subscription = signal<BillingSubscription | null>(null);
  private readonly _invoices = signal<BillingInvoice[]>([]);
  private readonly _plans = signal<BillingPlan[]>([]);
  private readonly _counters = signal<BillingUsageCounters | null>(null);
  private readonly _selectedPlan = signal<BillingPlan | null>(null);

  private readonly _loading = signal(false);
  private readonly _loadingPlans = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly account = this._account.asReadonly();
  readonly subscription = this._subscription.asReadonly();
  readonly invoices = this._invoices.asReadonly();
  readonly plans = this._plans.asReadonly();
  readonly counters = this._counters.asReadonly();
  readonly selectedPlan = this._selectedPlan.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingPlans = this._loadingPlans.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasSubscription = computed(() => !!this._subscription());
  readonly isActive = computed(() => isSubscriptionActive(this._subscription()));
  readonly isCancelScheduled = computed(() => isCancelScheduled(this._subscription()));

  readonly accountName = computed(() => {
    const account = this._account();
    if (!account) return 'Conta';
    const full = `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim();
    return full || account.companyName || account.email || 'Conta';
  });

  /** Usuários ativos: contador do produto, com fallback no `customFields`. */
  readonly activeUsers = computed(() => {
    const fromCounters = this._counters()?.activeUserCount;
    if (typeof fromCounters === 'number' && fromCounters > 0) return fromCounters;

    const raw = this._account()?.customFields?.['activeUsers'];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });

  /** Planos do intervalo pedido, mantendo gratuitos/sem recorrência nos dois. */
  plansByInterval(interval: 'month' | 'year'): BillingPlan[] {
    return this._plans().filter(
      plan => plan.recurring === interval || plan.recurring == null || plan.price === 0,
    );
  }

  planByPriceId(priceId: string | null | undefined): BillingPlan | null {
    if (!priceId) return null;
    return this._plans().find(plan => plan.priceId === priceId) ?? null;
  }

  selectPlan(plan: BillingPlan | null): void {
    this._selectedPlan.set(plan);
  }

  /** Carrega tudo o que a tela de conta precisa. */
  loadAll(): void {
    this._loading.set(true);
    this._error.set(null);

    forkJoin({
      account: this.api.getAccount().pipe(catchError(() => of(null))),
      subscription: this.api.getActiveSubscription().pipe(catchError(() => of(null))),
      invoices: this.api.getInvoices().pipe(catchError(() => of([] as BillingInvoice[]))),
      counters: this.api.getCounters().pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: result => {
          this._account.set(result.account);
          this._subscription.set(result.subscription);
          this._invoices.set(result.invoices);
          this._counters.set(result.counters);
          this._loaded.set(true);

          // A conta é o único dado indispensável: sem ela a tela não tem o que
          // mostrar, então esse é o único caso tratado como erro de página.
          if (!result.account) {
            this._error.set('Não foi possível carregar os dados da sua conta.');
          }
        },
        error: () => {
          this._error.set('Não foi possível carregar os dados de cobrança.');
        },
      });
  }

  /** Carrega o catálogo de planos (cacheado: só busca uma vez). */
  loadPlans(force = false): void {
    if (!force && this._plans().length > 0) return;

    this._loadingPlans.set(true);
    this.api
      .getPlans()
      .pipe(finalize(() => this._loadingPlans.set(false)))
      .subscribe({
        next: plans => this._plans.set(this.sortPlans(plans)),
        error: () => this._plans.set([]),
      });
  }

  /** Garante conta + assinatura carregadas, sem refazer o que já existe. */
  ensureLoaded(): void {
    if (!this._loaded() && !this._loading()) this.loadAll();
  }

  /** Recarrega tudo — usado após confirmar ou cancelar assinatura. */
  reload(): void {
    this.loadAll();
    this.loadPlans(true);
  }

  patchSubscription(patch: Partial<BillingSubscription>): void {
    const current = this._subscription();
    if (current) this._subscription.set({ ...current, ...patch });
  }

  /** Ordena pelo `metadata.sort` quando existir; senão, pelo preço. */
  private sortPlans(plans: BillingPlan[]): BillingPlan[] {
    return [...plans].sort((a, b) => {
      const sortA = Number(a.metadata?.['sort'] ?? Number.NaN);
      const sortB = Number(b.metadata?.['sort'] ?? Number.NaN);
      if (Number.isFinite(sortA) && Number.isFinite(sortB)) return sortA - sortB;
      return (a.price ?? 0) - (b.price ?? 0);
    });
  }

  get software(): string {
    return this.config.software;
  }
}
