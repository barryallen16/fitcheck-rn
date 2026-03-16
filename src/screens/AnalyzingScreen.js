import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import lm from '../services/lmStudioService';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function AnalyzingScreen({ route, navigation }) {
  const { images } = route.params;
  const { addGarment } = useApp();
  const [results, setResults] = useState([]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => { run(); }, []);

  async function run() {
    const out = [];
    for (let i = 0; i < images.length; i++) {
      setIdx(i);
      Animated.timing(prog, { toValue: (i + 0.3) / images.length, duration: 250, useNativeDriver: false }).start();
      try {
        const analysis = await lm.analyzeGarment(images[i].uri);
        // addGarment now handles persistImage internally
        const g = await addGarment({ ...analysis, imageUri: images[i].uri });
        out.push({ ok: true, garment: g, imageUri: images[i].uri });
      } catch (err) {
        out.push({ ok: false, error: err.message, imageUri: images[i].uri });
      }
      Animated.timing(prog, { toValue: (i + 1) / images.length, duration: 250, useNativeDriver: false }).start();
    }
    setResults(out); setDone(true);
  }

  const okC = results.filter((r) => r.ok).length;
  const failC = results.filter((r) => !r.ok).length;
  const pW = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (!done) return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrTxt}>Analyzing Garments</Text></View>
      <View style={s.center}>
        <Image source={{ uri: images[idx]?.uri }} style={s.curImg} />
        <Text style={s.curTxt}>Analyzing {idx + 1} of {images.length}…</Text>
        <View style={s.bar}><Animated.View style={[s.fill, { width: pW }]} /></View>
        <Text style={s.hint}>VLM inspecting colors, fabric, cut & details</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrTxt}>Complete</Text></View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.summary}>
          {okC > 0 && <View style={s.sumItem}><Ionicons name="checkmark-circle" size={26} color={COLORS.green} /><Text style={s.sumNum}>{okC}</Text><Text style={s.sumLbl}>Done</Text></View>}
          {failC > 0 && <View style={s.sumItem}><Ionicons name="alert-circle" size={26} color={COLORS.red} /><Text style={[s.sumNum, { color: COLORS.red }]}>{failC}</Text><Text style={s.sumLbl}>Failed</Text></View>}
        </View>
        {results.map((r, i) => (
          <View key={i} style={[s.resCard, !r.ok && s.resErr]}>
            <Image source={{ uri: r.imageUri }} style={s.resImg} />
            <View style={{ flex: 1, marginHorizontal: GAP.md }}>
              {r.ok ? (<><Text style={s.resTitle}>{r.garment.summary}</Text><Text style={s.resCat}>{r.garment.category}</Text></>) : (<><Text style={s.errTitle}>Failed</Text><Text style={s.errMsg} numberOfLines={2}>{r.error}</Text></>)}
            </View>
            <Ionicons name={r.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={r.ok ? COLORS.green : COLORS.red} />
          </View>
        ))}
        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.getParent()?.goBack?.() || navigation.popToTop()}>
          <Text style={s.doneTxt}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  hdr: { paddingHorizontal: GAP.lg, paddingVertical: GAP.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTxt: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GAP.xxxl },
  curImg: { width: 160, height: 160, borderRadius: RAD.lg, marginBottom: GAP.xxl, backgroundColor: COLORS.cardLight },
  curTxt: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600', marginBottom: GAP.lg },
  bar: { width: '100%', height: 5, backgroundColor: COLORS.cardLight, borderRadius: 3, overflow: 'hidden', marginBottom: GAP.lg },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  hint: { color: COLORS.textMuted, fontSize: TYPE.sm, textAlign: 'center' },
  scroll: { paddingHorizontal: GAP.lg, paddingVertical: GAP.lg, paddingBottom: GAP.huge },
  summary: { flexDirection: 'row', justifyContent: 'center', gap: GAP.huge, backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.xl, marginBottom: GAP.lg, borderWidth: 1, borderColor: COLORS.border },
  sumItem: { alignItems: 'center' },
  sumNum: { color: COLORS.text, fontSize: TYPE.xxl, fontWeight: '800', marginTop: GAP.xs },
  sumLbl: { color: COLORS.textDim, fontSize: TYPE.xs, textTransform: 'uppercase' },
  resCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RAD.md, padding: GAP.md, marginBottom: GAP.sm, borderWidth: 1, borderColor: COLORS.border },
  resErr: { borderColor: COLORS.redMuted },
  resImg: { width: 48, height: 48, borderRadius: RAD.sm, backgroundColor: COLORS.cardLight },
  resTitle: { color: COLORS.text, fontSize: TYPE.sm, fontWeight: '600' },
  resCat: { color: COLORS.primary, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  errTitle: { color: COLORS.red, fontSize: TYPE.sm, fontWeight: '600' },
  errMsg: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: RAD.lg, paddingVertical: GAP.lg, alignItems: 'center', marginTop: GAP.lg },
  doneTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },
});