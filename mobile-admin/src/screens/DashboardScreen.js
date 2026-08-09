import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { ordersApi, authApi } from '../api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ onLogout }) {
  const [stats, setStats] = useState({ pending: 0, shipped: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await ordersApi.getOrders();
      let pending = 0;
      let shipped = 0;
      let revenue = 0;
      data.forEach(order => {
        if (order.status === 'pending') pending++;
        if (order.status === 'shipped') shipped++;
        if (order.status !== 'cancelled') revenue += order.totalPrice;
      });
      setStats({ pending, shipped, revenue });
    } catch (err) {
      console.log('Error fetching stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await authApi.logout();
    onLogout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0f766e" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pending Orders</Text>
              <Text style={styles.cardValue}>{stats.pending}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shipped Orders</Text>
              <Text style={styles.cardValue}>{stats.shipped}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Revenue</Text>
              <Text style={styles.cardValue}>{stats.revenue} EGP</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  grid: { flexDirection: 'column', gap: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, color: '#64748b', marginBottom: 8 },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#0f766e' },
});
