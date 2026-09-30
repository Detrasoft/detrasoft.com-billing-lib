import { Injectable, NgZone, computed, inject, signal } from '@angular/core';

import { BILLING_CONFIG } from '../billing.config';
import { BillingApiService } from './billing-api.service';
import { BillingPlatformService } from './billing-platform.service';
import { AppleIapProduct } from '../models/apple-iap.model';

/**
 * Global injetado pelo `cordova-plugin-purchase` no runtime nativo.
 * Não existe no navegador, mesmo com o pacote instalado.
 */
declare const CdvPurchase: any;

/** Transação sem recibo mais velha que isto é encerrada para destravar a fila. */
const STALE_TRANSACTION_MS = 60 * 60 * 1000;

/**
 * Compras in-app da App Store.
 *
 * Porte do serviço do speak-ui, com três defeitos corrigidos:
 *
 * 1. o original abria um `setInterval` de 5s para renovar o access token a cada
 *    compra concluída, **sem guardar o handle e sem `clearInterval`** — um
 *    vazamento que renovava token pelo resto da sessão. Aqui é um disparo único,
 *    delegado ao callback `onPurchaseVerified` do app hospedeiro;
 * 2. não navega para rota nenhuma (o original tinha `/record`, do SpeakFy,
 *    cravado no serviço);
 * 3. o estado virou sinais, em vez de campos mutáveis lidos direto do template.
 *
 * Os IDs de produto vêm da `BillingConfig` — nada de `com.speakfy.*` fixo.
 */
@Injectable({ providedIn: 'root' })
export class AppleIapService {
  private readonly api = inject(BillingApiService);
  private readonly platform = inject(BillingPlatformService);
  private readonly config = inject(BILLING_CONFIG);
  private readonly zone = inject(NgZone);

  private readonly _products = signal<AppleIapProduct[]>([]);
  private readonly _loading = signal(false);
  private readonly _ready = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly products = this._products.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasFreeTrial = computed(() => this._products().some(product => product.hasFreeTrial));

  /** Chamado após um recibo ser validado no backend (para o app renovar o JWT). */
  onPurchaseVerified: (() => void) | null = null;

  private store: any = null;
  private initialized = false;
  private listenersReady = false;
  private processingTransaction = false;
  private readonly processedTransactions = new Set<string>();

  /** Idempotente: chamadas repetidas não reinicializam a loja. */
  initialize(): void {
    if (this.initialized) return;

    if (!this.platform.isIOS()) {
      this._loading.set(false);
      this._error.set('Compras in-app estão disponíveis apenas no aplicativo iOS.');
      return;
    }

    if (!this.platform.hasNativePurchasePlugin()) {
      this._loading.set(false);
      this._error.set('Recurso de compras indisponível nesta versão do aplicativo.');
      return;
    }

    if (this.config.appleProductIds.length === 0) {
      this._loading.set(false);
      this._error.set('Nenhum produto de assinatura configurado para este aplicativo.');
      return;
    }

    this.initialized = true;
    this._loading.set(true);
    this._error.set(null);
    this.store = CdvPurchase.store;

    this.registerProducts();
    if (!this.listenersReady) {
      this.registerListeners();
      this.listenersReady = true;
    }

    this.store
      .initialize([CdvPurchase.Platform.APPLE_APPSTORE])
      .catch((error: unknown) => this.failWith(error, 'Não foi possível conectar à App Store.'));
  }

  private registerProducts(): void {
    this.store.register(
      this.config.appleProductIds.map(id => ({
        id,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      })),
    );
  }

  private registerListeners(): void {
    // Todo callback do plugin vem de fora do Angular, por isso o `zone.run`.
    this.store.when().productUpdated(() => this.zone.run(() => this.syncProducts()));
    this.store.when().approved((transaction: any) => this.zone.run(() => this.onApproved(transaction)));
    this.store.when().finished(() => this.zone.run(() => this._loading.set(false)));

    this.store.ready(() =>
      this.zone.run(() => {
        this._ready.set(true);
        this._loading.set(false);
        this.syncProducts();
      }),
    );

    this.store.error((error: any) => this.zone.run(() => this.onStoreError(error)));
  }

  private syncProducts(): void {
    const products = this.config.appleProductIds
      .map(id => this.store?.get(id, CdvPurchase.Platform.APPLE_APPSTORE))
      .filter(Boolean)
      .map((product: any) => this.mapProduct(product));

    this._products.set(products);
  }

  /** Normaliza o payload da Apple, que varia entre versões do plugin. */
  private mapProduct(product: any): AppleIapProduct {
    const offer = product?.getOffer?.() ?? product?.offers?.[0] ?? null;
    const pricing = offer?.pricingPhases?.[0] ?? product?.pricing ?? null;
    const raw = product?.raw ?? {};

    const hasFreeTrial =
      raw?.introPricePaymentMode === 'FreeTrial' ||
      (offer?.pricingPhases ?? []).some(
        (phase: any) => Number(phase?.priceMicros) === 0 && !!phase?.billingPeriod,
      );

    const trialPhase = (offer?.pricingPhases ?? []).find(
      (phase: any) => Number(phase?.priceMicros) === 0,
    );

    return {
      id: product?.id ?? '',
      title: product?.title ?? raw?.title ?? '',
      description: product?.description ?? raw?.description ?? '',
      // Preço sempre o localizado pela App Store — nunca formatado aqui.
      price: pricing?.price ?? product?.price ?? raw?.price ?? '',
      priceMicros: pricing?.priceMicros ?? raw?.priceMicros,
      currency: pricing?.currency ?? product?.currency,
      billingPeriod: pricing?.billingPeriod ?? raw?.billingPeriod,
      hasFreeTrial,
      trialPeriod: trialPhase?.billingPeriod,
      owned: this.isOwned(product),
      canPurchase: !!product?.canPurchase,
    };
  }

  private isOwned(product: any): boolean {
    if (product?.owned) return true;
    if (product?.state === 'owned') return true;

    const id = product?.id;
    if (!id) return false;

    const verified = this.store?.verifiedPurchases ?? [];
    const local = this.store?.localTransactions ?? [];

    return (
      verified.some((purchase: any) => purchase?.id === id) ||
      local.some((transaction: any) =>
        (transaction?.products ?? []).some((item: any) => item?.id === id),
      )
    );
  }

  getProduct(productId: string): AppleIapProduct | null {
    return this._products().find(product => product.id === productId) ?? null;
  }

  /** Inicia a compra. A App Store cuida da UI de pagamento. */
  subscribe(productId: string): void {
    if (!this._ready() || !this.store) {
      this._error.set('A loja ainda não está pronta. Tente novamente em instantes.');
      return;
    }

    const product = this.store.get(productId, CdvPurchase.Platform.APPLE_APPSTORE);
    if (!product?.canPurchase) {
      this._error.set('Este produto não está disponível para compra agora.');
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    this.store.order(product.getOffer?.() ?? product);
  }

  /** Restaura compras — obrigatório pela diretriz 3.1.1 da Apple. */
  restore(): void {
    if (!this.store) {
      this._error.set('A loja não está disponível neste dispositivo.');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    this.store
      .restorePurchases()
      .then(() => this.zone.run(() => this._loading.set(false)))
      .catch((error: unknown) =>
        this.failWith(error, 'Não foi possível restaurar suas compras.'),
      );
  }

  /** Reinicia o fluxo após erro — o paywall usa isto no "tentar novamente". */
  retry(): void {
    this.initialized = false;
    this._ready.set(false);
    this._error.set(null);
    this.initialize();
  }

  /** Abre a gestão de assinaturas da App Store. */
  manageSubscriptions(): void {
    window.open('https://apps.apple.com/account/subscriptions', '_system');
  }

  /**
   * Valida o recibo no backend e só então encerra a transação — encerrar antes
   * perderia a compra caso a validação falhasse.
   */
  private onApproved(transaction: any): void {
    const transactionId = transaction?.transactionId ?? '';

    // Pseudo-transação do próprio app, emitida pelo plugin no boot.
    if (transactionId === 'appstore.application') {
      transaction?.finish?.();
      return;
    }

    if (this.processingTransaction || this.processedTransactions.has(transactionId)) return;

    const receipt = this.extractReceipt(transaction);
    if (!receipt) {
      // Sem recibo e antiga: encerra para não travar a fila indefinidamente.
      const purchaseTime = Number(transaction?.purchaseDate ?? 0);
      if (purchaseTime && Date.now() - purchaseTime > STALE_TRANSACTION_MS) {
        transaction?.finish?.();
      }
      return;
    }

    this.processingTransaction = true;
    this._loading.set(true);

    const productId = transaction?.products?.[0]?.id;

    this.api.verifyAppleReceipt(receipt, productId, transactionId || undefined).subscribe({
      next: status => {
        this.processingTransaction = false;
        this._loading.set(false);

        if (status?.active) {
          if (transactionId) this.processedTransactions.add(transactionId);
          transaction?.finish?.();
          this.syncProducts();
          // Disparo único — o app hospedeiro renova o JWT para refletir o plano.
          this.onPurchaseVerified?.();
        } else {
          this._error.set(
            status?.errorMessage ?? status?.message ?? 'Não foi possível validar sua compra.',
          );
        }
      },
      error: error => {
        this.processingTransaction = false;
        this.failWith(error, 'Não foi possível validar sua compra junto ao servidor.');
      },
    });
  }

  /** Quatro origens possíveis do recibo, na ordem de confiabilidade. */
  private extractReceipt(transaction: any): string | null {
    return (
      transaction?.parentReceipt?.nativeData?.appStoreReceipt ??
      transaction?.parentReceipt?.raw ??
      transaction?.nativeData?.appStoreReceipt ??
      this.store?.getApplicationReceipt?.() ??
      null
    );
  }

  private onStoreError(error: any): void {
    const code = String(error?.code ?? '');
    const message = String(error?.message ?? '').toLowerCase();

    // Cancelamento do usuário não é erro — não deve pintar a tela de vermelho.
    const userCancelled =
      message.includes('cancel') ||
      code === '6777001' ||
      code === 'E_USER_CANCELLED';

    this._loading.set(false);
    if (!userCancelled) {
      this._error.set(error?.message ?? 'Ocorreu um erro na comunicação com a App Store.');
    }
  }

  private failWith(error: unknown, fallback: string): void {
    this.zone.run(() => {
      this._loading.set(false);
      this._error.set((error as { message?: string })?.message ?? fallback);
    });
  }
}
