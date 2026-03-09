import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { todayStr } from '../utils/helpers';

const W = Dimensions.get('window').width;

export default function OutfitDetailScreen({ route, navigation }) {
  const { outfitId } = route.params;
  const { outfits, wardrobe, wearOutfit, unwearOutfit, fullBodyPhoto } = useApp();

  const outfit = outfits.find((o) => o.id === outfitId);
  const topG = wardrobe.find((g) => g.id === outfit?.topId);
  const botG = wardrobe.find((g) => g.id === outfit?.bottomId);
  const isWorn = outfit?.status === 'worn';

  if (!outfit) {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <View style={s.center}>
          <Text style={s.errTxt}>Outfit not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backLink}>
            <Text style={s.backLinkTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function Piece({ label, garment, title }) {
    if (!label || label === 'N/A') return null;
    return (
      <View style={s.piece}>
        <Text style={s.pieceTitle}>{title}</Text>
        <View style={s.pieceCard}>
          {garment ? (
            <>
              <Image source={{ uri: garment.imageUri }} style={s.pieceImg} />
              <View style={{ flex: 1, marginLeft: GAP.md }}>
                <Text style={s.pieceName}>{garment.summary}</Text>
                <Text style={s.pieceCat}>{garment.category}</Text>
                <Text style={s.pieceDesc} numberOfLines={3}>{garment.analyzed_garment}</Text>
              </View>
            </>
          ) : (
            <View style={s.noMatch}>
              <Ionicons name="help-circle-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.noMatchTxt}>"{label}"</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Outfit Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Try-on image if exists */}
        {outfit.tryOnImageUri && (
          <View style={s.tryOnSection}>
            <Text style={s.secLabel}>Virtual Try-On</Text>
            <Image source={{ uri: outfit.tryOnImageUri }} style={s.tryOnImg} resizeMode="contain" />
          </View>
        )}

        {/* Weather */}
        <View style={s.weatherCard}>
          <Ionicons name="partly-sunny" size={22} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: GAP.md }}>
            <Text style={s.weatherMain}>{outfit.weather}</Text>
            {outfit.weatherCity ? <Text style={s.weatherCity}>{outfit.weatherCity}</Text> : null}
          </View>
          {isWorn && (
            <View style={s.wornTag}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
              <Text style={s.wornTagTxt}>Worn {outfit.wornDate}</Text>
            </View>
          )}
        </View>

        {/* Garments */}
        <Text style={s.secLabel}>Outfit</Text>
        <Piece label={outfit.topLabel} garment={topG} title="Top / Upper" />
        <Piece label={outfit.bottomLabel} garment={botG} title="Bottom / Lower" />

        {/* Logic */}
        <View style={s.logicCard}>
          <View style={s.logicSec}>
            <View style={s.logicHdr}>
              <Ionicons name="color-palette-outline" size={18} color={COLORS.primary} />
              <Text style={s.logicTitle}>Color Logic</Text>
            </View>
            <Text style={s.logicBody}>{outfit.colorLogic}</Text>
          </View>
          <View style={s.logicDiv} />
          <View style={s.logicSec}>
            <View style={s.logicHdr}>
              <Ionicons name="body-outline" size={18} color={COLORS.accent} />
              <Text style={s.logicTitle}>Silhouette Logic</Text>
            </View>
            <Text style={s.logicBody}>{outfit.silhouetteLogic}</Text>
          </View>
        </View>

        {/* Actions */}
        {topG && (
          <TouchableOpacity
            style={s.tryOnBtn}
            onPress={() => navigation.navigate('TryOn', { outfitId: outfit.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={22} color={COLORS.bg} />
            <View style={{ flex: 1 }}>
              <Text style={s.tryOnBtnTxt}>
                {outfit.tryOnImageUri ? 'View / Redo Try-On' : 'Virtual Try-On'}
              </Text>
              <Text style={s.tryOnBtnSub}>
                {fullBodyPhoto ? 'See how this looks on you' : 'Add body photo in Me tab first'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.bg} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.wearBtn, isWorn && s.wornBtn]}
          onPress={() => isWorn ? unwearOutfit(outfit.id) : wearOutfit(outfit.id, todayStr())}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isWorn ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={22}
            color={isWorn ? COLORS.orange : COLORS.bg}
          />
          <Text style={[s.wearBtnTxt, isWorn && { color: COLORS.orange }]}>
            {isWorn ? 'Mark as Unworn' : 'Wear Today'}
          </Text>
        </TouchableOpacity>

        <Text style={s.dateTxt}>Generated {new Date(outfit.createdAt).toLocaleDateString()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errTxt: { color: COLORS.red, fontSize: TYPE.lg },
  backLink: { marginTop: GAP.lg },
  backLinkTxt: { color: COLORS.textDim, fontSize: TYPE.base },

  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge * 2 },

  secLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.md },

  tryOnSection: { marginBottom: GAP.xl },
  tryOnImg: { width: W - GAP.xl * 2, height: (W - GAP.xl * 2) * 1.33, borderRadius: RAD.lg, backgroundColor: COLORS.cardLight },

  weatherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.border },
  weatherMain: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600' },
  weatherCity: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
  wornTag: { flexDirection: 'row', alignItems: 'center', gap: GAP.xs, backgroundColor: COLORS.green + '15', paddingHorizontal: GAP.sm, paddingVertical: GAP.xs, borderRadius: RAD.full },
  wornTagTxt: { color: COLORS.green, fontSize: TYPE.xs, fontWeight: '600' },

  piece: { marginBottom: GAP.lg },
  pieceTitle: { color: COLORS.textMuted, fontSize: TYPE.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: GAP.sm },
  pieceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.lg, borderWidth: 1, borderColor: COLORS.primaryMuted },
  pieceImg: { width: 80, height: 80, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  pieceName: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  pieceCat: { color: COLORS.primary, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', marginTop: GAP.xs },
  pieceDesc: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs, lineHeight: 16 },
  noMatch: { flex: 1, alignItems: 'center', paddingVertical: GAP.md, gap: GAP.xs },
  noMatchTxt: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600' },

  logicCard: { backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.xl, marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.border },
  logicSec: { marginVertical: GAP.sm },
  logicHdr: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, marginBottom: GAP.sm },
  logicTitle: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '700' },
  logicBody: { color: COLORS.textDim, fontSize: TYPE.sm, lineHeight: 22 },
  logicDiv: { height: 1, backgroundColor: COLORS.border, marginVertical: GAP.md },

  tryOnBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: RAD.lg, padding: GAP.lg, gap: GAP.md, marginBottom: GAP.md },
  tryOnBtnTxt: { color: COLORS.bg, fontSize: TYPE.base, fontWeight: '700' },
  tryOnBtnSub: { color: COLORS.bg, fontSize: TYPE.xs, opacity: 0.7, marginTop: 1 },

  wearBtn: { flexDirection: 'row', backgroundColor: COLORS.green, borderRadius: RAD.lg, paddingVertical: GAP.lg, justifyContent: 'center', alignItems: 'center', gap: GAP.sm, marginBottom: GAP.lg },
  wornBtn: { backgroundColor: COLORS.orange + '15', borderWidth: 1, borderColor: COLORS.orange + '40' },
  wearBtnTxt: { color: COLORS.bg, fontSize: TYPE.base, fontWeight: '700' },

  dateTxt: { color: COLORS.textMuted, fontSize: TYPE.xs, textAlign: 'center' },
});