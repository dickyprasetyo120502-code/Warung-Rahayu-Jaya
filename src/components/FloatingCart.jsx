import React from 'react';

export default function FloatingCart({ totalQty, grandTotal }) {
  const isActive = totalQty > 0;

  const scrollToCart = (e) => {
    e.preventDefault();
    const cartEl = document.getElementById('cart');
    if (cartEl) {
      cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = 'cart';
    }
  };

  return (
    <aside
      className={`floating-cart ${isActive ? 'active' : ''}`}
      aria-label="Floating Cart"
    >
      <div className="floating-cart-info">
        <div className="floating-cart-count">
          🛒 <span>{totalQty}</span> Item Pesanan
        </div>
        <div className="floating-cart-total">
          Rp{grandTotal.toLocaleString('id-ID')}
        </div>
      </div>
      <button
        type="button"
        onClick={scrollToCart}
        className="floating-cart-btn"
      >
        Lihat Keranjang 🛍️
      </button>
    </aside>
  );
}
