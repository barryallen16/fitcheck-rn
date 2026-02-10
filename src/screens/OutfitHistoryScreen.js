// src/screens/OutfitHistoryScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobe } from '../context/WardrobeContext';
import OutfitCard from '../components/OutfitCard';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { todayStr } from '../utils/helpers';

export default function OutfitHistoryScreen({ navigation }) {
  const { outfits, wardrobe, wearOutfit, unwearOutfit, deleteOutfit } = useWardrobe();
  const [tab, setTab] = useState('unworn'); // 'unworn' | 'worn'

  const unworn = outfits.filter((o) => o.status === 'unworn').reverse();
  const worn = outfits.filter((o) => o.status === 'worn').sort((a, b) => (b.wornDate || '').localeCompare(a.wornDate || ''));
  const list = tab === 'unworn' ? unworn : worn;

  function handleWear(id) {
    wearOutfit(id, todayStr());
  }

  function handleDelete(id) {
    Alert.alert('Delete Outfit', 'Remove this outfit from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOutfit(id) },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Outfit History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'unworn' && s.tabActive]}
          onPress={() => setTab('unworn')}
        >
          <Text style={[s.tabTxt, tab === 'unworn' && s.tabTxtActive]}>
            Unworn ({unworn.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'worn' && s.tabActive]}
          onPress={() => setTab('worn')}
        >
          <Text style={[s.tabTxt, tab === 'worn' && s.tabTxtActive]}>
            Worn ({worn.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            wardrobe={wardrobe}
            onWear={handleWear}
            onUnwear={unwearOutfit}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name={tab === 'unworn' ? 'layers-outline' : 'shirt-outline'}
              size={56} color={COLORS.textMuted}
            />
            <Text style={s.emptyTitle}>
              {tab === 'unworn' ? 'No Unworn Outfits' : 'No Worn Outfits'}
            </Text>
            <Text style={s.emptyDesc}>
              {tab === 'unworn'
                ? 'Generate outfits to see them here'
                : 'Mark outfits as worn to track them'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  tabs: { flexDirection: 'row', paddingHorizontal: GAP.lg, paddingTop: GAP.md, gap: GAP.sm },
  tab: { flex: 1, paddingVertical: GAP.md, alignItems: 'center', borderRadius: RAD.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primaryMuted },
  tabTxt: { color: COLORS.textDim, fontSize: TYPE.sm, fontWeight: '600' },
  tabTxtActive: { color: COLORS.primary },
  list: { paddingHorizontal: GAP.lg, paddingTop: GAP.md, paddingBottom: GAP.huge },
  empty: { alignItems: 'center', paddingTop: GAP.huge * 2 },
  emptyTitle: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700', marginTop: GAP.lg },
  emptyDesc: { color: COLORS.textDim, fontSize: TYPE.sm, textAlign: 'center', marginTop: GAP.sm, paddingHorizontal: GAP.xxxl },
});