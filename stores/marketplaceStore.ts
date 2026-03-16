import { create } from 'zustand';
import { db } from '../config/firebase';
import {
  collection,
  query,
  onSnapshot,
  limit
} from 'firebase/firestore';

export interface Diamond {
  id: string;
  stoneId?: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut?: string;
  polish?: string;
  symmetry?: string;
  fluorescence?: string;
  lab?: string;
  certificateNo?: string;
  JTRCertificateNo?: string;
  pricePerCarat: number;
  totalPrice: number;
  discount?: number;
  location?: string;
  status: 'available' | 'reserved' | 'sold' | 'inCart';
  ownerId: string;
  ownerName?: string;
  companyName?: string;
  createdAt: number;
  updatedAt: number;
  inCarts?: string[];
  measurements?: {
    length?: number;
    width?: number;
    depth?: number;
  };
}

export interface MarketplaceFilters {
  shape?: string[];
  caratMin?: number;
  caratMax?: number;
  color?: string[];
  clarity?: string[];
  cut?: string[];
  polish?: string[];
  symmetry?: string[];
  fluorescence?: string[];
  lab?: string[];
  priceMin?: number;
  priceMax?: number;
  location?: string[];
  searchQuery?: string;
}

export interface MarketplaceState {
  // Data
  diamonds: Diamond[];
  filteredDiamonds: Diamond[];
  loading: boolean;
  error: string | null;

  // Filters
  filters: MarketplaceFilters;

  // Sort
  sortBy: 'carat' | 'price' | 'discount' | 'date';
  sortOrder: 'asc' | 'desc';

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  loadDiamonds: () => void;
  applyFilters: (filters: Partial<MarketplaceFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: MarketplaceState['sortBy'], order?: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  searchDiamonds: (query: string) => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  // Initial state
  diamonds: [],
  filteredDiamonds: [],
  loading: false,
  error: null,

  filters: {},

  sortBy: 'date',
  sortOrder: 'desc',

  page: 1,
  pageSize: 50,

  // Load diamonds from Firestore with real-time updates
  loadDiamonds: () => {
    set({ loading: true, error: null });

    try {
      // Query stones collection with LIMIT for better performance
      // Load first 200 stones (no orderBy to avoid index requirement)
      const stonesRef = collection(db, 'stones');
      const q = query(
        stonesRef,
        limit(200) // PERFORMANCE: Only load 200 stones initially
      );

      // Real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const diamondsData: Diamond[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();

            // Filter out reserved and sold stones (client-side)
            const status = data.status || 'available';
            if (status !== 'available' && status !== 'inCart') {
              return; // Skip reserved/sold stones
            }

            // VALIDATE CRITICAL FIELDS - Skip stones with missing/invalid data
            const shape = data.shape || '';
            const carat = parseFloat(data.carat) || 0;
            const color = data.color || '';
            const clarity = data.clarity || '';
            const pricePerCarat = parseFloat(data.pricePerCarat) || 0;
            const totalPrice = parseFloat(data.totalPrice) || 0;

            // Skip invalid stones
            if (
              !shape || shape === 'N/A' || shape.trim() === '' ||
              carat <= 0 ||
              !color || color.trim() === '' ||
              !clarity || clarity.trim() === '' ||
              pricePerCarat <= 0 ||
              totalPrice <= 0
            ) {
              console.warn(`⚠️ Skipping invalid stone ${doc.id}:`, {
                shape,
                carat,
                color,
                clarity,
                pricePerCarat,
                totalPrice
              });
              return; // Skip this stone
            }

            diamondsData.push({
              id: doc.id,
              stoneId: data.stoneId,
              shape: shape,
              carat: carat,
              color: color,
              clarity: clarity,
              cut: data.cut,
              polish: data.polish,
              symmetry: data.symmetry,
              fluorescence: data.fluorescence,
              lab: data.lab,
              certificateNo: data.certificateNo,
              JTRCertificateNo: data.JTRCertificateNo,
              pricePerCarat: pricePerCarat,
              totalPrice: totalPrice,
              discount: parseFloat(data.discount),
              location: data.location,
              status: status,
              ownerId: data.ownerId || data.supplierId || '',
              ownerName: data.ownerName || data.supplierName,
              companyName: data.companyName,
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt || Date.now(),
              inCarts: data.inCarts || [],
              measurements: data.measurements,
            });
          });

          console.log(`📦 Loaded ${diamondsData.length} diamonds from Firestore (filtered: available + inCart)`);

          set({
            diamonds: diamondsData,
            loading: false
          });

          // Apply current filters
          get().applyFilters({});
        },
        (error) => {
          console.error('❌ Error loading diamonds:', error);
          set({
            error: error.message,
            loading: false
          });
        }
      );

      // Store unsubscribe function (you might want to call this on unmount)
      // For now, we'll keep the listener active

    } catch (error: any) {
      console.error('❌ Error setting up diamonds listener:', error);
      set({
        error: error.message,
        loading: false
      });
    }
  },

  // Apply filters to diamonds
  applyFilters: (newFilters: Partial<MarketplaceFilters>) => {
    const currentFilters = get().filters;
    const updatedFilters = { ...currentFilters, ...newFilters };

    set({ filters: updatedFilters });

    let filtered = [...get().diamonds];

    // Apply shape filter
    if (updatedFilters.shape && updatedFilters.shape.length > 0) {
      filtered = filtered.filter(d =>
        updatedFilters.shape!.includes(d.shape)
      );
    }

    // Apply carat range
    if (updatedFilters.caratMin !== undefined) {
      filtered = filtered.filter(d => d.carat >= updatedFilters.caratMin!);
    }
    if (updatedFilters.caratMax !== undefined) {
      filtered = filtered.filter(d => d.carat <= updatedFilters.caratMax!);
    }

    // Apply color filter
    if (updatedFilters.color && updatedFilters.color.length > 0) {
      filtered = filtered.filter(d =>
        updatedFilters.color!.includes(d.color)
      );
    }

    // Apply clarity filter
    if (updatedFilters.clarity && updatedFilters.clarity.length > 0) {
      filtered = filtered.filter(d =>
        updatedFilters.clarity!.includes(d.clarity)
      );
    }

    // Apply cut filter
    if (updatedFilters.cut && updatedFilters.cut.length > 0) {
      filtered = filtered.filter(d =>
        d.cut && updatedFilters.cut!.includes(d.cut)
      );
    }

    // Apply polish filter
    if (updatedFilters.polish && updatedFilters.polish.length > 0) {
      filtered = filtered.filter(d =>
        d.polish && updatedFilters.polish!.includes(d.polish)
      );
    }

    // Apply symmetry filter
    if (updatedFilters.symmetry && updatedFilters.symmetry.length > 0) {
      filtered = filtered.filter(d =>
        d.symmetry && updatedFilters.symmetry!.includes(d.symmetry)
      );
    }

    // Apply fluorescence filter
    if (updatedFilters.fluorescence && updatedFilters.fluorescence.length > 0) {
      filtered = filtered.filter(d =>
        d.fluorescence && updatedFilters.fluorescence!.includes(d.fluorescence)
      );
    }

    // Apply lab filter
    if (updatedFilters.lab && updatedFilters.lab.length > 0) {
      filtered = filtered.filter(d =>
        d.lab && updatedFilters.lab!.includes(d.lab)
      );
    }

    // Apply price range
    if (updatedFilters.priceMin !== undefined) {
      filtered = filtered.filter(d => d.totalPrice >= updatedFilters.priceMin!);
    }
    if (updatedFilters.priceMax !== undefined) {
      filtered = filtered.filter(d => d.totalPrice <= updatedFilters.priceMax!);
    }

    // Apply location filter
    if (updatedFilters.location && updatedFilters.location.length > 0) {
      filtered = filtered.filter(d =>
        d.location && updatedFilters.location!.includes(d.location)
      );
    }

    // Apply search query
    if (updatedFilters.searchQuery && updatedFilters.searchQuery.trim() !== '') {
      const query = updatedFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.certificateNo?.toLowerCase().includes(query) ||
        d.JTRCertificateNo?.toLowerCase().includes(query) ||
        d.shape.toLowerCase().includes(query) ||
        d.color.toLowerCase().includes(query) ||
        d.clarity.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const { sortBy, sortOrder } = get();
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'carat':
          comparison = a.carat - b.carat;
          break;
        case 'price':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'discount':
          comparison = (a.discount || 0) - (b.discount || 0);
          break;
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    set({ filteredDiamonds: filtered, page: 1 });

    console.log(`🔍 Filtered ${filtered.length} diamonds from ${get().diamonds.length} total`);
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: {},
      filteredDiamonds: [...get().diamonds],
      page: 1
    });
  },

  // Set sort order
  setSortBy: (sortBy, order) => {
    set({
      sortBy,
      sortOrder: order || (get().sortBy === sortBy && get().sortOrder === 'asc' ? 'desc' : 'asc')
    });

    // Re-apply filters to trigger sort
    get().applyFilters({});
  },

  // Set current page
  setPage: (page) => {
    set({ page });
  },

  // Search diamonds
  searchDiamonds: (query) => {
    get().applyFilters({ searchQuery: query });
  },
}));
