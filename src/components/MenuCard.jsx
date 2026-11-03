import React from 'react';

export default function MenuCard({ item, qty, onTambah, onKurang, stock = 99 }) {
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isMaxReached = qty >= stock;

  return (
    <div className={`card ${isOutOfStock ? 'card-out-of-stock' : ''}`}>
      <div className="card-img-wrapper">
        <img src={item.gambar} alt={item.nama} loading="lazy" />
        {isOutOfStock && <div className="card-badge-soldout">❌ Stok Habis</div>}
        {isLowStock && !isOutOfStock && (
          <div className="card-badge-lowstock">⚠️ Sisa {stock} porsi</div>
        )}
      </div>

      <h3>{item.nama}</h3>
      <p className="card-price">Rp{item.harga.toLocaleString('id-ID')}</p>
      <p className="desc">{item.deskripsi}</p>

      {/* Stock status info */}
      <div className="card-stock-status">
        {isOutOfStock ? (
          <span className="stock-text-out">Habis di Dapur</span>
        ) : (
          <span className="stock-text-available">Tersedia: {stock} porsi</span>
        )}
      </div>

      <div className="qty-box">
        <button
          type="button"
          onClick={() => onKurang(item.id)}
          aria-label={`Kurangi ${item.nama}`}
          disabled={qty <= 0}
          style={{ opacity: qty > 0 ? 1 : 0.4, cursor: qty > 0 ? 'pointer' : 'not-allowed' }}
        >
          -
        </button>
        <span>{qty}</span>
        <button
          type="button"
          onClick={() => {
            if (!isMaxReached) {
              onTambah(item.id);
            } else {
              alert(`Maaf, stok ${item.nama} hanya tersisa ${stock} porsi.`);
            }
          }}
          aria-label={`Tambah ${item.nama}`}
          disabled={isOutOfStock || isMaxReached}
          style={{
            opacity: isOutOfStock || isMaxReached ? 0.4 : 1,
            cursor: isOutOfStock || isMaxReached ? 'not-allowed' : 'pointer',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
