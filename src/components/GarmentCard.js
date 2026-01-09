import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const CAT_CLR = {
  Kurti:'#FF8A65', Lehenga:'#CE93D8', Dupatta:'#80CBC4', Palazzo:'#90CAF9',
  Churidar:'#A5D6A7', Salwar:'#FFE082', Saree:'#EF5350', Sherwani:'#7986CB',
  Anarkali:'#F48FB1', Dress:'#80DEEA', Gown:'#B39DDB', Skirt:'#FFAB91',
  Jeans:'#64B5F6', Pants:'#81C784', Blazer:'#FFD54F', Jacket:'#4DD0E1',
  Top:'#FF8A80', Shirt:'#82B1FF',
};

export default function GarmentCard({ garment, onPress, onDelete, isSelected, selectable }) {
  const cc = CAT_CLR[garment.category] || COLORS.primary;

  return (
    <TouchableOpacity
      style={[s.card, isSelected && s.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {selectable && (
        <View style={[s.check, isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
          {isSelected && <Ionicons name="checkmark" size={13} color={COLORS.bg} />}
        </View>
      )}

      <Image source={{ uri: garment.imageUri }} style={s.img} />

      <View style={s.info}>
        <View style={[s.badge, { backgroundColor: cc + '22' }]}>
          <Text style={[s.badgeTxt, { color: cc }]}>{garment.category}</Text>
        </View>
        <Text style={s.title} numberOfLines={2}>{garment.summary}</Text>
        <Text style={s.desc} numberOfLines={2}>{garment.analyzed_garment}</Text>
      </View>

      {onDelete && (
        <TouchableOpacity
          style={s.del}
          onPress={() => onDelete(garment.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={17} color={COLORS.red} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RAD.lg,
    padding: GAP.md, marginBottom: GAP.md, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  selected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  check: {
    position: 'absolute', top: GAP.sm, left: GAP.sm, width: 21, height: 21,
    borderRadius: 11, borderWidth: 2, borderColor: COLORS.textMuted, zIndex: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  img: { width: 76, height: 76, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  info: { flex: 1, marginLeft: GAP.md },
  badge: { alignSelf: 'flex-start', paddingHorizontal: GAP.sm, paddingVertical: 2, borderRadius: RAD.sm, marginBottom: GAP.xs },
  badgeTxt: { fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600', marginBottom: GAP.xs },
  desc: { color: COLORS.textDim, fontSize: TYPE.xs, lineHeight: 16 },
  del: { padding: GAP.sm, marginLeft: GAP.sm },
});