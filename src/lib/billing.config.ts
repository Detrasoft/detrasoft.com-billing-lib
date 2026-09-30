import { InjectionToken, Provider } from '@angular/core';

/** Limites de uso de um plano de entrada, exibidos como medidores de consumo. */
export interface BillingUsageLimits {
  /** Projetos ativos. */
  activeProjectCount?: number;
  /** Pastas raiz / workspaces. */
  rootFolderCount?: number;
  /** Boards. */
  boardCount?: number;
  /** Armazenamento em bytes — multiplicado pelo nº de usuários ativos. */
  totalStorageSizePerUser?: number;
}

export interface BillingLabels {
  overviewTitle: string;
  overviewEyebrow: string;
  overviewDescription: string;
  plansTitle: string;
  plansDescription: string;
}

export interface BillingConfig {
  /**
   * URL base do detrasoft-core-api, sem o path da API.
   * No DutFy: `environment.apiURLDetrasoft`.
   */
  coreBaseUrl: string;

  /** Path da API de billing no gateway. Padrão: `/detrasoft-core-api`. */
  corePath?: string;

  /**
   * Identificador do produto usado nos endpoints (`/billing/{software}/account`).
   * DutFy: `task`. SpeakFy: `speak`.
   */
  software: string;

  /**
   * Base dos contadores de uso. Fica noutro microserviço (o do produto), por
   * isso é separado. Omitir desativa o card de consumo.
   * No DutFy: `environment.apiURLGateway`.
   */
  countersBaseUrl?: string;

  /** Path do serviço de contadores. Ex.: `/task-api`. */
  countersPath?: string;

  /**
   * Limites do plano de entrada para os medidores de consumo. Omitir esconde
   * os medidores — melhor do que exibir número errado, já que a fonte de
   * verdade das cotas é o backend.
   */
  usageLimits?: BillingUsageLimits;

  /** Rota onde `BILLING_ROUTES` foi montada. Padrão: `/settings/account`. */
  basePath?: string;

  /** Rota do botão "voltar" da tela raiz. Padrão: `/settings`. */
  backPath?: string;

  /** IDs dos produtos de assinatura da App Store (obrigatório no iOS). */
  appleProductIds?: string[];

  /** URL da política de privacidade — exigida pela diretriz 3.1.2 da Apple. */
  privacyPolicyUrl?: string;

  /** Locale para moeda e datas. Padrão: `pt-BR`. */
  locale?: string;

  /** Moeda padrão quando a API não informa. Padrão: `BRL`. */
  currency?: string;

  /** Tema visual das telas ('auto' | 'light' | 'dark' | 'glass'). Padrão: 'auto'. */
  theme?: 'auto' | 'light' | 'dark' | 'glass';

  /** Cor de destaque principal (ex.: '#3B82F6', '#D946EF'). */
  brandColor?: string;

  /** Gradiente da marca (ex.: 'linear-gradient(135deg, #FF655B, #D946EF)'). */
  brandGradient?: string;

  /** Cor do texto sobre a cor principal. Padrão: '#ffffff'. */
  onBrandColor?: string;

  /** Raio das bordas dos cards (ex.: '16px', '24px'). */
  cardRadius?: string;

  /** Cor de fundo do card (ex.: '#131926', 'rgba(255, 255, 255, 0.78)'). */
  cardBackground?: string;

  /** Borda do card (ex.: '1px solid #1E293B', '1px solid rgba(255, 255, 255, 0.12)'). */
  cardBorder?: string;

  /** Sombra customizada do card. */
  cardBoxShadow?: string;

  /** Desfoque de fundo do card para glassmorphism (ex.: '16px'). */
  cardBackdropBlur?: string;

  /** Cor de fundo para seções e cards secundários (ex.: '#0B0F17'). */
  surfaceSunken?: string;

  /** Cor principal do texto (ex.: '#F8FAFC'). */
  textColor?: string;

  /** Cor secundária do texto (ex.: '#94A3B8'). */
  textMutedColor?: string;

  /** Transforma os botões primários em pílula completa. Padrão: false. */
  buttonPill?: boolean;

  /** Sombra customizada do botão de ação. */
  buttonBoxShadow?: string;

  /** Classe CSS customizada opcional inserida na raiz das páginas de billing. */
  customClass?: string;

  labels?: Partial<BillingLabels>;
}

export type ResolvedBillingConfig = Omit<
  Required<BillingConfig>,
  'labels' | 'usageLimits' | 'countersBaseUrl' | 'countersPath' | 'appleProductIds'
> & {
  labels: BillingLabels;
  usageLimits: BillingUsageLimits | null;
  countersBaseUrl: string | null;
  countersPath: string;
  appleProductIds: string[];
};

export const BILLING_DEFAULT_LABELS: BillingLabels = {
  overviewTitle: 'Conta & assinatura',
  overviewEyebrow: 'Conta',
  overviewDescription:
    'Veja o plano atual, acompanhe o uso do workspace e gerencie a cobrança.',
  plansTitle: 'Escolha seu plano',
  plansDescription: 'Compare os planos e mude quando quiser. Sem contrato de fidelidade.',
};

export const BILLING_CONFIG = new InjectionToken<ResolvedBillingConfig>('BILLING_CONFIG');

export function resolveBillingConfig(config: BillingConfig): ResolvedBillingConfig {
  return {
    coreBaseUrl: config.coreBaseUrl,
    corePath: config.corePath ?? '/detrasoft-core-api',
    software: config.software,
    countersBaseUrl: config.countersBaseUrl ?? null,
    countersPath: config.countersPath ?? '',
    usageLimits: config.usageLimits ?? null,
    basePath: config.basePath ?? '/settings/account',
    backPath: config.backPath ?? '/settings',
    appleProductIds: config.appleProductIds ?? [],
    privacyPolicyUrl: config.privacyPolicyUrl ?? '',
    locale: config.locale ?? 'pt-BR',
    currency: config.currency ?? 'BRL',
    theme: config.theme ?? 'auto',
    brandColor: config.brandColor ?? '',
    brandGradient: config.brandGradient ?? '',
    onBrandColor: config.onBrandColor ?? '#ffffff',
    cardRadius: config.cardRadius ?? '',
    cardBackground: config.cardBackground ?? '',
    cardBorder: config.cardBorder ?? '',
    cardBoxShadow: config.cardBoxShadow ?? '',
    cardBackdropBlur: config.cardBackdropBlur ?? '',
    surfaceSunken: config.surfaceSunken ?? '',
    textColor: config.textColor ?? '',
    textMutedColor: config.textMutedColor ?? '',
    buttonPill: config.buttonPill ?? false,
    buttonBoxShadow: config.buttonBoxShadow ?? '',
    customClass: config.customClass ?? '',
    labels: { ...BILLING_DEFAULT_LABELS, ...config.labels },
  };
}

/**
 * Constrói o mapa de variáveis CSS a partir da configuração de tema informada.
 * Aplicado nos contêineres `.dbl-page` para customização em tempo de execução.
 */
export function buildBillingThemeStyles(config: ResolvedBillingConfig): Record<string, string> {
  const styles: Record<string, string> = {};

  if (config.theme === 'dark') {
    styles['--dbl-surface'] = config.cardBackground || '#131926';
    styles['--dbl-surface-sunken'] = config.surfaceSunken || '#0B0F17';
    styles['--dbl-border'] = config.cardBorder || '#1E293B';
    styles['--dbl-text'] = config.textColor || '#F8FAFC';
    styles['--dbl-text-muted'] = config.textMutedColor || '#94A3B8';
    styles['--dbl-text-soft'] = '#64748B';
    styles['--dbl-shadow'] = config.cardBoxShadow || '0 10px 30px rgba(0, 0, 0, 0.4)';
  } else if (config.theme === 'light') {
    styles['--dbl-surface'] = config.cardBackground || '#ffffff';
    styles['--dbl-surface-sunken'] = config.surfaceSunken || '#f3f0fb';
    styles['--dbl-border'] = config.cardBorder || 'rgba(137, 111, 244, 0.14)';
    styles['--dbl-text'] = config.textColor || '#2a2440';
    styles['--dbl-text-muted'] = config.textMutedColor || '#6b6483';
    styles['--dbl-shadow'] = config.cardBoxShadow || '0 10px 30px rgba(42, 36, 64, 0.08)';
  } else if (config.theme === 'glass') {
    styles['--dbl-surface'] = config.cardBackground || 'rgba(255, 255, 255, 0.78)';
    styles['--dbl-surface-sunken'] = config.surfaceSunken || 'rgba(255, 255, 255, 0.4)';
    styles['--dbl-border'] = config.cardBorder || 'rgba(255, 255, 255, 0.65)';
    styles['--dbl-backdrop-blur'] = config.cardBackdropBlur || 'blur(16px)';
  }

  // Sobrescritas explícitas
  if (config.cardBackground) styles['--dbl-surface'] = config.cardBackground;
  if (config.surfaceSunken) styles['--dbl-surface-sunken'] = config.surfaceSunken;
  if (config.cardBorder) styles['--dbl-border'] = config.cardBorder;
  if (config.cardRadius) styles['--dbl-radius-lg'] = config.cardRadius;
  if (config.cardBoxShadow) styles['--dbl-shadow'] = config.cardBoxShadow;
  if (config.cardBackdropBlur) styles['--dbl-backdrop-blur'] = config.cardBackdropBlur;
  if (config.textColor) styles['--dbl-text'] = config.textColor;
  if (config.textMutedColor) styles['--dbl-text-muted'] = config.textMutedColor;
  if (config.onBrandColor) styles['--dbl-on-primary'] = config.onBrandColor;

  if (config.brandColor) {
    styles['--dbl-primary'] = config.brandColor;
    styles['--dbl-primary-strong'] = config.brandColor;
    styles['--dbl-primary-hover'] = config.brandColor;
    styles['--dbl-primary-soft'] = `color-mix(in srgb, ${config.brandColor} 14%, transparent)`;
  }
  if (config.brandGradient) {
    styles['--dbl-brand-gradient'] = config.brandGradient;
  }
  if (config.buttonPill) {
    styles['--dbl-button-radius'] = '9999px';
  }
  if (config.buttonBoxShadow) {
    styles['--dbl-button-shadow'] = config.buttonBoxShadow;
  }

  return styles;
}

export function resolveBillingThemeClass(config: ResolvedBillingConfig): string {
  const classes: string[] = [];
  if (config.theme && config.theme !== 'auto') {
    classes.push(`dbl-theme-${config.theme}`);
  }
  if (config.customClass) {
    classes.push(config.customClass);
  }
  return classes.join(' ');
}

/**
 * Registra a `@detrasoft.com/billing` no app hospedeiro.
 *
 * ```ts
 * providers: [
 *   provideBilling({
 *     coreBaseUrl: environment.apiURLDetrasoft,
 *     software: 'task',
 *     countersBaseUrl: environment.apiURLGateway,
 *     countersPath: '/task-api',
 *   }),
 * ]
 * ```
 */
export function provideBilling(config: BillingConfig): Provider {
  return {
    provide: BILLING_CONFIG,
    useValue: resolveBillingConfig(config),
  };
}
