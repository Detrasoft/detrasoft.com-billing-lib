import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent, ToastService } from '@detrasoft.com/detra-ng';

import { BILLING_CONFIG, buildBillingThemeStyles, resolveBillingThemeClass } from '../../billing.config';
import { BillingStore } from '../../services/billing.store';
import { BillingPlatformService } from '../../services/billing-platform.service';
import {
  BillingInvoice,
  cancelDate,
  isApplePlatform,
  isCancelScheduled,
  isSubscriptionActive,
} from '../../models/billing.model';
import {
  daysUntil,
  formatBytes,
  formatCurrency,
  formatDate,
  intervalLabel,
  usagePercent,
  usageSeverity,
} from '../../utils/format.util';
import { BillingStateComponent } from '../shared/billing-state.component';
import { BillingPageHeaderComponent } from '../shared/billing-page-header.component';

@Component({
  selector: 'dbl-billing-overview',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BillingPageHeaderComponent, BillingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-overview.component.html',
  styleUrl: './billing-overview.component.scss',
})
export class BillingOverviewComponent implements OnInit {
  readonly store = inject(BillingStore);
  private readonly platform = inject(BillingPlatformService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly config = inject(BILLING_CONFIG);

  readonly themeStyles = computed(() => buildBillingThemeStyles(this.config));
  readonly themeClass = computed(() => resolveBillingThemeClass(this.config));

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly labels = this.config.labels;
  readonly backPath = this.config.backPath;
  readonly basePath = this.config.basePath;

  /**
   * No iOS, assinatura comprada na App Store só pode ser gerenciada lá —
   * exigência da diretriz 3.1.1. Assinatura Stripe herdada (usuário antigo que
   * migrou para o app) continua gerenciável aqui.
   */
  readonly isIOS = this.platform.isIOS();

  readonly subscription = this.store.subscription;

  readonly isAppleManaged = computed(
    () => isApplePlatform(this.subscription()) || (this.isIOS && !this.subscription()),
  );

  readonly canManageInApp = computed(() => !this.isAppleManaged());
  readonly isActive = computed(() => isSubscriptionActive(this.subscription()));
  readonly cancelScheduled = computed(() => isCancelScheduled(this.subscription()));
  readonly cancelOn = computed(() => cancelDate(this.subscription()));
  readonly daysToCancel = computed(() => daysUntil(this.cancelOn()));

  readonly planName = computed(() => {
    const subscription = this.subscription();
    if (!subscription) return 'Plano gratuito';
    return subscription.name || 'Assinatura ativa';
  });

  readonly statusBadge = computed<{ label: string; tone: string }>(() => {
    const subscription = this.subscription();
    if (!subscription) return { label: 'Gratuito', tone: 'dbl-badge' };
    if (this.cancelScheduled()) return { label: 'Cancelamento agendado', tone: 'dbl-badge--danger' };

    switch ((subscription.status ?? '').toLowerCase()) {
      case 'active':
        return { label: 'Ativa', tone: 'dbl-badge--success' };
      case 'trialing':
        return { label: 'Período de teste', tone: 'dbl-badge--info' };
      case 'past_due':
        return { label: 'Pagamento pendente', tone: 'dbl-badge--warning' };
      case 'canceled':
        return { label: 'Cancelada', tone: 'dbl-badge--danger' };
      default:
        return { label: subscription.status ?? 'Indefinido', tone: 'dbl-badge' };
    }
  });

  readonly isTrialing = computed(
    () => (this.subscription()?.status ?? '').toLowerCase() === 'trialing',
  );

  /** Medidores de consumo — só quando o hospedeiro configurou os limites. */
  readonly usageMeters = computed(() => {
    const limits = this.config.usageLimits;
    const counters = this.store.counters();
    if (!limits || !counters) return [];

    const activeUsers = this.store.activeUsers();
    const storageLimit = limits.totalStorageSizePerUser
      ? limits.totalStorageSizePerUser * activeUsers
      : null;

    const meters = [
      { label: 'Projetos ativos', used: counters.activeProjectCount, limit: limits.activeProjectCount, format: 'number' as const },
      { label: 'Pastas de trabalho', used: counters.rootFolderCount, limit: limits.rootFolderCount, format: 'number' as const },
      { label: 'Boards', used: counters.boardCount, limit: limits.boardCount, format: 'number' as const },
      { label: 'Armazenamento', used: counters.totalStorageSize, limit: storageLimit, format: 'bytes' as const },
    ];

    return meters
      .filter(meter => !!meter.limit && meter.limit > 0)
      .map(meter => {
        const percent = usagePercent(meter.used, meter.limit);
        return {
          label: meter.label,
          percent,
          severity: usageSeverity(percent),
          usedLabel:
            meter.format === 'bytes' ? formatBytes(meter.used) : String(meter.used ?? 0),
          limitLabel:
            meter.format === 'bytes' ? formatBytes(meter.limit) : String(meter.limit ?? 0),
        };
      });
  });

  readonly hasUsageMeters = computed(() => this.usageMeters().length > 0);

  ngOnInit(): void {
    this.store.loadAll();
    this.store.loadPlans();
  }

  reload(): void {
    this.store.reload();
  }

  amountLabel(): string {
    const subscription = this.subscription();
    if (!subscription?.amount) return '—';
    const currency = subscription.currency?.toUpperCase() || this.config.currency;
    return `${formatCurrency(subscription.amount, this.config.locale, currency)} ${intervalLabel(subscription.interval)}`.trim();
  }

  date(value?: string | null): string {
    return formatDate(value, this.config.locale);
  }

  invoiceAmount(invoice: BillingInvoice): string {
    const currency = this.config.currency;
    return formatCurrency(invoice.total ?? invoice.amountDue, this.config.locale, currency);
  }

  invoiceLabel(invoice: BillingInvoice): string {
    if (invoice.number) return `Fatura ${invoice.number}`;
    if (invoice.periodStart || invoice.periodEnd) {
      return `${this.date(invoice.periodStart)} – ${this.date(invoice.periodEnd)}`;
    }
    return `Fatura de ${this.date(invoice.created)}`;
  }

  invoiceStatus(invoice: BillingInvoice): { label: string; tone: string } {
    switch ((invoice.status ?? '').toLowerCase()) {
      case 'paid':
        return { label: 'Paga', tone: 'dbl-badge--success' };
      case 'open':
        return { label: 'Em aberto', tone: 'dbl-badge--warning' };
      case 'void':
        return { label: 'Cancelada', tone: 'dbl-badge--danger' };
      case 'uncollectible':
        return { label: 'Não cobrável', tone: 'dbl-badge--danger' };
      case 'draft':
        return { label: 'Rascunho', tone: 'dbl-badge' };
      default:
        return { label: invoice.status ?? '—', tone: 'dbl-badge' };
    }
  }

  downloadInvoice(invoice: BillingInvoice): void {
    if (!invoice.downloadUrl) {
      this.toast.error('Esta fatura ainda não tem arquivo disponível para download.');
      return;
    }
    window.open(invoice.downloadUrl, '_blank');
  }

  goToPlans(): void {
    void this.router.navigate([this.basePath, 'plans']);
  }

  goToCancel(): void {
    void this.router.navigate([this.basePath, 'cancel']);
  }

  /** Gestão de assinatura da App Store, quando a compra foi feita por lá. */
  manageOnAppStore(): void {
    window.open('https://apps.apple.com/account/subscriptions', '_system');
  }
}
