import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';

export default function AddProductScreen({ navigation }) {
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!name || !basePrice) {
      return Alert.alert('Error', 'Name and Price are required');
    }

    setLoading(true);
    try {
      let uploadedImageUrl = '';
      
      // If we selected an image, we need to upload it to our backend /api/upload first (if it accepts multipart)
      // For this MVP, we'll try to just pass a placeholder or handle it according to the backend
      if (image) {
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: image.fileName || 'product.jpg',
        });
        
        try {
          const uploadRes = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploadedImageUrl = uploadRes.data.url;
        } catch (uploadErr) {
          console.log('Upload error', uploadErr);
          // Fallback if the endpoint is not properly set up for mobile yet
          uploadedImageUrl = '';
        }
      }

      const payload = {
        name,
        basePrice: Number(basePrice),
        quantity: quantity ? Number(quantity) : null,
        description,
        active: true,
        status: 'active',
        images: uploadedImageUrl ? [uploadedImageUrl] : [],
        imageUrl: uploadedImageUrl
      };

      await api.post('/products', payload);
      Alert.alert('Success', 'Product added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.log('Error saving product', err);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Product</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imagePickerText}>+ Add Photo</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Product Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Nice T-Shirt" />

        <Text style={styles.label}>Price (EGP)</Text>
        <TextInput style={styles.input} value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" placeholder="e.g. 250" />

        <Text style={styles.label}>Stock Quantity (optional)</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="Leave empty for unlimited" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Product description..." />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Product</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { padding: 8 },
  backText: { fontSize: 16, color: '#0f766e', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  form: { padding: 16 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  imagePicker: { height: 200, backgroundColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  imagePickerText: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  imagePreview: { width: '100%', height: '100%' },
  saveBtn: { backgroundColor: '#0f766e', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
