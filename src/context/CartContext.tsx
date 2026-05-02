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
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  setDiscount: (amount: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      const qty = product.quantity || 1;
      
      // Normalize sellerId from farmerId if needed
      const normalizedProduct = { 
        ...product, 
        sellerId: product.sellerId || product.farmerId || 'default-seller' 
      };

      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...normalizedProduct, quantity: qty }];
    });
  };

  const removeFromCart = (id: string | number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string | number, delta: number) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 50 : 0;
  const total = subtotal + deliveryFee - discount;

  return (
    <CartContext.Provider value={{ 
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      subtotal, deliveryFee, discount, total, setDiscount 
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
