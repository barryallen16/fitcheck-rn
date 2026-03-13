// src/screens/RecommendationScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobe } from '../context/WardrobeContext';
import lm from '../services/lmStudioService';
import weather from '../services/weatherService';
import LoadingOverlay from '../components/LoadingOverlay';
import ErrorBanner from '../components/ErrorBanner';
import BaseGarmentSelector from '../components/BaseGarmentSelector';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const TOP_CATS = ['Kurti', 'Top', 'Shirt', 'Blazer', 'Jacket', 'Sherwani'];
const BOTTOM_CATS = ['Palazzo', 'Churidar', 'Salwar', 'Jeans', 'Pants', 'Skirt'];
const FULL_CATS = ['Saree', 'Lehenga', 'Anarkali', 'Dress', 'Gown'];

function getSlotLabel(category) {
  if (TOP_CATS.includes(category)) return 'Top';
  if (BOTTOM_CATS.includes(category)) return 'Bottom';
  if (FULL_CATS.includes(category)) return 'Full-body';
  return 'Accessory';
}

export default function RecommendationScreen({ navigation }) {
  const { wardrobe, serverOk } = useWardrobe();
  const [baseId, setBaseId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [loadSub, setLoadSub] = useState('');
  const [banner, setBanner] = useState(null);

  const base = wardrobe.find((g) => g.id === baseId);

  const topCount = wardrobe.filter((g) => TOP_CATS.includes(g.category) || FULL_CATS.includes(g.category)).length;
  const botCount = wardrobe.filter((g) => BOTTOM_CATS.includes(g.category)).length;
  const canRecommend = wardrobe.length >= 2 && (topCount >= 1);

  async function go() {
    if (!serverOk) {
      setBanner({ message: 'LM Studio not connected', type: 'error' });
      return;
    }
    if (!canRecommend) {
      setBanner({
        message: `Need at least 1 top/full-body garment. You have ${topCount} tops, ${botCount} bottoms.`,
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      setLoadMsg('Checking Weather');
      setLoadSub('Getting local conditions…');
      const w = await weather.get();

      setLoadMsg('Styling Your Outfit');
      setLoadSub(`Analyzing ${wardrobe.length} garments${base ? ` around "${base.summary}"` : ''}…`);
      const rec = await lm.getRecommendation(w.formatted, wardrobe, baseId);

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
      {banner && (
        <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />
      )}
      {loading && <LoadingOverlay message={loadMsg} sub={loadSub} />}

      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Get Recommendation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Wardrobe Stats */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{topCount}</Text>
            <Text style={s.statLbl}>Tops</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{botCount}</Text>
            <Text style={s.statLbl}>Bottoms</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{wardrobe.length}</Text>
            <Text style={s.statLbl}>Total</Text>
          </View>
        </View>

        {/* Base Garment */}
        <Text style={s.secLabel}>Base Garment (Optional)</Text>
        <Text style={s.secHint}>Pick a garment the outfit must include</Text>
        <TouchableOpacity style={s.baseCard} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          {base ? (
            <View style={s.baseRow}>
              <Image source={{ uri: base.imageUri }} style={s.baseImg} />
              <View style={{ flex: 1, marginLeft: GAP.md }}>
                <Text style={s.baseName}>{base.summary}</Text>
                <View style={s.baseTagRow}>
                  <Text style={s.baseCat}>{base.category}</Text>
                  <View style={s.baseSlotTag}>
                    <Text style={s.baseSlotTxt}>{getSlotLabel(base.category)}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setBaseId(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
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

        {/* Wardrobe Preview */}
        <Text style={s.secLabel}>Your Wardrobe</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: GAP.xxl }}
          contentContainerStyle={{ gap: GAP.sm }}
        >
          {wardrobe.map((g) => (
            <View key={g.id} style={[s.preview, baseId === g.id && s.previewSelected]}>
              <Image source={{ uri: g.imageUri }} style={s.previewImg} />
              <Text style={s.previewCat} numberOfLines={1}>{g.category}</Text>
              <Text style={s.previewSlot}>{getSlotLabel(g.category)}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Generate */}
        <TouchableOpacity
          style={[s.goBtn, !canRecommend && { opacity: 0.4 }]}
          onPress={go}
          activeOpacity={0.8}
          disabled={!canRecommend}
        >
          <Ionicons name="sparkles" size={24} color={COLORS.bg} />
          <Text style={s.goTxt}>Generate Outfit</Text>
        </TouchableOpacity>

        {!canRecommend && (
          <Text style={s.cantHint}>
            Add at least 1 top/full-body garment and 1 bottom garment
          </Text>
        )}
      </ScrollView>

      <BaseGarmentSelector
        visible={showPicker}
        wardrobe={wardrobe}
        selectedId={baseId}
        onSelect={setBaseId}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GAP.lg, paddingVertical: GAP.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge },

  statsRow: {
    flexDirection: 'row', gap: GAP.sm, marginBottom: GAP.xl,
  },
  statChip: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RAD.md,
    paddingVertical: GAP.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  statNum: { color: COLORS.primary, fontSize: TYPE.xl, fontWeight: '800' },
  statLbl: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2, textTransform: 'uppercase' },

  secLabel: {
    color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.xs,
  },
  secHint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginBottom: GAP.md },

  baseCard: {
    backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.xl,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  baseRow: { flexDirection: 'row', alignItems: 'center' },
  baseImg: { width: 56, height: 56, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  baseName: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600' },
  baseTagRow: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, marginTop: GAP.xs },
  baseCat: { color: COLORS.primary, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase' },
  baseSlotTag: {
    backgroundColor: COLORS.accent + '20', paddingHorizontal: GAP.sm,
    paddingVertical: 1, borderRadius: RAD.sm,
  },
  baseSlotTxt: { color: COLORS.accent, fontSize: TYPE.xs, fontWeight: '600' },
  baseEmpty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: GAP.md, gap: GAP.md,
  },
  baseEmptyTxt: { color: COLORS.textMuted, fontSize: TYPE.sm },

  preview: { alignItems: 'center', width: 72 },
  previewSelected: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RAD.md, padding: GAP.xs,
  },
  previewImg: { width: 60, height: 60, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  previewCat: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs },
  previewSlot: { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },

  goBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RAD.lg,
    paddingVertical: GAP.lg, justifyContent: 'center', alignItems: 'center',
    gap: GAP.sm, marginTop: GAP.lg,
  },
  goTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },
  cantHint: {
    color: COLORS.textMuted, fontSize: TYPE.xs, textAlign: 'center', marginTop: GAP.md,
  },
});