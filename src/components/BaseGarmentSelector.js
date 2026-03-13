import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GarmentCard from './GarmentCard';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function BaseGarmentSelector({ visible, wardrobe, selectedId, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={s.wrap}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          <Text style={s.title}>Select Base Garment</Text>
          <TouchableOpacity onPress={() => { onSelect(null); onClose(); }}>
            <Text style={s.clear}>Clear</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.sub}>Pick a garment to build your outfit around (optional)</Text>
        <FlatList
          data={wardrobe}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: GAP.lg, paddingBottom: GAP.huge }}
          renderItem={({ item }) => (
            <GarmentCard
              garment={item}
              isSelected={selectedId === item.id}
              selectable
              onPress={() => { onSelect(item.id); onClose(); }}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: GAP.huge * 2 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: TYPE.base }}>No garments yet</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  clear: { color: COLORS.red, fontSize: TYPE.sm, fontWeight: '600' },
  sub: { color: COLORS.textDim, fontSize: TYPE.sm, paddingHorizontal: GAP.lg, paddingVertical: GAP.md },
});