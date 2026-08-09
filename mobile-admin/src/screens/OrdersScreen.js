import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { ordersApi } from '../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../constants/theme';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await ordersApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.log('Error fetching orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'shipped': return COLORS.borderFocus;
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'shipped': return 'تم الشحن';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OrderDetails', { order: item })}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{item.orderId}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>العميل:</Text>
        <Text style={styles.value}>{item.customer?.name}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>الهاتف:</Text>
        <Text style={styles.value}>{item.customer?.phone}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>الإجمالي:</Text>
        <Text style={styles.price}>{item.totalPrice} ج.م</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>الطلبات</Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchOrders}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgBody },
  title: { fontFamily: FONTS.mainBold, fontSize: 24, margin: 16, color: COLORS.textMain, textAlign: 'left' },
  list: { padding: 16, paddingBottom: 100 },
  card: { 
    backgroundColor: COLORS.bgCard, 
    padding: 16, 
    borderRadius: SIZES.radius, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: COLORS.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontFamily: FONTS.mainBold, fontSize: 16, color: COLORS.textMain },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: FONTS.mainBold, fontSize: 12 },
  row: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  label: { fontFamily: FONTS.main, fontSize: 14, color: COLORS.textMuted, width: 70, textAlign: 'left' },
  value: { fontFamily: FONTS.mainBold, fontSize: 14, color: COLORS.textMain, flex: 1, textAlign: 'left' },
  price: { fontFamily: FONTS.mainBold, fontSize: 16, color: COLORS.success, flex: 1, textAlign: 'left' },
});
