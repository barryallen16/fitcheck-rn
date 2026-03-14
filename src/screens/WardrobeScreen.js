import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import PersonaBar from '../components/PersonaBar';
import GarmentCard from '../components/GarmentCard';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function WardrobeScreen({ navigation }) {
  const { wardrobe, removeGarment, clearWardrobe, serverOk, active } = useApp();
  const [banner, setBanner] = useState(null);

  async function pick() {
    if (!serverOk) { setBanner({ message: 'Connect to LM Studio first', type: 'error' }); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setBanner({ message: 'Permission required', type: 'error' }); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.6, selectionLimit: 0,
    });
    if (!r.canceled && r.assets?.length) navigation.navigate('Analyzing', { images: r.assets });
  }

  async function camera() {
    if (!serverOk) { setBanner({ message: 'Connect to LM Studio first', type: 'error' }); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setBanner({ message: 'Permission required', type: 'error' }); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled && r.assets?.length) navigation.navigate('Analyzing', { images: r.assets });
  }

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}
      <PersonaBar />
      <View style={s.hdr}>
        <Text style={s.title}>{active?.name}'s Wardrobe</Text>
        {wardrobe.length > 0 && (
          <TouchableOpacity onPress={() => Alert.alert('Clear All', 'Remove all garments?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearWardrobe }])}>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.addRow}>
        <TouchableOpacity style={s.addBtn} onPress={pick}><Ionicons name="images-outline" size={22} color={COLORS.primary} /><Text style={s.addTxt}>Gallery</Text></TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={camera}><Ionicons name="camera-outline" size={22} color={COLORS.primary} /><Text style={s.addTxt}>Camera</Text></TouchableOpacity>
      </View>
      <FlatList
        data={wardrobe} keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: GAP.lg, paddingBottom: GAP.huge }}
        renderItem={({ item }) => (
          <GarmentCard garment={item}
            onPress={() => navigation.navigate('GarmentDetail', { garment: item })}
            onDelete={(id) => Alert.alert('Remove?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeGarment(id) }])}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="shirt-outline" size={56} color={COLORS.textMuted} /><Text style={s.emptyTxt}>No garments yet</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md },
  title: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  addRow: { flexDirection: 'row', paddingHorizontal: GAP.lg, paddingBottom: GAP.md, gap: GAP.md },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryGlow, borderRadius: RAD.md, paddingVertical: GAP.md, gap: GAP.sm, borderWidth: 1, borderColor: COLORS.primaryMuted, borderStyle: 'dashed' },
  addTxt: { color: COLORS.primary, fontSize: TYPE.base, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: GAP.huge * 2 },
  emptyTxt: { color: COLORS.textMuted, fontSize: TYPE.base, marginTop: GAP.lg },
});