/**
 * Formatação de moeda, data e ciclo de cobrança.
 *
 * O locale e a moeda vêm da `BillingConfig` — no legado estavam fixos em
 * `pt-BR`/`BRL` espalhados por vários componentes, além de `R$` escrito
 * diretamente nos templates.
 */

export function formatCurrency(
  value: number | null | undefined,
  locale: string,
  currency: string,
): string {
  const amount = typeof value === 'number' ? value : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Rótulo do intervalo de cobrança. */
export function intervalLabel(interval?: string | null): string {
  switch ((interval ?? '').toLowerCase()) {
    case 'month':
      return 'por mês';
    case 'year':
      return 'por ano';
    case 'week':
      return 'por semana';
    case 'day':
      return 'por dia';
    default:
      return '';
  }
}

/** Dias restantes até a data informada (nunca negativo). */
export function daysUntil(value?: string | null): number {
  if (!value) return 0;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return 0;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** Bytes em unidade legível. */
export function formatBytes(bytes?: number | null): string {
  const value = bytes ?? 0;
  if (value <= 0) return '0 MB';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const size = value / 1024 ** index;
  return `${size.toFixed(size >= 10 || index <= 1 ? 0 : 1)} ${units[index]}`;
}

/** Percentual de consumo, limitado a 100. */
export function usagePercent(used?: number | null, limit?: number | null): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round(((used ?? 0) / limit) * 100));
}

/** Severidade do medidor de consumo, nos mesmos cortes do legado. */
export function usageSeverity(percent: number): 'ok' | 'warning' | 'danger' {
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warning';
  return 'ok';
}

/** Mensagem legível para erros de HTTP ou de negócio. */
export function toReadableError(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  const candidate = error as {
    error?: { detail?: string; title?: string; message?: string };
    message?: string;
    status?: number;
  };

  if (candidate?.error?.detail) return candidate.error.detail;
  if (candidate?.error?.message) return candidate.error.message;
  if (candidate?.error?.title) return candidate.error.title;
  if (candidate?.status === 0) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (candidate?.status === 403) return 'Você não tem permissão para executar esta ação.';
  if (candidate?.message) return candidate.message;

  return fallback;
}
