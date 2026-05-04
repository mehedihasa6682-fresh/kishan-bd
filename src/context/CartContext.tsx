import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  image: string;
  farmer?: string;
  sellerId?: string;
  minWeight?: number;
  weightIncrements?: number;
  enableWeightSystem?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  discount: number;
  total: number;
  setDiscount: (amount: number) => void;
  showCheckoutToast: boolean;
  setShowCheckoutToast: (val: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(50); // Default fee
  const [showCheckoutToast, setShowCheckoutToast] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      const qty = product.quantity || product.minWeight || 1;
      
      // Normalize sellerId from farmerId if needed
      const price = parseFloat(String(product.discountPrice || product.price || 0));
      const normalizedProduct = { 
        ...product, 
        sellerId: product.sellerId || product.farmerId || 'default-seller',
        price: price
      };

      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...normalizedProduct, quantity: qty }];
    });

    // Show checkout toast for 5 seconds
    setShowCheckoutToast(true);
    setTimeout(() => {
      setShowCheckoutToast(false);
    }, 5000);
  };

  const removeFromCart = (id: string | number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string | number, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => {
    setItems([]);
    setDeliveryFee(50);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0) || 0;
  const currentFee = items.length > 0 ? deliveryFee : 0;
  const total = (subtotal + currentFee - discount) || 0;

  return (
    <CartContext.Provider value={{ 
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      subtotal, deliveryFee: currentFee, setDeliveryFee, discount, total, setDiscount,
      showCheckoutToast, setShowCheckoutToast
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
