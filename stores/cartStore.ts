import { create } from 'zustand';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface CartItem {
  id: string;
  stoneId: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  cut?: string;
  polish?: string;
  symmetry?: string;
  totalPrice: number;
  pricePerCarat: number;
  supplierId: string;
  supplierName?: string;
  addedAt: number; // Timestamp for 1-hour expiry
}

interface CartState {
  items: CartItem[];
  loading: boolean;

  // Actions
  addToCart: (stone: CartItem) => Promise<void>;
  removeFromCart: (stoneId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
  checkExpiry: () => Promise<void>;

  // Computed
  totalItems: () => number;
  totalPrice: () => number;
  isInCart: (stoneId: string) => boolean;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  // Add item to cart
  addToCart: async (stone: CartItem) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Check stone availability from Firestore before adding
      const stoneDocRef = doc(db, 'stones', stone.id);
      const stoneDoc = await getDoc(stoneDocRef);

      if (!stoneDoc.exists()) {
        throw new Error('Bu taş bulunamadı');
      }

      const stoneData = stoneDoc.data();
      const availability = stoneData.availability || stoneData.status || 'available';

      if (availability !== 'available') {
        throw new Error('Bu taş artık müsait değil');
      }

      // Remove undefined values for Firestore
      const cleanItem: any = {
        id: stone.id,
        stoneId: stone.stoneId,
        carat: stone.carat,
        shape: stone.shape,
        color: stone.color,
        clarity: stone.clarity,
        totalPrice: stone.totalPrice,
        pricePerCarat: stone.pricePerCarat,
        supplierId: stone.supplierId,
        addedAt: Date.now(),
      };

      // Add optional fields only if they exist
      if (stone.cut) cleanItem.cut = stone.cut;
      if (stone.polish) cleanItem.polish = stone.polish;
      if (stone.symmetry) cleanItem.symmetry = stone.symmetry;
      if (stone.supplierName) cleanItem.supplierName = stone.supplierName;

      // Update local state
      set((state) => ({
        items: [...state.items, cleanItem],
      }));

      // Update Firestore
      const cartRef = doc(db, 'user_carts', user.uid);
      const cartDoc = await getDoc(cartRef);

      if (cartDoc.exists()) {
        await updateDoc(cartRef, {
          items: arrayUnion(cleanItem),
          updatedAt: Date.now(),
        });
      } else {
        await setDoc(cartRef, {
          userId: user.uid,
          items: [cleanItem],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Update stone's inCarts array
      const stoneRef = doc(db, 'stones', stone.id);
      await updateDoc(stoneRef, {
        inCarts: arrayUnion(user.uid),
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      // Rollback local state
      set((state) => ({
        items: state.items.filter(item => item.id !== stone.id),
      }));
      throw error;
    }
  },

  // Remove item from cart
  removeFromCart: async (stoneId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const item = get().items.find(i => i.id === stoneId);
      if (!item) return;

      // Update local state
      set((state) => ({
        items: state.items.filter(i => i.id !== stoneId),
      }));

      // Update Firestore
      const cartRef = doc(db, 'user_carts', user.uid);
      await updateDoc(cartRef, {
        items: arrayRemove(item),
        updatedAt: Date.now(),
      });

      // Update stone's inCarts array
      const stoneRef = doc(db, 'stones', stoneId);
      await updateDoc(stoneRef, {
        inCarts: arrayRemove(user.uid),
      });

    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Clear entire cart
  clearCart: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const items = get().items;

      // Update local state
      set({ items: [] });

      // Update Firestore
      const cartRef = doc(db, 'user_carts', user.uid);
      await updateDoc(cartRef, {
        items: [],
        updatedAt: Date.now(),
      });

      // Update all stones' inCarts arrays
      for (const item of items) {
        const stoneRef = doc(db, 'stones', item.id);
        await updateDoc(stoneRef, {
          inCarts: arrayRemove(user.uid),
        });
      }

    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },

  // Load cart from Firestore
  loadCart: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      set({ loading: true });

      const cartRef = doc(db, 'user_carts', user.uid);
      const cartDoc = await getDoc(cartRef);

      if (cartDoc.exists()) {
        const data = cartDoc.data();
        set({ items: data.items || [] });

        // Check expiry after loading
        await get().checkExpiry();
      } else {
        set({ items: [] });
      }

    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Check and remove expired items (1 hour)
  checkExpiry: async () => {
    const items = get().items;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const expiredItems = items.filter(item => (now - item.addedAt) > oneHour);

    if (expiredItems.length > 0) {
      console.log(`Removing ${expiredItems.length} expired items from cart`);

      for (const item of expiredItems) {
        await get().removeFromCart(item.id);
      }
    }
  },

  // Computed values
  totalItems: () => get().items.length,

  totalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
  },

  isInCart: (stoneId: string) => {
    return get().items.some(item => item.id === stoneId);
  },
}));
