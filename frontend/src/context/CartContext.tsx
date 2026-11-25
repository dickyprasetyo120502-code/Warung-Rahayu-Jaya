import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { OrderItemInput } from '../schemas/order.schema';
import { getMenuCategories, MenuCategory } from '../data/menuData';

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
  editingOrder: any | null;
  startEditingOrder: (order: any) => void;
  cancelEditingOrder: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<MenuCategory[]>(getMenuCategories());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<'dine-in' | 'take-away'>('dine-in');
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  useEffect(() => {
    const handleMenuChange = () => {
      setCategories(getMenuCategories());
    };
    window.addEventListener('wrj_menu_updated', handleMenuChange);
    return () => window.removeEventListener('wrj_menu_updated', handleMenuChange);
  }, []);

  const allItemsMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach((category) => {
      category.items.forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, [categories]);

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
    if (Object.keys(cart).length === 0 && !editingOrder) return;
    if (!confirm || window.confirm('Apakah Anda yakin ingin membatalkan dan mengosongkan semua pesanan?')) {
      setCart({});
      setEditingOrder(null);
    }
  };

  const startEditingOrder = (order: any) => {
    const newCart: Record<string, number> = {};
    if (Array.isArray(order.cartItems)) {
      order.cartItems.forEach((it: any) => {
        newCart[it.id] = (newCart[it.id] || 0) + (it.qty || 1);
      });
    }
    setCart(newCart);
    if (order.orderType === 'dine-in' || order.orderType === 'take-away') {
      setOrderType(order.orderType);
    }
    setEditingOrder(order);
  };

  const cancelEditingOrder = () => {
    setCart({});
    setEditingOrder(null);
  };

  const { cartItems, totalQty, grandTotal } = useMemo(() => {
    const items: OrderItemInput[] = [];
    let qtySum = 0;
    let totalSum = 0;

    Object.entries(cart).forEach(([id, qty]) => {
      if (qty > 0) {
        const item = allItemsMap.get(id);
        if (item) {
          items.push({
            id: item.id,
            nama: item.nama,
            harga: item.harga,
            qty,
            gambar: item.gambar,
          });
          qtySum += qty;
          totalSum += item.harga * qty;
        } else {
          items.push({
            id,
            nama: id,
            harga: 0,
            qty,
          });
          qtySum += qty;
        }
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
        editingOrder,
        startEditingOrder,
        cancelEditingOrder,
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

