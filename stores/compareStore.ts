import { create } from 'zustand';

export interface CompareStone {
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
  certification?: string;
}

interface CompareState {
  compareList: CompareStone[];
  maxCompare: number;

  // Actions
  addToCompare: (stone: CompareStone) => void;
  removeFromCompare: (stoneId: string) => void;
  clearCompare: () => void;
  isInCompare: (stoneId: string) => boolean;
  canAddMore: () => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  compareList: [],
  maxCompare: 3,

  addToCompare: (stone: CompareStone) => {
    const { compareList, maxCompare } = get();

    if (compareList.length >= maxCompare) {
      return;
    }

    if (!compareList.find((s) => s.id === stone.id)) {
      set({ compareList: [...compareList, stone] });
    }
  },

  removeFromCompare: (stoneId: string) => {
    set((state) => ({
      compareList: state.compareList.filter((s) => s.id !== stoneId),
    }));
  },

  clearCompare: () => {
    set({ compareList: [] });
  },

  isInCompare: (stoneId: string) => {
    return get().compareList.some((s) => s.id === stoneId);
  },

  canAddMore: () => {
    const { compareList, maxCompare } = get();
    return compareList.length < maxCompare;
  },
}));
