import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { OrderItemInput } from '../schemas/order.schema';
import { MENU_CATEGORIES } from '../data/menuData';

interface CartContextType {
  cart: Record<string, number>;
  cartItems: OrderItemInput[];
  totalQty: number;
  grandTotal: number;
  orderType: 'dine-in' | 'take-away';
  setOrderType: (type: 'dine-in' | 'take-away') => void;
  addItem: (id: string, maxStock?: number) => boolean;
  removeItem: (id: string) => void;
  resetCart: (confirm?: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<'dine-in' | 'take-away'>('dine-in');

  // Lookup map menu
  const allItemsMap = useMemo(() => {
    const map = new Map<string, any>();
    MENU_CATEGORIES.forEach((category) => {
      category.items.forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, []);

  const addItem = (id: string, maxStock: number = 99): boolean => {
    const currentQty = cart[id] || 0;
    if (currentQty >= maxStock) {
      alert(`Maaf, stok item ini hanya tersisa ${maxStock} porsi.`);
      return false;
    }
    setCart((prev) => ({
      ...prev,
      [id]: currentQty + 1,
    }));
    return true;
  };

  const removeItem = (id: string) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };

  const resetCart = (confirm: boolean = true) => {
    if (Object.keys(cart).length === 0) return;
    if (!confirm || window.confirm('Apakah Anda yakin ingin membatalkan dan mengosongkan semua pesanan?')) {
      setCart({});
    }
  };

  const { cartItems, totalQty, grandTotal } = useMemo(() => {
    const items: OrderItemInput[] = [];
    let qtySum = 0;
    let totalSum = 0;

    Object.entries(cart).forEach(([id, qty]) => {
      if (qty > 0 && allItemsMap.has(id)) {
        const item = allItemsMap.get(id);
        items.push({
          id: item.id,
          nama: item.nama,
          harga: item.harga,
          qty,
          gambar: item.gambar,
        });
        qtySum += qty;
        totalSum += item.harga * qty;
      }
    });

    return {
      cartItems: items,
      totalQty: qtySum,
      grandTotal: totalSum,
    };
  }, [cart, allItemsMap]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        totalQty,
        grandTotal,
        orderType,
        setOrderType,
        addItem,
        removeItem,
        resetCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart harus digunakan di dalam CartProvider');
  }
  return context;
};

