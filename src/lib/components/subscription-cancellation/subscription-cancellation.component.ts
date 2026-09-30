import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent, ToastService } from '@detrasoft.com/detra-ng';

import { BILLING_CONFIG } from '../../billing.config';
import { BillingApiService } from '../../services/billing-api.service';
import { BillingStore } from '../../services/billing.store';
import { cancelDate } from '../../models/billing.model';
import { formatDate, toReadableError } from '../../utils/format.util';
import { BillingPageHeaderComponent } from '../shared/billing-page-header.component';
import { BillingStateComponent } from '../shared/billing-state.component';

@Component({
  selector: 'dbl-subscription-cancellation',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BillingPageHeaderComponent, BillingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-cancellation.component.html',
  styleUrl: './subscription-cancellation.component.scss',
})
export class SubscriptionCancellationComponent implements OnInit {
  private readonly api = inject(BillingApiService);
  readonly store = inject(BillingStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly config = inject(BILLING_CONFIG);

  readonly showHeader = input(true, {
    transform: (v: unknown) => (v === undefined || v === null || v === '' ? true : v !== false && v !== 'false'),
  });
  readonly basePath = this.config.basePath;

  readonly cancelling = signal(false);
  readonly confirmed = signal(false);

  readonly subscription = this.store.subscription;

  readonly planName = computed(() => this.subscription()?.name || 'Assinatura');
  readonly cancelOn = computed(() => cancelDate(this.subscription()));

  ngOnInit(): void {
    this.store.ensureLoaded();
  }

  date(value?: string | null): string {
    return formatDate(value, this.config.locale);
  }

  /** Marca a confirmação como lida — habilita o botão de confirmar. */
  toggleConfirmation(checked: boolean): void {
    this.confirmed.set(checked);
  }

  cancel(): void {
    if (!this.confirmed() || this.cancelling()) return;

    this.cancelling.set(true);

    this.api.cancelSubscription().subscribe({
      next: () => {
        this.cancelling.set(false);
        this.toast.success('Assinatura cancelada. Você mantém acesso até o fim do período pago.');
        this.store.reload();
        void this.router.navigateByUrl(this.basePath);
      },
      error: (err: unknown) => {
        this.cancelling.set(false);
        this.toast.error(toReadableError(err, 'Não foi possível cancelar a assinatura.'));
      },
    });
  }

  back(): void {
    void this.router.navigateByUrl(this.basePath);
  }
}
