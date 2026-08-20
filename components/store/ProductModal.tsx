'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatPrice } from '@/lib/store-types';
import type { ProductDTO } from '@/lib/store-types';
import { waLink } from '@/lib/site';
import Icon from '@/components/Icon';
import { useCart } from './CartContext';

// ─────────────────────────────────────────────────────────────────────────────
// Modal de detalle de producto: galería, especificaciones, carrito y WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  product: ProductDTO;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    setQty(1);
    setAdded(false);
    setActiveImg(0);
  }, [product.id]);

  const specs: Record<string, string> = {};
  if (product.kind === 'arma') {
    if (product.brand) specs['Industria'] = product.brand;
    if (product.caliber) specs['Calibre'] = product.caliber;
    if (product.firearmType) specs['Tipo'] = product.firearmType;
  }
  Object.entries(product.specs).forEach(([k, v]) => {
    if (!specs[k]) specs[k] = v;
  });

  const handleAdd = (q: number) => {
    add(product, q);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const waMessage = `Hola! Quiero consultar por *${product.name}* (${
    product.category.name
  }) — ${formatPrice(product.price, product.currency)}.\n${window.location.origin}/tienda`;

  return (
    <div className="store-modal" role="dialog" aria-modal="true" aria-label={product.name} data-native-cursor>
      <button type="button" className="store-modal__backdrop" onClick={onClose} aria-label="Cerrar" />
      <div className="store-modal__panel">
        <button type="button" className="store-modal__close" onClick={onClose} aria-label="Cerrar detalle">
          <Icon name="close" style={{ width: 20, height: 20 }} />
        </button>

        <div className="store-modal__gallery">
          {product.images.length > 0 ? (
            <>
              <div className="store-modal__main">
                <Image
                  src={product.images[activeImg].url}
                  alt={product.images[activeImg].alt ?? product.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 45vw"
                  style={{ objectFit: 'contain', background: '#0d0f0e' }}
                  unoptimized
                />
              </div>
              {product.images.length > 1 && (
                <div className="store-modal__thumbs">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      className={'store-modal__thumb' + (i === activeImg ? ' active' : '')}
                      onClick={() => setActiveImg(i)}
                      aria-label={`Imagen ${i + 1}`}
                    >
                      <Image src={img.url} alt="" fill sizes="64px" style={{ objectFit: 'cover' }} unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="store-modal__main">
              <span className="store-card__placeholder" style={{ position: 'absolute', inset: 0 }}>
                <Icon name="image" style={{ width: 48, height: 48, opacity: 0.35 }} />
                <small>Sin imagen</small>
              </span>
            </div>
          )}
        </div>

        <div className="store-modal__info">
          <span className="store-modal__cat">{product.category.name}</span>
          <h3 className="store-modal__title">{product.name}</h3>

          <p className="store-modal__price">{formatPrice(product.price, product.currency)}</p>

          {product.description && <p className="store-modal__desc">{product.description}</p>}

          {Object.keys(specs).length > 0 && (
            <div className="store-modal__specs">
              {Object.entries(specs).map(([k, v]) => (
                <div key={k} className="store-modal__spec">
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          )}

          <div className="store-modal__buy">
            <div className="store-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
                <Icon name="minus" style={{ width: 14, height: 14 }} />
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Más">
                <Icon name="plus" style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <button type="button" className="btn btn--wa store-modal__add" onClick={() => handleAdd(qty)}>
              <Icon name="cart" style={{ width: 17, height: 17 }} />
              {added ? '¡Agregado!' : 'Agregar al carrito'}
            </button>
          </div>

          <a
            href={waLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn--block"
            style={{ marginTop: 12 }}
          >
            <Icon name="whatsapp" style={{ width: 17, height: 17 }} />
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
