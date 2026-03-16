/**
 * Analytics Screen
 *
 * Displays search logs, cart logs, and analytics statistics
 * Port from: web/src/components/AnalyticsDashboard.jsx
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import useAnalyticsStore from '../stores/analyticsStore';
import { Search, ShoppingCart, TrendingUp, Filter } from 'lucide-react-native';
import { format } from 'date-fns';

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const {
    searchLogs,
    cartLogs,
    loading,
    stats,
    filters,
    setFilters,
    loadLogs,
    cleanup
  } = useAnalyticsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load logs on mount
  useEffect(() => {
    loadLogs();

    return () => {
      cleanup(); // Cleanup Firestore listeners
    };
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  // Filter options
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const logTypeOptions = [
    { value: 'search', label: 'Search Logs' },
    { value: 'cart', label: 'Cart Logs' },
    { value: 'all', label: 'All Logs' }
  ];

  // Render stats cards
  const renderStatsCard = (icon: any, label: string, value: string | number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );

  // Render search log item
  const renderSearchLogItem = ({ item }: { item: any }) => (
    <View style={[styles.logItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.logHeader}>
        <Search size={16} color={theme.primary} />
        <Text style={[styles.logQuery, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.query || 'Empty query'}
        </Text>
      </View>
      <View style={styles.logDetails}>
        <Text style={[styles.logText, { color: theme.textSecondary }]}>
          Results: {item.resultsCount || 0}
        </Text>
        <Text style={[styles.logText, { color: theme.textSecondary }]}>
          {item.timestamp ? format(item.timestamp, 'MMM dd, HH:mm') : '-'}
        </Text>
      </View>
      {item.aiUsed && (
        <View style={[styles.aiBadge, { backgroundColor: theme.success }]}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      )}
    </View>
  );

  // Render cart log item
  const renderCartLogItem = ({ item }: { item: any }) => (
    <View style={[styles.logItem, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.logHeader}>
        <ShoppingCart size={16} color={theme.primary} />
        <Text style={[styles.logQuery, { color: theme.textPrimary }]} numberOfLines={1}>
          {item.action === 'add' ? 'Added to cart' : 'Removed from cart'}
        </Text>
      </View>
      <View style={styles.logDetails}>
        <Text style={[styles.logText, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.carat}ct {item.shape} {item.color} {item.clarity}
        </Text>
        <Text style={[styles.logText, { color: theme.textSecondary }]}>
          {item.timestamp ? format(item.timestamp, 'MMM dd, HH:mm') : '-'}
        </Text>
      </View>
    </View>
  );

  // Get current logs based on filter
  const currentLogs = filters.logType === 'search' ? searchLogs :
                       filters.logType === 'cart' ? cartLogs :
                       [...searchLogs, ...cartLogs].sort((a, b) => b.timestamp - a.timestamp);

  const renderItem = ({ item }: { item: any }) => {
    if (item.query !== undefined) {
      return renderSearchLogItem({ item });
    } else {
      return renderCartLogItem({ item });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Analytics</Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.backgroundCard }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border }]}>
          {/* Date Range */}
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Date Range:</Text>
          <View style={styles.filterOptions}>
            {dateRangeOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  { borderColor: theme.border },
                  filters.dateRange === option.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setFilters({ dateRange: option.value })}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: filters.dateRange === option.value ? '#fff' : theme.textPrimary }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Log Type */}
          <Text style={[styles.filterLabel, { color: theme.textSecondary, marginTop: 12 }]}>Log Type:</Text>
          <View style={styles.filterOptions}>
            {logTypeOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  { borderColor: theme.border },
                  filters.logType === option.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setFilters({ logType: option.value })}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: filters.logType === option.value ? '#fff' : theme.textPrimary }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {renderStatsCard(
          <Search size={24} color={theme.primary} />,
          'Total Searches',
          stats.totalSearches,
          theme.primary
        )}
        {renderStatsCard(
          <ShoppingCart size={24} color={theme.success} />,
          'Cart Actions',
          stats.totalCartActions,
          theme.success
        )}
        {renderStatsCard(
          <TrendingUp size={24} color={theme.warning} />,
          'Avg Results',
          stats.avgResultsPerSearch.toFixed(1),
          theme.warning
        )}
      </View>

      {/* Logs List */}
      {loading && currentLogs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading logs...</Text>
        </View>
      ) : (
        <FlatList
          data={currentLogs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No logs found for selected filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  filterButton: {
    padding: 8,
    borderRadius: 8
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '500'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center'
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center'
  },
  listContent: {
    padding: 16
  },
  logItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    position: 'relative'
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  logQuery: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600'
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  logText: {
    fontSize: 12
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14
  }
});
