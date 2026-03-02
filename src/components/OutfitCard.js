import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function OutfitCard({ outfit, wardrobe, onWear, onUnwear, onDelete, onPress }) {
  const topG = wardrobe.find((g) => g.id === outfit.topId);
  const botG = wardrobe.find((g) => g.id === outfit.bottomId);
  const isWorn = outfit.status === 'worn';
  const hasTryOn = !!outfit.tryOnImageUri;

  return (
    <TouchableOpacity
      style={[s.card, isWorn && s.cardWorn]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={s.imgRow}>
        {hasTryOn ? (
          <Image source={{ uri: outfit.tryOnImageUri }} style={s.tryOnThumb} />
        ) : (
          <>
            {topG ? (
              <Image source={{ uri: topG.imageUri }} style={s.img} />
            ) : (
              <View style={[s.img, s.ph]}><Ionicons name="shirt-outline" size={20} color={COLORS.textMuted} /></View>
            )}
            {outfit.bottomLabel !== 'N/A' && (
              botG ? (
                <Image source={{ uri: botG.imageUri }} style={s.img} />
              ) : (
                <View style={[s.img, s.ph]}><Ionicons name="cut-outline" size={20} color={COLORS.textMuted} /></View>
              )
            )}
          </>
        )}
      </View>

      <View style={s.info}>
        <Text style={s.topLabel} numberOfLines={1}>{outfit.topLabel}</Text>
        {outfit.bottomLabel !== 'N/A' && (
          <Text style={s.botLabel} numberOfLines={1}>+ {outfit.bottomLabel}</Text>
        )}
        <Text style={s.weather} numberOfLines={1}>{outfit.weather}</Text>
        <View style={s.tagRow}>
          {isWorn && (
            <View style={s.tag}>
              <Ionicons name="checkmark-circle" size={11} color={COLORS.green} />
              <Text style={[s.tagTxt, { color: COLORS.green }]}>{outfit.wornDate}</Text>
            </View>
          )}
          {hasTryOn && (
            <View style={[s.tag, { backgroundColor: COLORS.accentGlow }]}>
              <Ionicons name="person" size={11} color={COLORS.accent} />
              <Text style={[s.tagTxt, { color: COLORS.accent }]}>Try-On</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.actions}>
        {isWorn ? (
          <TouchableOpacity onPress={() => onUnwear?.(outfit.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.actBtn}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.orange} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onWear?.(outfit.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.actBtn}>
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.green} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete?.(outfit.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.actBtn}>
          <Ionicons name="trash-outline" size={17} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      {/* Chevron to show it's tappable */}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: GAP.xs }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RAD.lg,
    padding: GAP.md, marginBottom: GAP.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardWorn: { borderColor: COLORS.green + '40', backgroundColor: COLORS.green + '06' },
  imgRow: { flexDirection: 'row', gap: GAP.xs },
  img: { width: 48, height: 48, borderRadius: RAD.sm, backgroundColor: COLORS.cardLight },
  tryOnThumb: { width: 48, height: 64, borderRadius: RAD.sm, backgroundColor: COLORS.cardLight },
  ph: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: GAP.md },
  topLabel: { color: COLORS.text, fontSize: TYPE.sm, fontWeight: '600' },
  botLabel: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 1 },
  weather: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.xs },
  tagRow: { flexDirection: 'row', gap: GAP.sm, marginTop: GAP.xs, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.green + '12', paddingHorizontal: GAP.sm, paddingVertical: 1, borderRadius: RAD.full },
  tagTxt: { fontSize: 10, fontWeight: '600' },
  actions: { gap: GAP.sm, marginLeft: GAP.sm },
  actBtn: { padding: GAP.xs },
});