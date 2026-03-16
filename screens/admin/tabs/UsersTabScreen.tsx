/**
 * Users Tab Screen
 *
 * Company and user management
 * Port from: web/src/components/CompanyManagement.jsx
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { db } from '../../../config/firebase';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { Users, Building2, CheckCircle, XCircle, Search } from 'lucide-react-native';

interface User {
  id: string;
  email: string;
  displayName?: string;
  companyName?: string;
  role: string;
  membershipStatus: string;
  createdAt: any;
}

export default function UsersTabScreen() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    if (filter === 'pending') {
      q = query(collection(db, 'users'), where('membershipStatus', '==', 'pending_kyc'), orderBy('createdAt', 'desc'));
    } else if (filter === 'approved') {
      q = query(collection(db, 'users'), where('membershipStatus', '==', 'approved'), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.userHeader}>
        <View style={[styles.avatar, { backgroundColor: `${theme.primary}20` }]}>
          <Users size={20} color={theme.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>{item.displayName || item.email}</Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
        </View>
        {item.membershipStatus === 'approved' ? (
          <CheckCircle size={20} color={theme.success} />
        ) : (
          <XCircle size={20} color={theme.warning} />
        )}
      </View>

      {item.companyName && (
        <View style={styles.companyRow}>
          <Building2 size={14} color={theme.textSecondary} />
          <Text style={[styles.companyText, { color: theme.textSecondary }]}>{item.companyName}</Text>
        </View>
      )}

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: `${theme.primary}20` }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>{item.role}</Text>
        </View>
        <View style={[
          styles.badge,
          {
            backgroundColor: item.membershipStatus === 'approved' ? `${theme.success}20` : `${theme.warning}20`
          }
        ]}>
          <Text style={[
            styles.badgeText,
            { color: item.membershipStatus === 'approved' ? theme.success : theme.warning }
          ]}>
            {item.membershipStatus}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <Search size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search users or companies..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        {['all', 'pending', 'approved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === f ? theme.primary : theme.backgroundCard,
                borderColor: theme.border
              }
            ]}
            onPress={() => setFilter(f as any)}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#fff' : theme.textPrimary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No users found</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 16
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  userEmail: {
    fontSize: 12
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  companyText: {
    fontSize: 14
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32
  }
});
