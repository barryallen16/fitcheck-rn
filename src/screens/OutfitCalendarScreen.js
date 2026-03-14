// src/screens/OutfitCalendarScreen.js
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

import SimpleCalendar from '../components/SimpleCalendar';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function OutfitCalendarScreen({ navigation }) {
  const { outfits, wardrobe, outfitsForDate } =  useApp();
  const [selectedDate, setSelectedDate] = useState(null);

  // Build map of dates that have outfits
  const markedDates = useMemo(() => {
    const map = {};
    outfits.forEach((o) => {
      if (o.status === 'worn' && o.wornDate) map[o.wornDate] = true;
    });
    return map;
  }, [outfits]);

  const dayOutfits = selectedDate ? outfitsForDate(selectedDate) : [];

  function formatDate(ds) {
    if (!ds) return '';
    const [y, m, d] = ds.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Outfit Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SimpleCalendar
          markedDates={markedDates}
          selectedDate={selectedDate}
          onDayPress={setSelectedDate}
        />

        {selectedDate && (
          <View style={s.daySection}>
            <Text style={s.dayTitle}>{formatDate(selectedDate)}</Text>

            {dayOutfits.length === 0 ? (
              <View style={s.noOutfit}>
                <Ionicons name="shirt-outline" size={32} color={COLORS.textMuted} />
                <Text style={s.noOutfitTxt}>No outfit worn this day</Text>
              </View>
            ) : (
              dayOutfits.map((outfit) => {
                const topG = wardrobe.find((g) => g.id === outfit.topId);
                const botG = wardrobe.find((g) => g.id === outfit.bottomId);

                return (
                  <View key={outfit.id} style={s.outfitCard}>
                    <View style={s.outfitImgs}>
                      {topG ? (
                        <Image source={{ uri: topG.imageUri }} style={s.outfitImg} />
                      ) : (
                        <View style={[s.outfitImg, s.ph]}><Ionicons name="shirt-outline" size={20} color={COLORS.textMuted} /></View>
                      )}
                      {outfit.bottomLabel !== 'N/A' && (
                        botG ? (
                          <Image source={{ uri: botG.imageUri }} style={s.outfitImg} />
                        ) : (
                          <View style={[s.outfitImg, s.ph]}><Ionicons name="cut-outline" size={20} color={COLORS.textMuted} /></View>
                        )
                      )}
                    </View>
                    <View style={s.outfitInfo}>
                      <Text style={s.outfitTop} numberOfLines={1}>{outfit.topLabel}</Text>
                      {outfit.bottomLabel !== 'N/A' && (
                        <Text style={s.outfitBot} numberOfLines={1}>+ {outfit.bottomLabel}</Text>
                      )}
                      <Text style={s.outfitWeather}>{outfit.weather}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {!selectedDate && (
          <View style={s.hint}>
            <Ionicons name="hand-left-outline" size={24} color={COLORS.textMuted} />
            <Text style={s.hintTxt}>Tap a date to see what you wore</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.lg, paddingTop: GAP.lg, paddingBottom: GAP.huge },
  daySection: { marginTop: GAP.xl },
  dayTitle: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700', marginBottom: GAP.md },
  noOutfit: { alignItems: 'center', paddingVertical: GAP.xxxl, gap: GAP.sm },
  noOutfitTxt: { color: COLORS.textMuted, fontSize: TYPE.sm },
  outfitCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.md, marginBottom: GAP.md, borderWidth: 1, borderColor: COLORS.green + '30', alignItems: 'center' },
  outfitImgs: { flexDirection: 'row', gap: GAP.xs },
  outfitImg: { width: 56, height: 56, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  ph: { justifyContent: 'center', alignItems: 'center' },
  outfitInfo: { flex: 1, marginLeft: GAP.md },
  outfitTop: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '600' },
  outfitBot: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: 2 },
  outfitWeather: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.xs },
  hint: { alignItems: 'center', paddingVertical: GAP.xxxl, gap: GAP.md },
  hintTxt: { color: COLORS.textMuted, fontSize: TYPE.sm },
});