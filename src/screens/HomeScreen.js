import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import PersonaBar from '../components/PersonaBar';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { Image } from 'expo-image';
export default function HomeScreen() {
  const { active, wardrobe, outfits, fullBodyPhoto, serverUrl, serverOk, modelName, setServerUrl, ping } = useApp();
  const [showCfg, setShowCfg] = useState(false);
  const [urlDraft, setUrlDraft] = useState(serverUrl);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
const blurhash = 'L79i;qIq0yxHoaoLoMWV02%0}@NZ';

  useFocusEffect(useCallback(() => { ping(); }, []));

  async function handleConnect() {
    const url = urlDraft.trim();
    if (!url) { setBanner({ message: 'Enter a URL', type: 'error' }); return; }
    setConnecting(true);
    const r = await setServerUrl(url);
    setConnecting(false);
    r.ok ? setBanner({ message: `Connected — ${r.model || 'model loaded'}`, type: 'success' }) : setBanner({ message: `Failed: ${r.error}`, type: 'error' });
    if (r.ok) setShowCfg(false);
  }

  const cats = new Set(wardrobe.map((g) => g.category)).size;
  const worn = outfits.filter((o) => o.status === 'worn').length;
  const unworn = outfits.filter((o) => o.status === 'unworn').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}

      <PersonaBar />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await ping(); setRefreshing(false); }} tintColor={COLORS.primary} />}
      >
        <View style={s.logoWrap}>
  <Image
    style={s.logoCircle} // <-- Applied your unused style here for dimensions!
    source={require('../../assets/logo-placeholder-bk.png')} // <-- Wrapped path in require()
    placeholder={{ blurhash }}
    contentFit="cover"
    transition={1000}
  />
  <Text style={s.tagline}>AI-Powered Outfit Recommendations</Text>
</View>

        {/* Server */}
        <TouchableOpacity style={[s.statusCard, serverOk ? s.statusGreen : s.statusRed]} onPress={() => setShowCfg((p) => !p)} activeOpacity={0.7}>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: serverOk ? COLORS.green : COLORS.red }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.statusTxt}>{serverOk ? 'LM Studio Connected' : 'LM Studio Disconnected'}</Text>
              {serverOk && modelName && <Text style={s.modelTxt} numberOfLines={1}>{modelName}</Text>}
            </View>
            <Ionicons name={showCfg ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textDim} />
          </View>
          {showCfg && (
            <View style={s.cfgBox}>
              <Text style={s.cfgLabel}>Server URL</Text>
              <View style={s.urlRow}>
                <TextInput style={s.urlInput} value={urlDraft} onChangeText={setUrlDraft} placeholder="http://192.168.1.x:1234" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                <TouchableOpacity style={[s.connectBtn, connecting && { opacity: 0.5 }]} onPress={handleConnect} disabled={connecting}>
                  <Text style={s.connectTxt}>{connecting ? '...' : 'Go'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={s.statsGrid}>
          <View style={s.statBox}><Text style={s.statNum}>{wardrobe.length}</Text><Text style={s.statLbl}>Garments</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{cats}</Text><Text style={s.statLbl}>Categories</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{unworn}</Text><Text style={s.statLbl}>Unworn</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{worn}</Text><Text style={s.statLbl}>Worn</Text></View>
        </View>

        {/* Quick status */}
        {!fullBodyPhoto && (
          <View style={s.tipCard}>
            <Ionicons name="person-outline" size={20} color={COLORS.orange} />
            <Text style={s.tipTxt}>Add a full-body photo in the "Me" tab for virtual try-on</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: GAP.xl, paddingBottom: GAP.huge },
  logoWrap: { alignItems: 'center', paddingTop: GAP.xxl, paddingBottom: GAP.lg },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center', marginBottom: GAP.md, borderWidth: 2, borderColor: COLORS.primaryMuted },
  appName: { fontSize: TYPE.hero, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  tagline: { fontSize: TYPE.sm, color: COLORS.textDim, marginTop: GAP.xs },
  personaLabel: { fontSize: TYPE.xs, color: COLORS.textMuted, marginTop: GAP.sm, textTransform: 'uppercase', letterSpacing: 1 },
  statusCard: { borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.lg, borderWidth: 1 },
  statusGreen: { backgroundColor: 'rgba(67,184,104,0.06)', borderColor: 'rgba(67,184,104,0.25)' },
  statusRed: { backgroundColor: 'rgba(232,84,84,0.06)', borderColor: 'rgba(232,84,84,0.25)' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: GAP.sm },
  statusTxt: { color: COLORS.text, fontSize: TYPE.base, fontWeight: '500' },
  modelTxt: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
  cfgBox: { marginTop: GAP.lg, paddingTop: GAP.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  cfgLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: GAP.sm },
  urlRow: { flexDirection: 'row', gap: GAP.sm },
  urlInput: { flex: 1, backgroundColor: COLORS.cardLight, color: COLORS.text, borderRadius: RAD.sm, paddingHorizontal: GAP.md, paddingVertical: GAP.sm, fontSize: TYPE.sm, borderWidth: 1, borderColor: COLORS.border },
  connectBtn: { backgroundColor: COLORS.primary, borderRadius: RAD.sm, paddingHorizontal: GAP.lg, justifyContent: 'center' },
  connectTxt: { color: COLORS.bg, fontSize: TYPE.sm, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP.sm, marginBottom: GAP.lg },
  statBox: { width: '48%', backgroundColor: COLORS.card, borderRadius: RAD.md, padding: GAP.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum: { fontSize: TYPE.xxl, fontWeight: '800', color: COLORS.primary },
  statLbl: { fontSize: TYPE.xs, color: COLORS.textDim, marginTop: GAP.xs, textTransform: 'uppercase' },
  tipCard: { flexDirection: 'row', gap: GAP.sm, backgroundColor: COLORS.orange + '10', borderRadius: RAD.md, padding: GAP.md, borderWidth: 1, borderColor: COLORS.orange + '25' },
  tipTxt: { flex: 1, color: COLORS.orange, fontSize: TYPE.sm },
});