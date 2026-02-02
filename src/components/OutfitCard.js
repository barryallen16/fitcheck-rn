// src/components/OutfitCard.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function OutfitCard({ outfit, wardrobe, onWear, onUnwear, onDelete, onPress }) {
  const topG = wardrobe.find((g) => g.id === outfit.topId);
  const botG = wardrobe.find((g) => g.id === outfit.bottomId);
  const isWorn = outfit.status === 'worn';

  return (
    <TouchableOpacity
      style={[s.card, isWorn && s.cardWorn]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Images row */}
      <View style={s.imgRow}>
        {topG ? (
          <Image source={{ uri: topG.imageUri }} style={s.img} />
        ) : (
          <View style={[s.img, s.placeholder]}>
            <Ionicons name="shirt-outline" size={22} color={COLORS.textMuted} />
          </View>
        )}
        {outfit.bottomLabel !== 'N/A' && (
          botG ? (
            <Image source={{ uri: botG.imageUri }} style={s.img} />
          ) : (
            <View style={[s.img, s.placeholder]}>
              <Ionicons name="cut-outline" size={22} color={COLORS.textMuted} />
            </View>
          )
        )}
      </View>

      {/* Labels */}
      <View style={s.info}>
        <Text style={s.topLabel} numberOfLines={1}>{outfit.topLabel}</Text>
        {outfit.bottomLabel !== 'N/A' && (
          <Text style={s.botLabel} numberOfLines={1}>+ {outfit.bottomLabel}</Text>
        )}
        <Text style={s.weather} numberOfLines={1}>{outfit.weather}</Text>
        {isWorn && outfit.wornDate && (
          <View style={s.wornBadge}>
            <Ionicons name="checkmark-circle" size={12} color={COLORS.green} />
            <Text style={s.wornDate}>Worn {outfit.wornDate}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        {isWorn ? (
          <TouchableOpacity
            onPress={() => onUnwear?.(outfit.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.actionBtn}
          >
            <Ionicons name="close-circle-outline" size={20} color={COLORS.orange} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onWear?.(outfit.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.actionBtn}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.green} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete?.(outfit.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.actionBtn}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.red} />
        </TouchableOpacity>
      </View>
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
  cardWorn: { borderColor: COLORS.green + '40', backgroundColor: COLORS.green + '08' },
  imgRow: { flexDirection: 'row', gap: GAP.xs },
  img: { width: 50, height: 50, borderRadius: RAD.sm, backgroundColor: COLORS.cardLight },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: GAP.md },
  topLabel: { color: COLORS.text, fontSize: TYPE.sm, fontWeight: '600' },
  botLabel: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 1 },
  weather: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.xs },
  wornBadge: { flexDirection: 'row', alignItems: 'center', gap: GAP.xs, marginTop: GAP.xs },
  wornDate: { color: COLORS.green, fontSize: TYPE.xs },
  actions: { gap: GAP.sm, marginLeft: GAP.sm },
  actionBtn: { padding: GAP.xs },
});