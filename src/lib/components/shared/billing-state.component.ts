import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Estados de carregamento, vazio e erro das telas de cobrança.
 *
 * Duplicado em relação à `@detrasoft.com/web-auth` pelo mesmo motivo do
 * cabeçalho: nenhuma dependência cruzada entre as libs.
 */
@Component({
  selector: 'dbl-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (mode()) {
      @case ('loading') {
        <section class="dbl-state" aria-busy="true" [attr.aria-label]="loadingLabel()">
          @if (spinner()) {
            <div class="dbl-state__spinner">
              <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
              <p>{{ loadingLabel() }}</p>
            </div>
          } @else {
            <span class="dbl-state__skeleton"></span>
            <span class="dbl-state__skeleton"></span>
            <span class="dbl-state__skeleton dbl-state__skeleton--short"></span>
          }
        </section>
      }
      @case ('empty') {
        <section class="dbl-state dbl-state__box" aria-live="polite">
          @if (icon()) {
            <i class="dbl-state__icon" [class]="icon()" aria-hidden="true"></i>
          }
          <h2>{{ title() || 'Nada por aqui ainda' }}</h2>
          @if (message()) {
            <p>{{ message() }}</p>
          }
          <ng-content select="[state-actions]" />
        </section>
      }
      @case ('error') {
        <section class="dbl-state dbl-state__box" role="alert">
          <i class="dbl-state__icon fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <h2>{{ title() || 'Não foi possível carregar esta área' }}</h2>
          @if (message()) {
            <p>{{ message() }}</p>
          }
          @if (showRetry()) {
            <button type="button" class="dbl-state__retry" (click)="retry.emit()">
              Tentar novamente
            </button>
          }
          <ng-content select="[state-actions]" />
        </section>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dbl-state {
        display: grid;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--dbl-surface, #ffffff);
        border-radius: var(--dbl-radius-lg, 20px);
        box-shadow: var(--dbl-shadow, 0 10px 30px rgba(0, 0, 0, 0.08));
        border: 1px solid var(--dbl-border, transparent);
        backdrop-filter: var(--dbl-backdrop-blur, none);
        -webkit-backdrop-filter: var(--dbl-backdrop-blur, none);
      }

      .dbl-state__box {
        justify-items: center;
        text-align: center;
        padding: 2.5rem 1.5rem;
      }

      .dbl-state__spinner {
        display: grid;
        gap: 0.85rem;
        justify-items: center;
        padding: 2rem 1rem;
        font-size: 1.5rem;
        color: var(--dbl-primary, #3B82F6);
      }

      .dbl-state__spinner p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--dbl-text-muted, #6b6483);
      }

      .dbl-state__icon {
        font-size: 1.75rem;
        color: var(--dbl-primary, #3B82F6);
      }

      .dbl-state[role="alert"] .dbl-state__icon,
      .dbl-state__box[role="alert"] .dbl-state__icon {
        color: var(--dbl-warning, #F59E0B);
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--dbl-text, #2a2440);
      }

      p {
        margin: 0;
        max-width: 46ch;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--dbl-text-muted, #6b6483);
      }

      .dbl-state__skeleton {
        display: block;
        height: 1rem;
        border-radius: 999px;
        background: linear-gradient(
          90deg,
          var(--dbl-skeleton-from, #ece8f8) 0%,
          var(--dbl-skeleton-mid, #f7f5fd) 50%,
          var(--dbl-skeleton-to, #ece8f8) 100%
        );
        background-size: 200% 100%;
        animation: dbl-shimmer 1.3s linear infinite;
      }

      .dbl-state__skeleton--short {
        width: 60%;
      }

      .dbl-state__retry {
        justify-self: center;
        min-height: 42px;
        padding: 0.65rem 1.4rem;
        border: 0;
        cursor: pointer;
        font-family: inherit;
        font-weight: 700;
        font-size: 0.9rem;
        border-radius: var(--dbl-button-radius, var(--dbl-radius-md, 14px));
        color: var(--dbl-on-primary, #ffffff);
        background: var(--dbl-brand-gradient, var(--dbl-primary, #3B82F6));
        box-shadow: var(--dbl-button-shadow, 0 4px 14px color-mix(in srgb, var(--dbl-primary, #3B82F6) 32%, transparent));
        transition: transform var(--dbl-transition, 180ms ease), filter 180ms ease, box-shadow 180ms ease;
      }

      .dbl-state__retry:hover {
        transform: translateY(-1.5px);
        filter: brightness(1.08);
      }

      @keyframes dbl-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dbl-state__skeleton,
        .fa-spin {
          animation: none;
        }
      }
    `,
  ],
})
export class BillingStateComponent {
  readonly mode = input<'loading' | 'empty' | 'error'>('loading');
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly icon = input<string>('');
  readonly loadingLabel = input<string>('Carregando');
  readonly spinner = input<boolean>(false);
  readonly showRetry = input<boolean>(true);
  readonly retry = output<void>();
}
