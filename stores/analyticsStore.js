/**
 * Analytics Store
 *
 * Manages search logs, cart logs, and analytics data
 * Port from: web/src/components/AnalyticsDashboard.jsx
 */

import { create } from 'zustand';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const useAnalyticsStore = create((set, get) => ({
  // State
  searchLogs: [],
  cartLogs: [],
  loading: false,
  error: null,

  // Filters
  filters: {
    dateRange: 'today', // 'today', 'week', 'month', 'all'
    startDate: null,
    endDate: null,
    logType: 'search' // 'search', 'cart', 'all'
  },

  // Stats
  stats: {
    totalSearches: 0,
    totalCartActions: 0,
    avgResultsPerSearch: 0,
    topSearchTerms: []
  },

  // Real-time listeners (cleanup refs)
  unsubscribeSearch: null,
  unsubscribeCart: null,

  /**
   * Set filters
   */
  setFilters: (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
    get().loadLogs();
  },

  /**
   * Load search logs
   */
  loadSearchLogs: () => {
    const { filters } = get();

    try {
      // Clean up previous listener
      if (get().unsubscribeSearch) {
        get().unsubscribeSearch();
      }

      // Build query
      let q = query(
        collection(db, 'search_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      // Add date filter
      if (filters.dateRange !== 'all') {
        const startDate = getStartDate(filters.dateRange);
        q = query(
          collection(db, 'search_logs'),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }

      // Real-time listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));

        set({ searchLogs: logs, loading: false });
        get().calculateStats();
      }, (error) => {
        console.error('Search logs listener error:', error);
        set({ error: error.message, loading: false });
      });

      set({ unsubscribeSearch: unsubscribe });

    } catch (error) {
      console.error('Load search logs error:', error);
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Load cart logs
   */
  loadCartLogs: () => {
    const { filters } = get();

    try {
      // Clean up previous listener
      if (get().unsubscribeCart) {
        get().unsubscribeCart();
      }

      // Build query
      let q = query(
        collection(db, 'cart_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      // Add date filter
      if (filters.dateRange !== 'all') {
        const startDate = getStartDate(filters.dateRange);
        q = query(
          collection(db, 'cart_logs'),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }

      // Real-time listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));

        set({ cartLogs: logs, loading: false });
        get().calculateStats();
      }, (error) => {
        console.error('Cart logs listener error:', error);
        set({ error: error.message, loading: false });
      });

      set({ unsubscribeCart: unsubscribe });

    } catch (error) {
      console.error('Load cart logs error:', error);
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Load all logs based on filters
   */
  loadLogs: () => {
    set({ loading: true, error: null });
    const { filters } = get();

    if (filters.logType === 'search' || filters.logType === 'all') {
      get().loadSearchLogs();
    }

    if (filters.logType === 'cart' || filters.logType === 'all') {
      get().loadCartLogs();
    }
  },

  /**
   * Calculate statistics
   */
  calculateStats: () => {
    const { searchLogs, cartLogs } = get();

    // Total searches
    const totalSearches = searchLogs.length;

    // Total cart actions
    const totalCartActions = cartLogs.length;

    // Average results per search
    const avgResultsPerSearch = searchLogs.length > 0
      ? searchLogs.reduce((sum, log) => sum + (log.resultsCount || 0), 0) / searchLogs.length
      : 0;

    // Top search terms (group by query)
    const searchTermCounts = {};
    searchLogs.forEach(log => {
      const query = log.query || '';
      searchTermCounts[query] = (searchTermCounts[query] || 0) + 1;
    });

    const topSearchTerms = Object.entries(searchTermCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    set({
      stats: {
        totalSearches,
        totalCartActions,
        avgResultsPerSearch,
        topSearchTerms
      }
    });
  },

  /**
   * Export logs to CSV
   */
  exportToCSV: async () => {
    const { searchLogs, cartLogs, filters } = get();

    let data = [];
    let headers = [];

    if (filters.logType === 'search' || filters.logType === 'all') {
      headers = ['Timestamp', 'User ID', 'Query', 'Results Count', 'AI Used'];
      data = searchLogs.map(log => ({
        timestamp: log.timestamp?.toISOString(),
        userId: log.userId,
        query: log.query,
        resultsCount: log.resultsCount,
        aiUsed: log.aiUsed ? 'Yes' : 'No'
      }));
    } else if (filters.logType === 'cart') {
      headers = ['Timestamp', 'User ID', 'Action', 'Stone ID', 'Stone Details'];
      data = cartLogs.map(log => ({
        timestamp: log.timestamp?.toISOString(),
        userId: log.userId,
        action: log.action,
        stoneId: log.stoneId,
        stoneDetails: `${log.carat}ct ${log.shape} ${log.color} ${log.clarity}`
      }));
    }

    return { headers, data };
  },

  /**
   * Cleanup listeners
   */
  cleanup: () => {
    if (get().unsubscribeSearch) {
      get().unsubscribeSearch();
      set({ unsubscribeSearch: null });
    }
    if (get().unsubscribeCart) {
      get().unsubscribeCart();
      set({ unsubscribeCart: null });
    }
  }
}));

/**
 * Helper: Get start date based on range
 */
function getStartDate(range) {
  const now = new Date();

  switch (range) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());

    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo;

    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo;

    default:
      return new Date(0); // All time
  }
}

export default useAnalyticsStore;
