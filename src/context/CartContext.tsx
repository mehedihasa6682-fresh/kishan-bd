import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

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
  selectedWeight?: number; // The specific weight/qty selected for weight-based products
  pricingType?: 'weight' | 'piece';
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any, selectedWeight?: number) => void;
  removeFromCart: (id: string | number, selectedWeight?: number) => void;
  updateQuantity: (id: string | number, newQty: number, selectedWeight?: number) => void;
  getItemQuantity: (id: string | number, selectedWeight?: number) => number;
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
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any, selectedWeight?: number) => {
    setItems(prev => {
      // Find if this specific product + weight combination exists
      const existing = prev.find(i => 
        i.id === product.id && i.selectedWeight === selectedWeight
      );
      
      const qty = product.quantity || 1;
      
      const rawPrice = product.discountPrice ?? product.price ?? 0;
      const basePrice = parseFloat(String(rawPrice).replace(/[^\d.-]/g, '')) || 0;
      
      // Calculate price based on selected weight if applicable
      let finalPrice = basePrice;
      if (product.pricingType === 'weight' && selectedWeight) {
        // Assume basePrice is per 1000g (1KG) if not specified otherwise, or use product's logic
        // The user says "৳60 Per KG", so if 250g is selected, price is (60 / 1000) * 250 = 15
        finalPrice = (basePrice / 1000) * selectedWeight;
      }
      
      const normalizedProduct = { 
        ...product, 
        sellerId: product.sellerId || product.farmerId || 'default-seller',
        price: finalPrice,
        selectedWeight: selectedWeight ?? null
      };

      if (existing) {
        return prev.map(i => (i.id === product.id && i.selectedWeight === selectedWeight) ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...normalizedProduct, quantity: qty }];
    });

    // Clear existing timer if any
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    // Show checkout toast for 2 seconds
    setShowCheckoutToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowCheckoutToast(false);
      toastTimerRef.current = null;
    }, 2000);
  };

  const updateQuantity = (id: string | number, newQty: number, selectedWeight?: number) => {
    if (newQty <= 0) {
      removeFromCart(id, selectedWeight);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.id === id && i.selectedWeight === selectedWeight) {
          return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const getItemQuantity = (id: string | number, selectedWeight?: number) => {
    return items.find(i => i.id === id && i.selectedWeight === selectedWeight)?.quantity || 0;
  };

  const removeFromCart = (id: string | number, selectedWeight?: number) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.selectedWeight === selectedWeight)));
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
      items, addToCart, removeFromCart, updateQuantity, getItemQuantity, clearCart,
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
