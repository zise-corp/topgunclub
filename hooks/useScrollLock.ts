'use client';
import { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Bloquea el scroll del fondo mientras hay un panel abierto (carrito, menú…).
// Usa un contador compartido: si dos paneles están abiertos a la vez, cerrar
// uno no debe liberar el scroll mientras el otro siga abierto.
// ─────────────────────────────────────────────────────────────────────────────

let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lock() {
  if (lockCount === 0) {
    const { body } = document;
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    // Al ocultar la barra de scroll el contenido se corre; lo compensamos.
    const barWidth = window.innerWidth - document.documentElement.clientWidth;
    if (barWidth > 0) body.style.paddingRight = `${barWidth}px`;
    body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
