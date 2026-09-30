import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent, ToastService } from '@detrasoft.com/detra-ng';

import { BILLING_CONFIG } from '../../billing.config';
import { BillingApiService } from '../../services/billing-api.service';
import { BillingStore } from '../../services/billing.store';
import {
  BillingInvoiceLine,
  BillingPlan,
  BillingSimulation,
  parsePlanFeatures,
} from '../../models/billing.model';
import { formatCurrency, formatDate, toReadableError } from '../../utils/format.util';
import { BillingPageHeaderComponent } from '../shared/billing-page-header.component';
import { BillingStateComponent } from '../shared/billing-state.component';

/** Tempo de leitura da tela de sucesso antes de ir para o Stripe. */
const REDIRECT_DELAY_MS = 2500;

@Component({
  selector: 'dbl-subscription-confirmation',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BillingPageHeaderComponent, BillingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-confirmation.component.html',
  styleUrl: './subscription-confirmation.component.scss',
})
export class SubscriptionConfirmationComponent implements OnInit {
  private readonly api = inject(BillingApiService);
  readonly store = inject(BillingStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly config = inject(BILLING_CONFIG);

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly basePath = this.config.basePath;

  readonly priceId = signal<string | null>(null);
  readonly plan = signal<BillingPlan | null>(null);
  readonly simulation = signal<BillingSimulation | null>(null);
  readonly loading = signal(true);
  readonly confirming = signal(false);
  readonly redirecting = signal(false);
  readonly error = signal<string | null>(null);

  readonly isUpgrade = computed(() => this.store.hasSubscription());

  readonly features = computed(() => parsePlanFeatures(this.plan()).slice(0, 4));
  readonly extraFeatureCount = computed(() =>
    Math.max(0, parsePlanFeatures(this.plan()).length - 4),
  );

  readonly invoiceLines = computed<BillingInvoiceLine[]>(
    () => this.simulation()?.invoiceLines ?? [],
  );

  readonly hasTrial = computed(() => !!this.simulation()?.trialEndDate);

  /**
   * Total da próxima fatura.
   *
   * O backend já devolve `nextInvoiceAmount` **formatado**; quando falta,
   * caímos no preço do plano formatado localmente.
   */
  readonly totalLabel = computed(() => {
    const fromApi = this.simulation()?.nextInvoiceAmount;
    if (fromApi) return fromApi;
    return formatCurrency(this.plan()?.price, this.config.locale, this.config.currency);
  });

  /**
   * Resolve o plano pelo `:priceId` da rota.
   *
   * O legado guardava o plano apenas em memória no serviço; recarregar a página
   * ou abrir o link direto redirecionava o usuário de volta aos planos. Aqui a
   * rota é a fonte da verdade e o cache do store é só atalho.
   */
  ngOnInit(): void {
    const priceId = this.route.snapshot.paramMap.get('priceId');
    this.priceId.set(priceId);

    if (!priceId) {
      this.error.set('Nenhum plano selecionado.');
      this.loading.set(false);
      return;
    }

    this.store.ensureLoaded();

    const cached = this.store.selectedPlan();
    if (cached?.priceId === priceId) {
      this.plan.set(cached);
      this.loadSimulation(priceId);
      return;
    }

    const fromStore = this.store.planByPriceId(priceId);
    if (fromStore) {
      this.plan.set(fromStore);
      this.loadSimulation(priceId);
      return;
    }

    // Acesso direto/recarga: busca o catálogo antes de simular.
    this.store.loadPlans(true);
    this.resolvePlanWhenLoaded(priceId);
  }

  private resolvePlanWhenLoaded(priceId: string, attempt = 0): void {
    const plan = this.store.planByPriceId(priceId);

    if (plan) {
      this.plan.set(plan);
      this.loadSimulation(priceId);
      return;
    }

    if (this.store.loadingPlans() && attempt < 40) {
      setTimeout(() => this.resolvePlanWhenLoaded(priceId, attempt + 1), 150);
      return;
    }

    this.error.set('Não encontramos o plano selecionado. Volte e escolha novamente.');
    this.loading.set(false);
  }

  private loadSimulation(priceId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.simulate(priceId, this.store.activeUsers()).subscribe({
      next: simulation => {
        this.loading.set(false);

        // Primeira assinatura: o backend responde direto com o Checkout.
        // Diferente do legado, não redirecionamos sozinhos — quem decide é o
        // usuário, clicando em confirmar.
        this.simulation.set(simulation ?? null);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(toReadableError(err, 'Não foi possível calcular os valores do plano.'));
      },
    });
  }

  date(value?: string | null): string {
    return formatDate(value, this.config.locale);
  }

  planPriceLabel(): string {
    const plan = this.plan();
    if (!plan) return '—';
    const suffix = plan.recurring === 'year' ? '/ano' : '/mês';
    return `${formatCurrency(plan.price, this.config.locale, this.config.currency)}${suffix}`;
  }

  /** Confirma: troca de plano (PUT) ou primeira assinatura (POST). */
  confirm(): void {
    const priceId = this.priceId();
    if (!priceId || this.confirming()) return;

    // Checkout já resolvido na simulação — vai direto, sem nova chamada.
    const readyCheckoutUrl = this.simulation()?.checkoutUrl;
    if (readyCheckoutUrl) {
      this.redirectToCheckout(readyCheckoutUrl);
      return;
    }

    this.confirming.set(true);

    const request$ = this.isUpgrade()
      ? this.api.updateSubscription(priceId)
      : this.api.createSubscription(priceId);

    request$.subscribe({
      next: response => {
        this.confirming.set(false);

        if (response?.checkoutUrl) {
          this.redirectToCheckout(response.checkoutUrl);
          return;
        }

        // Troca de plano concluída no servidor, sem pagamento novo.
        this.toast.success('Assinatura atualizada com sucesso.');
        this.store.reload();
        void this.router.navigateByUrl(this.basePath);
      },
      error: (err: unknown) => {
        this.confirming.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível concluir a assinatura.'));
      },
    });
  }

  private redirectToCheckout(url: string): void {
    this.redirecting.set(true);
    setTimeout(() => {
      window.location.href = url;
    }, REDIRECT_DELAY_MS);
  }

  backToPlans(): void {
    void this.router.navigate([this.basePath, 'plans']);
  }
}
