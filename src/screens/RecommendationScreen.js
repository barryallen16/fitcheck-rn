// src/screens/RecommendationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert ,TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

import lm from '../services/lmStudioService';
import weather from '../services/weatherService';
import ErrorBanner from '../components/ErrorBanner';
import BaseGarmentSelector from '../components/BaseGarmentSelector';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { TOP_CATS, BOTTOM_CATS, FULL_CATS, getSlot, getMaxOutfits, getUnusedCombinations } from '../utils/helpers';

const LOAD_MSGS = [
  { msg: 'Analyzing Wardrobe', sub: 'Scanning your garments...' },
  { msg: 'Color Harmony', sub: 'Finding complementary tones...' },
  { msg: 'Silhouette Balance', sub: 'Matching cuts and fits...' },
  { msg: 'Weather Check', sub: 'Optimizing for conditions...' },
  { msg: 'Finalizing Look', sub: 'Almost ready...' },
];

function getSlotLabel(cat) {
  if (TOP_CATS.includes(cat)) return 'Top';
  if (BOTTOM_CATS.includes(cat)) return 'Bottom';
  if (FULL_CATS.includes(cat)) return 'Full-body';
  return 'Accessory';
}

export default function RecommendationScreen({ navigation }) {
  const { wardrobe, outfits, serverOk, isExhausted } =  useApp();
  const [baseId, setBaseId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadIdx, setLoadIdx] = useState(0);
  const [banner, setBanner] = useState(null);
  const intervalRef = useRef(null);
// ... existing state ...
const [occasion, setOccasion] = useState(''); // Add this
const OCCASIONS = ['Office', 'Wedding', 'Gym', 'Casual', 'Party', 'Date Night']; // Add this
  const base = wardrobe.find((g) => g.id === baseId);
  const topCount = wardrobe.filter((g) => TOP_CATS.includes(g.category) || FULL_CATS.includes(g.category)).length;
  const botCount = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category)).length;
  const maxOutfits = getMaxOutfits(wardrobe);
  const unusedCount = getUnusedCombinations(wardrobe, outfits).length;
  const exhausted = isExhausted();

  useEffect(() => {
    if (loading) {
      setLoadIdx(0);
      intervalRef.current = setInterval(() => {
        setLoadIdx((p) => (p + 1) % LOAD_MSGS.length);
      }, 2200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  async function go() {
    if (!serverOk) { setBanner({ message: 'LM Studio not connected', type: 'error' }); return; }
    if (topCount === 0) { setBanner({ message: 'Need at least 1 top garment', type: 'warning' }); return; }

    if (exhausted) {
      Alert.alert(
        'All Outfits Generated! 🎉',
        `All ${maxOutfits} possible outfit combinations from your current wardrobe have been generated.\n\nCheck your Outfit History to browse and pick one!`,
        [
          { text: 'View History', onPress: () => navigation.navigate('OutfitHistory') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const w = await weather.get();
// Change this line inside the go() function:
      const rec = await lm.getRecommendation(w.formatted, wardrobe, baseId, outfits, occasion);
      navigation.navigate('Result', {
        recommendation: rec,
        weather: w,
        wardrobe,
        baseGarmentId: baseId,
      });
    } catch (err) {
      setBanner({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}

      {loading && (
        <View style={s.overlay}>
          <View style={s.loadCard}>
            <View style={s.spinner} />
            <Text style={s.loadMsg}>{LOAD_MSGS[loadIdx].msg}</Text>
            <Text style={s.loadSub}>{LOAD_MSGS[loadIdx].sub}</Text>
          </View>
        </View>
      )}

      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Get Recommendation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Exhaustion banner */}
        {exhausted && (
          <View style={s.exhaustedCard}>
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: GAP.md }}>
              <Text style={s.exhaustedTitle}>All Outfits Generated!</Text>
              <Text style={s.exhaustedSub}>
                All {maxOutfits} possible combinations done. Check History!
              </Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{topCount}</Text><Text style={s.statLbl}>Tops</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{botCount}</Text><Text style={s.statLbl}>Bottoms</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{unusedCount}</Text><Text style={s.statLbl}>Remaining</Text>
          </View>
        </View>

        {/* Base garment */}
        <Text style={s.secLabel}>Base Garment (Optional)</Text>
        <TouchableOpacity style={s.baseCard} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          {base ? (
            <View style={s.baseRow}>
              <Image source={{ uri: base.imageUri }} style={s.baseImg} />
              <View style={{ flex: 1, marginLeft: GAP.md }}>
                <Text style={s.baseName}>{base.summary}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP.sm, marginTop: GAP.xs }}>
                  <Text style={s.baseCat}>{base.category}</Text>
                  <View style={s.slotTag}><Text style={s.slotTxt}>{getSlotLabel(base.category)}</Text></View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setBaseId(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.baseEmpty}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.baseEmptyTxt}>Tap to select</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Wardrobe preview */}
        <Text style={s.secLabel}>Your Wardrobe</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: GAP.xxl }} contentContainerStyle={{ gap: GAP.sm }}>
          {wardrobe.map((g) => (
            <View key={g.id} style={[s.preview, baseId === g.id && s.previewSel]}>
              <Image source={{ uri: g.imageUri }} style={s.previewImg} />
              <Text style={s.previewCat} numberOfLines={1}>{g.category}</Text>
            </View>
          ))}
          {/* Occasion Selection */}

        </ScrollView>
<Text style={s.secLabel}>Occasion (Optional)</Text>
<View style={s.occContainer}>
  <TextInput
    style={s.occInput}
    placeholder="e.g. Interview, Beach, Gala..."
    placeholderTextColor={COLORS.textMuted}
    value={occasion}
    onChangeText={setOccasion}
  />
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP.sm }}>
    {OCCASIONS.map((item) => (
      <TouchableOpacity
        key={item}
        style={[s.occChip, occasion === item && s.occChipActive]}
        onPress={() => setOccasion(item)}
      >
        <Text style={[s.occChipTxt, occasion === item && s.occChipTxtActive]}>{item}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

        {/* Generate */}
        <TouchableOpacity
          style={[s.goBtn, exhausted && { opacity: 0.4 }]}
          onPress={go} activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={24} color={COLORS.bg} />
          <Text style={s.goTxt}>{exhausted ? 'All Done!' : 'Generate Outfit'}</Text>
        </TouchableOpacity>

        {outfits.length > 0 && (
          <TouchableOpacity
            style={s.historyBtn}
            onPress={() => navigation.navigate('OutfitHistory')}
            activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={20} color={COLORS.accent} />
            <Text style={s.historyTxt}>View Outfit History ({outfits.length})</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BaseGarmentSelector
        visible={showPicker} wardrobe={wardrobe} selectedId={baseId}
        onSelect={setBaseId} onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay,
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  loadCard: { alignItems: 'center', padding: GAP.xxxl },
  spinner: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3,
    borderColor: COLORS.primary, borderTopColor: 'transparent', marginBottom: GAP.xl,
  },
  loadMsg: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600', textAlign: 'center' },
  loadSub: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: GAP.sm, textAlign: 'center' },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge },
  exhaustedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryGlow,
    borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.lg,
    borderWidth: 1, borderColor: COLORS.primaryMuted,
  },
  exhaustedTitle: { color: COLORS.primary, fontSize: TYPE.base, fontWeight: '700' },
  exhaustedSub: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: GAP.sm, marginBottom: GAP.xl },
  statChip: { flex: 1, backgroundColor: COLORS.card, borderRadius: RAD.md, paddingVertical: GAP.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum: { color: COLORS.primary, fontSize: TYPE.xl, fontWeight: '800' },
  statLbl: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2, textTransform: 'uppercase' },
  secLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.md },
  baseCard: { backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  baseRow: { flexDirection: 'row', alignItems: 'center' },
  baseImg: { width: 56, height: 56, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  baseName: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600' },
  baseCat: { color: COLORS.primary, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase' },
  slotTag: { backgroundColor: COLORS.accent + '20', paddingHorizontal: GAP.sm, paddingVertical: 1, borderRadius: RAD.sm },
  slotTxt: { color: COLORS.accent, fontSize: TYPE.xs, fontWeight: '600' },
  baseEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: GAP.md, gap: GAP.md },
  baseEmptyTxt: { color: COLORS.textMuted, fontSize: TYPE.sm },
  preview: { alignItems: 'center', width: 72 },
  previewSel: { backgroundColor: COLORS.primaryGlow, borderRadius: RAD.md, padding: GAP.xs },
  previewImg: { width: 60, height: 60, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  previewCat: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs },
  goBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RAD.lg, paddingVertical: GAP.lg, justifyContent: 'center', alignItems: 'center', gap: GAP.sm, marginTop: GAP.lg },
  goTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: GAP.lg, gap: GAP.sm, marginTop: GAP.sm },
  historyTxt: { color: COLORS.accent, fontSize: TYPE.base, fontWeight: '600' },
  occContainer: { marginBottom: GAP.xl },
  occInput: {
    backgroundColor: COLORS.card,
    borderRadius: RAD.md,
    padding: GAP.md,
    color: COLORS.text,
    fontSize: TYPE.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: GAP.sm,
  },
  occChip: {
    paddingHorizontal: GAP.lg,
    paddingVertical: GAP.sm,
    borderRadius: RAD.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  occChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  occChipTxt: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '600' },
  occChipTxtActive: { color: COLORS.bg },
});