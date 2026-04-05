/**
 * Nomes dos eventos Socket.io — alinhe o backend (servidor io.emit) a estes nomes
 * ou ajuste aqui para coincidir com o que o OxenteExpress_Backend emite.
 */
export const SOCKET_EVENTS = {
  /** Loja: novo pedido — payload opcional (ex.: { orderId }) */
  STORE_NEW_ORDER: "store_new_order",
  /** Entregador: pacotes READY / lista atualizada */
  RIDER_PACKAGES_UPDATED: "rider_packages_updated",
  /** Cliente: mudança de status do pedido — payload: { orderId, status } ou vazio para forçar refetch */
  CUSTOMER_ORDER_STATUS: "customer_order_status",
} as const;

/** Alias comuns — o cliente escuta todos em conjunto com STORE_NEW_ORDER / RIDER_PACKAGES_UPDATED */
export const STORE_ORDER_ALIASES = ["new_order", "store:new-order"] as const;
export const RIDER_PACKAGE_ALIASES = ["package_ready", "rider:new-package"] as const;
export const CUSTOMER_ORDER_ALIASES = ["order_status_update", "customer:order-update"] as const;

/** Bipe curto para notificar a loja (pode falhar em autoplay; ignoramos o erro). */
export function playNotificationBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* noop */
  }
}
