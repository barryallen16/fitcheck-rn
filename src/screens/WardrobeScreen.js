// src/screens/WardrobeScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useWardrobe } from '../context/WardrobeContext';
import GarmentCard from '../components/GarmentCard';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function WardrobeScreen({ navigation }) {
  const { wardrobe, removeGarment, clearWardrobe, serverOk } = useWardrobe();
  const [banner, setBanner] = useState(null);

  async function pickFromGallery() {
    if (!serverOk) {
      setBanner({ message: 'Connect to LM Studio first', type: 'error' });
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setBanner({ message: 'Photo library permission required', type: 'error' });
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.6,
        selectionLimit: 10,
      });

      if (!r.canceled && r.assets?.length) {
        navigation.navigate('Analyzing', { images: r.assets });
      }
    } catch (e) {
      setBanner({ message: `Gallery error: ${e.message}`, type: 'error' });
    }
  }

  async function takePhoto() {
    if (!serverOk) {
      setBanner({ message: 'Connect to LM Studio first', type: 'error' });
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setBanner({ message: 'Camera permission required', type: 'error' });
        return;
      }

      const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });

      if (!r.canceled && r.assets?.length) {
        navigation.navigate('Analyzing', { images: r.assets });
      }
    } catch (e) {
      setBanner({ message: `Camera error: ${e.message}`, type: 'error' });
    }
  }

  function confirmDelete(id) {
    Alert.alert('Remove Garment', 'Remove from wardrobe?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeGarment(id) },
    ]);
  }

  function confirmClear() {
    Alert.alert('Clear Everything', 'Remove all garments? Cannot undo.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearWardrobe },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {banner && (
        <ErrorBanner
          message={banner.message}
          type={banner.type}
          onDismiss={() => setBanner(null)}
        />
      )}

      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>My Wardrobe</Text>
        {wardrobe.length > 0 && (
          <TouchableOpacity onPress={confirmClear} style={s.back}>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.addRow}>
        <TouchableOpacity style={s.addBtn} onPress={pickFromGallery} activeOpacity={0.7}>
          <Ionicons name="images-outline" size={22} color={COLORS.primary} />
          <Text style={s.addTxt}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={takePhoto} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
          <Text style={s.addTxt}>Camera</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={wardrobe}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GarmentCard
            garment={item}
            onPress={() => navigation.navigate('GarmentDetail', { garment: item })}
            onDelete={confirmDelete}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shirt-outline" size={60} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No Garments Yet</Text>
            <Text style={s.emptyDesc}>
              Add photos of your clothes to build your wardrobe
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GAP.lg,
    paddingVertical: GAP.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  back: { padding: GAP.xs, marginRight: GAP.md },
  hdrTitle: { flex: 1, color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },

  addRow: { flexDirection: 'row', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, gap: GAP.md },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RAD.md,
    paddingVertical: GAP.md,
    gap: GAP.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryMuted,
    borderStyle: 'dashed',
  },
  addTxt: { color: COLORS.primary, fontSize: TYPE.base, fontWeight: '600' },

  list: { paddingHorizontal: GAP.lg, paddingTop: GAP.sm, paddingBottom: GAP.huge },

  empty: { alignItems: 'center', paddingTop: GAP.huge * 2 },
  emptyTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700', marginTop: GAP.lg },
  emptyDesc: {
    color: COLORS.textDim,
    fontSize: TYPE.base,
    textAlign: 'center',
    marginTop: GAP.sm,
    paddingHorizontal: GAP.xxxl,
  },
});