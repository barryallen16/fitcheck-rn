// src/screens/ResultScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function ResultScreen({ route, navigation }) {
  const { recommendation: rec, weather: w, wardrobe } = route.params;

  // Use pre-matched garments from validation, fallback to label search
  const topG = rec._topGarment || findInWardrobe(rec.top_label, wardrobe);
  const botG = rec._bottomGarment || findInWardrobe(rec.bottom_label, wardrobe);

  function findInWardrobe(label, wd) {
    if (!label || label === 'N/A') return null;
    const lo = label.toLowerCase().trim();
    return wd.find((g) => g.summary.toLowerCase().trim() === lo)
      || wd.find((g) => lo.includes(g.summary.toLowerCase()) || g.summary.toLowerCase().includes(lo))
      || null;
  }

  function weatherIcon() {
    const d = w.description.toLowerCase();
    if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'rainy';
    if (d.includes('cloud') || d.includes('overcast')) return 'cloudy';
    if (d.includes('snow')) return 'snow';
    if (d.includes('thunder')) return 'thunderstorm';
    return 'sunny';
  }

  function Piece({ label, garment, title }) {
    if (!label || label === 'N/A') return null;
    return (
      <View style={s.piece}>
        <Text style={s.pieceLabel}>{title}</Text>
        <View style={[s.pieceCard, garment && s.pieceCardMatched]}>
          {garment ? (
            <>
              <Image source={{ uri: garment.imageUri }} style={s.pieceImg} />
              <View style={{ flex: 1, marginLeft: GAP.md }}>
                <Text style={s.pieceName}>{garment.summary}</Text>
                <Text style={s.pieceCat}>{garment.category}</Text>
                <Text style={s.pieceDesc} numberOfLines={2}>{garment.analyzed_garment}</Text>
              </View>
            </>
          ) : (
            <View style={s.pieceNoMatch}>
              <Ionicons name="help-circle-outline" size={30} color={COLORS.textMuted} />
              <Text style={s.pieceNoMatchTxt}>"{label}"</Text>
              <Text style={s.pieceNoMatchHint}>Could not match to wardrobe</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Your Outfit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Weather */}
        <View style={s.weatherCard}>
          <Ionicons name={weatherIcon()} size={28} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: GAP.md }}>
            <Text style={s.weatherMain}>{w.formatted}</Text>
            <Text style={s.weatherCity}>{w.city}{w.fallback ? ' (estimated)' : ''}</Text>
          </View>
        </View>

        <Text style={s.secLabel}>Recommended Outfit</Text>

        <Piece label={rec.top_label} garment={topG} title="Top / Upper" />
        <Piece label={rec.bottom_label} garment={botG} title="Bottom / Lower" />

        {/* Duplicate warning */}
        {topG && botG && topG.id === botG.id && (
          <View style={s.warnCard}>
            <Ionicons name="warning-outline" size={18} color={COLORS.orange} />
            <Text style={s.warnTxt}>Same garment suggested for both — try generating again</Text>
          </View>
        )}

        {/* Logic */}
        <View style={s.logicCard}>
          <View style={s.logicSec}>
            <View style={s.logicHdr}>
              <Ionicons name="color-palette-outline" size={20} color={COLORS.primary} />
              <Text style={s.logicTitle}>Color Logic</Text>
            </View>
            <Text style={s.logicBody}>{rec.colorLogic}</Text>
          </View>
          <View style={s.logicDiv} />
          <View style={s.logicSec}>
            <View style={s.logicHdr}>
              <Ionicons name="body-outline" size={20} color={COLORS.accent} />
              <Text style={s.logicTitle}>Silhouette Logic</Text>
            </View>
            <Text style={s.logicBody}>{rec.silhouetteLogic}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
          <Text style={s.retryTxt}>Try Another Outfit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.8}>
          <Text style={s.homeTxt}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge * 2 },

  weatherCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  weatherMain: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  weatherCity: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: 2 },

  secLabel: {
    color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.md,
  },

  piece: { marginBottom: GAP.lg },
  pieceLabel: {
    color: COLORS.textMuted, fontSize: TYPE.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: GAP.sm,
  },
  pieceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RAD.lg, padding: GAP.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  pieceCardMatched: {
    borderColor: COLORS.primaryMuted,
  },
  pieceImg: { width: 80, height: 80, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  pieceName: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  pieceCat: {
    color: COLORS.primary, fontSize: TYPE.xs, fontWeight: '700',
    textTransform: 'uppercase', marginTop: GAP.xs,
  },
  pieceDesc: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs, lineHeight: 16 },
  pieceNoMatch: { flex: 1, alignItems: 'center', paddingVertical: GAP.md, gap: GAP.xs },
  pieceNoMatchTxt: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600', textAlign: 'center' },
  pieceNoMatchHint: { color: COLORS.textMuted, fontSize: TYPE.xs },

  warnCard: {
    flexDirection: 'row', alignItems: 'center', gap: GAP.sm,
    backgroundColor: 'rgba(232,144,64,0.08)', borderRadius: RAD.md,
    padding: GAP.md, marginBottom: GAP.lg,
    borderWidth: 1, borderColor: 'rgba(232,144,64,0.25)',
  },
  warnTxt: { flex: 1, color: COLORS.orange, fontSize: TYPE.sm },

  logicCard: {
    backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.xl,
    marginTop: GAP.sm, marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  logicSec: { marginVertical: GAP.sm },
  logicHdr: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, marginBottom: GAP.sm },
  logicTitle: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '700' },
  logicBody: { color: COLORS.textDim, fontSize: TYPE.sm, lineHeight: 22 },
  logicDiv: { height: 1, backgroundColor: COLORS.border, marginVertical: GAP.md },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow, borderRadius: RAD.lg, paddingVertical: GAP.lg,
    gap: GAP.sm, borderWidth: 1, borderColor: COLORS.primaryMuted, marginBottom: GAP.md,
  },
  retryTxt: { color: COLORS.primary, fontSize: TYPE.base, fontWeight: '700' },

  homeBtn: { alignItems: 'center', paddingVertical: GAP.lg },
  homeTxt: { color: COLORS.textDim, fontSize: TYPE.base, fontWeight: '500' },
});