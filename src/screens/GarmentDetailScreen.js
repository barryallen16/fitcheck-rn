import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobe } from '../context/WardrobeContext';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const W = Dimensions.get('window').width;

export default function GarmentDetailScreen({ route, navigation }) {
  const { garment } = route.params;
  const { removeGarment } = useWardrobe();

  function handleDel() {
    Alert.alert('Remove', `Remove "${garment.summary}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeGarment(garment.id); navigation.goBack(); } },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.circle}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDel} style={s.circle}>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          </TouchableOpacity>
        </View>

        <Image source={{ uri: garment.imageUri }} style={s.img} resizeMode="cover" />

        <View style={s.body}>
          <View style={s.catBadge}>
            <Text style={s.catTxt}>{garment.category}</Text>
          </View>
          <Text style={s.title}>{garment.summary}</Text>

          <Text style={s.secLabel}>Analysis</Text>
          <Text style={s.desc}>{garment.analyzed_garment}</Text>

          <Text style={s.secLabel}>Added</Text>
          <Text style={s.date}>
            {new Date(garment.addedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md },
  circle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center',
  },
  img: { width: W - GAP.lg * 2, height: W - GAP.lg * 2, borderRadius: RAD.lg, alignSelf: 'center', backgroundColor: COLORS.cardLight },
  body: { paddingHorizontal: GAP.xl, paddingTop: GAP.xl, paddingBottom: GAP.huge },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: GAP.md, paddingVertical: GAP.xs, borderRadius: RAD.full,
    borderWidth: 1, borderColor: COLORS.primaryMuted, marginBottom: GAP.md,
  },
  catTxt: { color: COLORS.primary, fontSize: TYPE.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: COLORS.text, fontSize: TYPE.xxl, fontWeight: '700', marginBottom: GAP.xl },
  secLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.sm },
  desc: { color: COLORS.text, fontSize: TYPE.base, lineHeight: 24, marginBottom: GAP.xl },
  date: { color: COLORS.textDim, fontSize: TYPE.base },
});