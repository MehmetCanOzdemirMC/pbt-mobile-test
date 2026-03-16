/**
 * Email Tab Screen
 *
 * Email automation logs and configuration
 * Port from: web/src/components/EmailConfigPanel.jsx
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { db } from '../../../config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  type: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: any;
  error?: string;
}

export default function EmailTabScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'email_logs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as EmailLog));
      setLogs(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={16} color={theme.success} />;
      case 'failed':
        return <XCircle size={16} color={theme.error} />;
      default:
        return <Clock size={16} color={theme.warning} />;
    }
  };

  const renderLogItem = ({ item }: { item: EmailLog }) => (
    <View style={[styles.logCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      <View style={styles.logHeader}>
        <Mail size={18} color={theme.primary} />
        <View style={styles.logInfo}>
          <Text style={[styles.logType, { color: theme.textPrimary }]}>{item.type}</Text>
          <Text style={[styles.logTo, { color: theme.textSecondary }]}>{item.to}</Text>
        </View>
        {renderStatusIcon(item.status)}
      </View>

      <Text style={[styles.logSubject, { color: theme.textSecondary }]} numberOfLines={1}>
        {item.subject}
      </Text>

      <View style={styles.logFooter}>
        <Text style={[styles.logTimestamp, { color: theme.textSecondary }]}>
          {item.timestamp ? format(item.timestamp, 'MMM dd, HH:mm') : '-'}
        </Text>
        <View style={[
          styles.statusBadge,
          {
            backgroundColor:
              item.status === 'sent' ? `${theme.success}20` :
              item.status === 'failed' ? `${theme.error}20` :
              `${theme.warning}20`
          }
        ]}>
          <Text style={[
            styles.statusText,
            {
              color:
                item.status === 'sent' ? theme.success :
                item.status === 'failed' ? theme.error :
                theme.warning
            }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>

      {item.error && (
        <Text style={[styles.errorText, { color: theme.error }]}>{item.error}</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Card */}
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{logs.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Emails</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.success }]}>
            {logs.filter(l => l.status === 'sent').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.error }]}>
            {logs.filter(l => l.status === 'failed').length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Failed</Text>
        </View>
      </View>

      {/* Email Logs */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No email logs found</Text>
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
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 16
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  logInfo: {
    flex: 1
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  logTo: {
    fontSize: 12
  },
  logSubject: {
    fontSize: 13,
    marginBottom: 8
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logTimestamp: {
    fontSize: 12
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 12,
    marginTop: 8
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32
  }
});
