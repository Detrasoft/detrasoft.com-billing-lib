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
    labels: { ...BILLING_DEFAULT_LABELS, ...config.labels },
  };
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
