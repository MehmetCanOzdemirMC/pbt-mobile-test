import { create } from 'zustand';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface FavoriteStone {
  id: string;
  stoneId: string;
  carat: number;
  shape: string;
  color: string;
  clarity: string;
  totalPrice: number;
  pricePerCarat: number;
  supplierId: string;
  supplierName?: string;
  addedAt: number;
}

interface FavoritesState {
  favorites: FavoriteStone[];
  loading: boolean;

  // Actions
  addToFavorites: (stone: FavoriteStone) => Promise<void>;
  removeFromFavorites: (stoneId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;

  // Computed
  totalFavorites: () => number;
  isFavorite: (stoneId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,

  // Add stone to favorites
  addToFavorites: async (stone: FavoriteStone) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const favoriteItem = {
        id: stone.id,
        stoneId: stone.stoneId,
        carat: stone.carat,
        shape: stone.shape,
        color: stone.color,
        clarity: stone.clarity,
        totalPrice: stone.totalPrice,
        pricePerCarat: stone.pricePerCarat,
        supplierId: stone.supplierId,
        supplierName: stone.supplierName,
        addedAt: Date.now(),
      };

      // Save to Firestore
      const favoritesRef = doc(db, 'favorites', user.uid);
      const favoritesDoc = await getDoc(favoritesRef);

      if (favoritesDoc.exists()) {
        await updateDoc(favoritesRef, {
          items: arrayUnion(favoriteItem),
        });
      } else {
        await setDoc(favoritesRef, {
          userId: user.uid,
          items: [favoriteItem],
        });
      }

      // Update local state
      set((state) => ({
        favorites: [...state.favorites, favoriteItem],
      }));
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  // Remove stone from favorites
  removeFromFavorites: async (stoneId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { favorites } = get();
      const itemToRemove = favorites.find((item) => item.id === stoneId);

      if (!itemToRemove) return;

      // Remove from Firestore
      const favoritesRef = doc(db, 'favorites', user.uid);
      await updateDoc(favoritesRef, {
        items: arrayRemove(itemToRemove),
      });

      // Update local state
      set((state) => ({
        favorites: state.favorites.filter((item) => item.id !== stoneId),
      }));
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  // Load favorites from Firestore
  loadFavorites: async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      set({ loading: true });

      const favoritesRef = doc(db, 'favorites', user.uid);
      const favoritesDoc = await getDoc(favoritesRef);

      if (favoritesDoc.exists()) {
        const data = favoritesDoc.data();
        set({ favorites: data.items || [] });
      } else {
        set({ favorites: [] });
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      set({ favorites: [] });
    } finally {
      set({ loading: false });
    }
  },

  // Get total number of favorites
  totalFavorites: () => {
    return get().favorites.length;
  },

  // Check if stone is in favorites
  isFavorite: (stoneId: string) => {
    return get().favorites.some((item) => item.id === stoneId);
  },
}));
