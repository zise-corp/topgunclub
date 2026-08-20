// Estados de un pedido — compartido entre el resumen y la gestión de pedidos.

export const STATUS_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const STATUS_ORDER = ['recibido', 'en_proceso', 'completado', 'cancelado'] as const;
