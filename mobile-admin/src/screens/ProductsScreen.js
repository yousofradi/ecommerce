import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { productsApi } from '../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Package } from 'lucide-react-native';

export default function ProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await productsApi.getProducts();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      console.log('Error fetching products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleActive = (productId, currentlyActive) => {
    Alert.alert('تأكيد', `هل أنت متأكد أنك تريد ${currentlyActive ? 'أرشفة' : 'تفعيل'} هذا المنتج؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { 
        text: 'نعم', 
        onPress: async () => {
          try {
            await productsApi.updateStatus([productId], !currentlyActive);
            fetchProducts();
          } catch (err) {
            Alert.alert('خطأ', 'فشل في تحديث المنتج');
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Package color={COLORS.textLight} size={24} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.price}>{item.basePrice} ج.م</Text>
        <Text style={styles.stock}>المخزون: {item.quantity !== null ? item.quantity : 'غير محدود'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.statusBtn, item.active ? styles.btnActive : styles.btnInactive]} 
          onPress={() => handleToggleActive(item._id, item.active)}
        >
          <Text style={[styles.btnText, item.active ? styles.textActive : styles.textInactive]}>
            {item.active ? 'نشط' : 'مؤرشف'}
          </Text>
        </TouchableOpacity>
        {/* Placeholder for Edit button in next task */}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>المنتجات</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.addBtnText}>+ إضافة منتج</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchProducts}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgBody },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 16 },
  title: { fontFamily: FONTS.mainBold, fontSize: 24, color: COLORS.textMain, textAlign: 'left' },
  addBtn: { backgroundColor: COLORS.borderFocus, paddingHorizontal: 16, paddingVertical: 8, borderRadius: SIZES.radiusSm },
  addBtnText: { fontFamily: FONTS.mainBold, color: COLORS.white, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  card: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.bgCard, 
    padding: 12, 
    borderRadius: SIZES.radius, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: COLORS.borderColor, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  image: { width: 70, height: 70, borderRadius: SIZES.radiusSm, marginRight: 12 },
  placeholder: { backgroundColor: COLORS.bgHover, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontFamily: FONTS.mainBold, fontSize: 16, color: COLORS.textMain, marginBottom: 4, textAlign: 'left' },
  price: { fontFamily: FONTS.mainBold, fontSize: 14, color: COLORS.success, textAlign: 'left' },
  stock: { fontFamily: FONTS.main, fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'left' },
  actions: { alignItems: 'flex-end', justifyContent: 'center' },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  btnActive: { backgroundColor: '#dcfce7' },
  btnInactive: { backgroundColor: '#fee2e2' },
  textActive: { fontFamily: FONTS.mainBold, fontSize: 12, color: '#166534' },
  textInactive: { fontFamily: FONTS.mainBold, fontSize: 12, color: '#991b1b' },
});
