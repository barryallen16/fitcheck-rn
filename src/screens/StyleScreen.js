import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import PersonaBar from '../components/PersonaBar';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { getMaxOutfits, getUnusedCombinations } from '../utils/helpers';

export default function StyleScreen({ navigation }) {
  const { wardrobe, outfits, serverOk } = useApp();
  const max = getMaxOutfits(wardrobe);
  const unused = getUnusedCombinations(wardrobe, outfits).length;
  const worn = outfits.filter((o) => o.status === 'worn').length;

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <PersonaBar />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Style</Text>

        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNum}>{outfits.length}</Text><Text style={s.statLbl}>Generated</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{unused}</Text><Text style={s.statLbl}>Remaining</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{worn}</Text><Text style={s.statLbl}>Worn</Text></View>
        </View>

        <TouchableOpacity style={s.mainBtn} onPress={() => navigation.navigate('Recommendation')} activeOpacity={0.8}>
          <Ionicons name="sparkles" size={28} color={COLORS.bg} />
          <View style={{ flex: 1 }}>
            <Text style={s.mainTxt}>Get Outfit Recommendation</Text>
            <Text style={s.mainSub}>{unused > 0 ? `${unused} combinations available` : wardrobe.length < 2 ? 'Add more garments first' : 'All combos generated!'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.bg} />
        </TouchableOpacity>

        <TouchableOpacity style={s.secBtn} onPress={() => navigation.navigate('OutfitHistory')} activeOpacity={0.8}>
          <Ionicons name="layers-outline" size={22} color={COLORS.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.secTxt}>Outfit History</Text>
            <Text style={s.secSub}>{outfits.length} outfits saved</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.secBtn} onPress={() => navigation.navigate('OutfitCalendar')} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.secTxt}>Outfit Calendar</Text>
            <Text style={s.secSub}>Track what you wore</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: GAP.xl, paddingBottom: GAP.huge },
  title: { color: COLORS.text, fontSize: TYPE.xxl, fontWeight: '800', marginTop: GAP.lg, marginBottom: GAP.lg },
  statsRow: { flexDirection: 'row', gap: GAP.sm, marginBottom: GAP.xl },
  stat: { flex: 1, backgroundColor: COLORS.card, borderRadius: RAD.md, paddingVertical: GAP.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum: { color: COLORS.primary, fontSize: TYPE.xl, fontWeight: '800' },
  statLbl: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2, textTransform: 'uppercase' },
  mainBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: RAD.lg, padding: GAP.lg, gap: GAP.md, marginBottom: GAP.md },
  mainTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },
  mainSub: { color: COLORS.bg, fontSize: TYPE.xs, opacity: 0.7, marginTop: 2 },
  secBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.lg, gap: GAP.md, marginBottom: GAP.md, borderWidth: 1, borderColor: COLORS.border },
  secTxt: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600' },
  secSub: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
});