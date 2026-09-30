import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Detecção de plataforma da lib.
 *
 * Própria de propósito: uma lib publicável não pode depender do
 * `PlatformService` do app hospedeiro. O Capacitor é peer dependency.
 */
@Injectable({ providedIn: 'root' })
export class BillingPlatformService {
  getPlatform(): string {
    try {
      return Capacitor.getPlatform();
    } catch {
      return 'web';
    }
  }

  isIOS(): boolean {
    return this.getPlatform() === 'ios';
  }

  isAndroid(): boolean {
    return this.getPlatform() === 'android';
  }

  isWeb(): boolean {
    return this.getPlatform() === 'web';
  }

  isNative(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * `true` quando o plugin de compras nativo está disponível.
   *
   * O `cordova-plugin-purchase` expõe um **global** (`CdvPurchase`) injetado
   * pelo runtime nativo — ele não existe no navegador nem que o pacote esteja
   * instalado. Por isso a verificação é em tempo de execução, e não pela
   * presença da dependência.
   */
  hasNativePurchasePlugin(): boolean {
    return typeof (globalThis as Record<string, unknown>)['CdvPurchase'] !== 'undefined';
  }

  /** `true` quando o fluxo de compra precisa passar pela App Store. */
  requiresAppleIap(): boolean {
    return this.isIOS();
  }
}
