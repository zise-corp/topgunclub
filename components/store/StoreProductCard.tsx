'use client';
import Image from 'next/image';
import { formatPrice } from '@/lib/store-types';
import type { ProductDTO } from '@/lib/store-types';
import Icon from '@/components/Icon';
import { useCart } from './CartContext';

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta de producto de la tienda
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  product: ProductDTO;
  onOpen: (product: ProductDTO) => void;
}

export default function StoreProductCard({ product, onOpen }: Props) {
  const { add } = useCart();
  const image = product.images[0];

  const specChips: { label: string; value: string }[] = [];
  if (product.kind === 'arma') {
    if (product.brand) specChips.push({ label: 'Industria', value: product.brand });
    if (product.caliber) specChips.push({ label: 'Calibre', value: product.caliber });
    if (product.firearmType) specChips.push({ label: 'Tipo', value: product.firearmType });
  }

  return (
    <article className="store-card reveal">
      <button
        type="button"
        className="store-card__img"
        onClick={() => onOpen(product)}
        aria-label={`Ver detalles de ${product.name}`}
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <span className="store-card__placeholder">
            <Icon name="image" style={{ width: 42, height: 42, opacity: 0.35 }} />
            <small>Sin imagen</small>
          </span>
        )}
        <span className="store-card__cat">{product.category.name}</span>
        {product.featured && (
          <span className="store-card__badge">
            <Icon name="star" style={{ width: 13, height: 13 }} /> Destacado
          </span>
        )}
      </button>

      <div className="store-card__body">
        <button type="button" className="store-card__name" onClick={() => onOpen(product)}>
          {product.name}
        </button>

        {specChips.length > 0 && (
          <div className="store-card__specs">
            {specChips.map((s) => (
              <span key={s.label} className="store-chip">
                {s.value}
              </span>
            ))}
          </div>
        )}

        <div className="store-card__foot">
          <span className="store-price">{formatPrice(product.price, product.currency)}</span>
          <button
            type="button"
            className="btn btn--wa store-add"
            onClick={(e) => {
              e.stopPropagation();
              add(product, 1);
            }}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <Icon name="cart" style={{ width: 16, height: 16 }} />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
