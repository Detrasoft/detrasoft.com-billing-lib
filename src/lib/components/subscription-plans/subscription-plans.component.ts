import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent, ToastService } from '@detrasoft.com/detra-ng';

import { BILLING_CONFIG } from '../../billing.config';
import { BillingStore } from '../../services/billing.store';
import { BillingPlatformService } from '../../services/billing-platform.service';
import {
  BillingPlan,
  isApplePlatform,
  isFreePlan,
  isPlanHighlighted,
  parsePlanFeatures,
} from '../../models/billing.model';
import { formatCurrency } from '../../utils/format.util';
import { BillingPageHeaderComponent } from '../shared/billing-page-header.component';
import { BillingStateComponent } from '../shared/billing-state.component';

type BillingInterval = 'month' | 'year';

@Component({
  selector: 'dbl-subscription-plans',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BillingPageHeaderComponent, BillingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-plans.component.html',
  styleUrl: './subscription-plans.component.scss',
})
export class SubscriptionPlansComponent implements OnInit {
  readonly store = inject(BillingStore);
  private readonly platform = inject(BillingPlatformService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly config = inject(BILLING_CONFIG);

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly labels = this.config.labels;
  readonly basePath = this.config.basePath;

  /** Anual é o padrão: é o ciclo com melhor custo-benefício. */
  readonly interval = signal<BillingInterval>('year');

  readonly visiblePlans = computed(() => this.store.plansByInterval(this.interval()));

  readonly isLoading = computed(
    () => this.store.loadingPlans() && this.store.plans().length === 0,
  );

  readonly isEmpty = computed(
    () => !this.store.loadingPlans() && this.visiblePlans().length === 0,
  );

  /**
   * No iOS com assinatura da App Store a troca de plano acontece lá — aqui a
   * tela fica em modo consulta, sem CTA de compra (diretriz 3.1.1 da Apple).
   */
  readonly isAppleManaged = computed(
    () => this.platform.isIOS() && isApplePlatform(this.store.subscription()),
  );

  /** Economia percentual do anual sobre o mensal, quando dá para comparar. */
  readonly annualSavings = computed(() => {
    const monthly = this.store
      .plansByInterval('month')
      .find(plan => !isFreePlan(plan) && (plan.price ?? 0) > 0);
    const annual = this.store
      .plansByInterval('year')
      .find(plan => !isFreePlan(plan) && (plan.price ?? 0) > 0);

    if (!monthly?.price || !annual?.price) return 0;

    const yearOnMonthly = monthly.price * 12;
    if (yearOnMonthly <= 0 || annual.price >= yearOnMonthly) return 0;

    return Math.round(((yearOnMonthly - annual.price) / yearOnMonthly) * 100);
  });

  ngOnInit(): void {
    this.store.loadPlans();
    this.store.ensureLoaded();
  }

  setInterval(interval: BillingInterval): void {
    this.interval.set(interval);
  }

  reloadPlans(): void {
    this.store.loadPlans(true);
  }

  isCurrent(plan: BillingPlan): boolean {
    const priceId = this.store.subscription()?.priceId;
    return !!priceId && priceId === plan.priceId;
  }

  isFree(plan: BillingPlan): boolean {
    return isFreePlan(plan);
  }

  isHighlighted(plan: BillingPlan): boolean {
    return isPlanHighlighted(plan);
  }

  features(plan: BillingPlan): string[] {
    return parsePlanFeatures(plan);
  }

  /** Preço principal do card. No anual, mostra o equivalente mensal. */
  priceLabel(plan: BillingPlan): string {
    if (this.isFree(plan)) return 'Gratuito';

    const price = plan.price ?? 0;
    const isAnnual = plan.recurring === 'year';
    const amount = isAnnual ? price / 12 : price;

    return formatCurrency(amount, this.config.locale, this.config.currency);
  }

  priceSuffix(plan: BillingPlan): string {
    return this.isFree(plan) ? '' : '/mês';
  }

  /** Linha secundária do anual, com o total cobrado de uma vez. */
  priceFootnote(plan: BillingPlan): string {
    if (this.isFree(plan) || plan.recurring !== 'year') return '';
    const total = formatCurrency(plan.price, this.config.locale, this.config.currency);
    return `${total} cobrados anualmente`;
  }

  ctaLabel(plan: BillingPlan): string {
    if (this.isCurrent(plan)) return 'Plano atual';
    if (this.isFree(plan)) return 'Plano gratuito';
    return this.store.hasSubscription() ? 'Alterar para este plano' : 'Assinar';
  }

  isCtaDisabled(plan: BillingPlan): boolean {
    return this.isCurrent(plan) || this.isFree(plan) || !plan.priceId;
  }

  /** Descrição contextual: o primeiro card lista o básico, os seguintes somam. */
  featuresIntro(index: number): string {
    return index === 0 ? 'Recursos incluídos:' : 'Tudo do plano anterior, mais:';
  }

  /**
   * Segue para a confirmação levando o `priceId` **na rota**.
   *
   * O legado passava o plano só por estado em memória no serviço, então
   * recarregar a página ou abrir o link direto expulsava o usuário de volta.
   */
  selectPlan(plan: BillingPlan): void {
    if (!plan.priceId || this.isCtaDisabled(plan)) return;

    if (this.isCurrent(plan)) {
      this.toast.info('Você já está neste plano.');
      return;
    }

    this.store.selectPlan(plan);
    void this.router.navigate([this.basePath, 'plans', plan.priceId, 'confirm']);
  }

  manageOnAppStore(): void {
    window.open('https://apps.apple.com/account/subscriptions', '_system');
  }
}
