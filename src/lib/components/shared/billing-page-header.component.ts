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
        box-shadow: var(--dbl-shadow, 0 10px 30px rgba(0, 0, 0, 0.08));
        border: 1px solid var(--dbl-border, transparent);
        backdrop-filter: var(--dbl-backdrop-blur, none);
        -webkit-backdrop-filter: var(--dbl-backdrop-blur, none);
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
        border: 1px solid var(--dbl-border, transparent);
        cursor: pointer;
        border-radius: var(--dbl-button-radius, var(--dbl-radius-md, 12px));
        background: var(--dbl-primary-soft, rgba(59, 130, 246, 0.12));
        color: var(--dbl-primary, var(--dbl-primary-strong, #3B82F6));
        transition: transform var(--dbl-transition, 180ms ease), background var(--dbl-transition, 180ms ease);
      }

      .dbl-header__back:hover {
        transform: translateX(-2px);
        filter: brightness(1.06);
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
        color: var(--dbl-primary, var(--dbl-primary-strong, #3B82F6));
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
