import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Cabeçalho das telas de cobrança.
 *
 * Duplicado em relação à `@detrasoft.com/web-auth` de propósito: cada pacote
 * precisa ser instalável isoladamente, sem dependência cruzada entre libs.
 * A aparência acompanha o hospedeiro pelos tokens `--dbl-*` (ver README).
 */
@Component({
  selector: 'dbl-page-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dbl-header">
      <div class="dbl-header__head">
        @if (backLink()) {
          <button type="button" class="dbl-header__back" (click)="back()" aria-label="Voltar">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          </button>
        }
        <div class="dbl-header__copy">
          @if (eyebrow()) {
            <span class="dbl-header__eyebrow">{{ eyebrow() }}</span>
          }
          <h1>{{ title() }}</h1>
        </div>
        @if (hasActions()) {
          <div class="dbl-header__actions">
            <ng-content select="[header-actions]" />
          </div>
        }
      </div>
      @if (description()) {
        <p class="dbl-header__desc">{{ description() }}</p>
      }
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dbl-header {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 1.25rem 1.5rem;
        background: var(--dbl-surface, #ffffff);
        border-radius: var(--dbl-radius-lg, 20px);
        box-shadow: var(--dbl-shadow, 0 10px 30px rgba(42, 36, 64, 0.08));
      }

      .dbl-header__head {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .dbl-header__back {
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        cursor: pointer;
        border-radius: 12px;
        background: var(--dbl-primary-soft, rgba(137, 111, 244, 0.1));
        color: var(--dbl-primary-strong, #5b44b0);
        transition: transform var(--dbl-transition, 180ms ease);
      }

      .dbl-header__back:hover {
        transform: translateX(-2px);
      }

      .dbl-header__copy {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .dbl-header__eyebrow {
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--dbl-primary-strong, #5b44b0);
      }

      h1 {
        margin: 0;
        font-size: clamp(1.35rem, 4vw, 2.2rem);
        font-weight: 800;
        line-height: 1.15;
        color: var(--dbl-text, #2a2440);
      }

      .dbl-header__actions {
        margin-left: auto;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .dbl-header__desc {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--dbl-text-muted, #6b6483);
      }

      @media (max-width: 767px) {
        .dbl-header {
          padding: 1rem 0.85rem;
          border-radius: var(--dbl-radius-md, 16px);
        }

        .dbl-header__back {
          width: 36px;
          height: 36px;
        }
      }
    `,
  ],
})
export class BillingPageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly eyebrow = input<string>('');
  readonly backLink = input<string>('');
  readonly hasActions = input<boolean>(false);

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  back(): void {
    if (history.length > 1) {
      this.location.back();
      return;
    }
    const target = this.backLink();
    if (target) void this.router.navigateByUrl(target);
  }
}
