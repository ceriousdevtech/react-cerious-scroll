import { useState } from 'react';
import { CeriousScroll } from '@ceriousdevtech/react-cerious-scroll';

import { makeProduct, SHOP_TOTAL, stars } from './shop.data';
import './shop.css';

export function EcommerceDemo() {
  const [cart, setCart] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number) => {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="demo-page">
      <div className="demo-page__header">
        <h1>🛍️ Product Catalog</h1>
        <p>{SHOP_TOTAL.toLocaleString()} products with ratings and add-to-cart.</p>
      </div>

      <div className="demo-toolbar">
        <span className="stat">
          🛒 Cart: <strong>{cart.size}</strong> item{cart.size === 1 ? '' : 's'}
        </span>
        <span className="spacer" />
        <button type="button" onClick={() => setCart(new Set())} disabled={cart.size === 0}>
          Clear cart
        </button>
      </div>

      <CeriousScroll
        className="demo-scroll shop-scroll"
        totalElements={SHOP_TOTAL}
        getItem={(i) => i}
        renderItem={(i) => {
          const p = makeProduct(i);
          const inCart = cart.has(i);
          return (
            <div className="product">
              <div className="product__img" style={{ background: p.gradient }}>
                {p.emoji}
              </div>
              <div className="product__body">
                <div className="product__name">{p.name}</div>
                <div className="product__cat">{p.category}</div>
                <div className="product__rating">
                  {stars(p.rating)} <small>{p.rating.toFixed(1)} · {p.reviews.toLocaleString()} reviews</small>
                </div>
              </div>
              <div className="product__aside">
                <div className="product__price">${p.price.toFixed(2)}</div>
                {p.prime && <div className="product__prime">✓ Prime</div>}
                {!p.inStock ? (
                  <div className="product__stock">Out of stock</div>
                ) : (
                  <button
                    type="button"
                    className={`product__add${inCart ? ' in-cart' : ''}`}
                    onClick={() => toggle(i)}
                  >
                    {inCart ? 'In cart ✓' : 'Add to cart'}
                  </button>
                )}
              </div>
            </div>
          );
        }}
      />

      <div className="demo-footer">
        <span>
          In cart: <strong>{cart.size}</strong>
        </span>
        <span>Click “Add to cart” on any product</span>
      </div>
    </div>
  );
}
