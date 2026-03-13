import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useWardrobe } from '../context/WardrobeContext';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const { wardrobe, serverUrl, serverOk, modelName, setServerUrl, ping } = useWardrobe();
  const [showCfg, setShowCfg] = useState(false);
  const [urlDraft, setUrlDraft] = useState(serverUrl);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { ping(); }, []));

  async function handleConnect() {
    const url = urlDraft.trim();
    if (!url) { setBanner({ message: 'Enter a server URL', type: 'error' }); return; }
    setConnecting(true);
    const r = await setServerUrl(url);
    setConnecting(false);
    if (r.ok) {
      setBanner({ message: `Connected — model: ${r.model || 'loaded'}`, type: 'success' });
      setShowCfg(false);
    } else {
      setBanner({ message: `Failed: ${r.error}`, type: 'error' });
    }
  }

  async function onRefresh() { setRefreshing(true); await ping(); setRefreshing(false); }

  const catCount = new Set(wardrobe.map((g) => g.category)).size;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Logo ─────────────────────── */}
        <View style={s.logoWrap}>
          {/* REPLACE this View with <Image source={require('../../assets/logo-placeholder.png')} style={s.logoImg} /> */}
          <View style={s.logoCircle}>
            <Ionicons name="shirt" size={44} color={COLORS.primary} />
          </View>
          <Text style={s.appName}>FitCheck</Text>
          <Text style={s.tagline}>AI-Powered Outfit Recommendations</Text>
        </View>

        {/* ── Server Status ────────────── */}
        <TouchableOpacity
          style={[s.statusCard, serverOk ? s.statusGreen : s.statusRed]}
          onPress={() => setShowCfg((p) => !p)}
          activeOpacity={0.7}
        >
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: serverOk ? COLORS.green : COLORS.red }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.statusTxt}>
                {serverOk ? 'LM Studio Connected' : 'LM Studio Disconnected'}
              </Text>
              {serverOk && modelName && (
                <Text style={s.modelTxt} numberOfLines={1}>{modelName}</Text>
              )}
            </View>
            <Ionicons name={showCfg ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textDim} />
          </View>

          {showCfg && (
            <View style={s.cfgBox}>
              <Text style={s.cfgLabel}>LM Studio Server URL</Text>
              <View style={s.urlRow}>
                <TextInput
                  style={s.urlInput}
                  value={urlDraft}
                  onChangeText={setUrlDraft}
                  placeholder="http://10.101.237.83:1234"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[s.connectBtn, connecting && { opacity: 0.5 }]}
                  onPress={handleConnect}
                  disabled={connecting}
                >
                  <Text style={s.connectTxt}>{connecting ? '...' : 'Connect'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.hint}>
                LM Studio → Developer → Serve on Local Network{'\n'}
                Default port: 1234
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Stats ────────────────────── */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{wardrobe.length}</Text>
            <Text style={s.statLbl}>Garments</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statNum}>{catCount}</Text>
            <Text style={s.statLbl}>Categories</Text>
          </View>
        </View>

        {/* ── Actions ──────────────────── */}
        <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Wardrobe')} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.bg} />
          <View style={{ flex: 1 }}>
            <Text style={s.btnPTxt}>Manage Wardrobe</Text>
            <Text style={s.btnPSub}>Add & analyze garment photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.bg} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btnSecondary, wardrobe.length < 2 && { opacity: 0.4 }]}
          activeOpacity={0.8}
          onPress={() => {
            if (wardrobe.length < 2) { setBanner({ message: `Add at least 2 garments first (have ${wardrobe.length})`, type: 'warning' }); return; }
            if (!serverOk) { setBanner({ message: 'Connect to LM Studio first', type: 'error' }); return; }
            navigation.navigate('Recommendation');
          }}
        >
          <Ionicons name="sparkles" size={24} color={wardrobe.length < 2 ? COLORS.textMuted : COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.btnSTxt, wardrobe.length < 2 && { color: COLORS.textMuted }]}>
              Get Outfit Recommendation
            </Text>
            <Text style={s.btnSSub}>
              {wardrobe.length < 2 ? `Need ${2 - wardrobe.length} more` : 'AI-powered styling'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: GAP.xl, paddingBottom: GAP.huge },
  logoWrap: { alignItems: 'center', paddingTop: GAP.xxxl, paddingBottom: GAP.xl },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center', alignItems: 'center', marginBottom: GAP.md,
    borderWidth: 2, borderColor: COLORS.primaryMuted,
  },
  // logoImg: { width: 88, height: 88, borderRadius: 44 },
  appName: { fontSize: TYPE.hero, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  tagline: { fontSize: TYPE.sm, color: COLORS.textDim, marginTop: GAP.xs },

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
  urlInput: {
    flex: 1, backgroundColor: COLORS.cardLight, color: COLORS.text,
    borderRadius: RAD.sm, paddingHorizontal: GAP.md, paddingVertical: GAP.sm,
    fontSize: TYPE.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  connectBtn: { backgroundColor: COLORS.primary, borderRadius: RAD.sm, paddingHorizontal: GAP.lg, justifyContent: 'center' },
  connectTxt: { color: COLORS.bg, fontSize: TYPE.sm, fontWeight: '700' },
  hint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.sm, lineHeight: 18 },

  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RAD.lg,
    padding: GAP.xl, marginBottom: GAP.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: TYPE.xxl, fontWeight: '800', color: COLORS.primary },
  statLbl: { fontSize: TYPE.xs, color: COLORS.textDim, marginTop: GAP.xs, textTransform: 'uppercase', letterSpacing: 1 },
  statDiv: { width: 1, backgroundColor: COLORS.border, marginHorizontal: GAP.lg },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.md, gap: GAP.md,
  },
  btnPTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },
  btnPSub: { color: COLORS.bg, fontSize: TYPE.xs, opacity: 0.7, marginTop: 2 },

  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RAD.lg, padding: GAP.lg, marginBottom: GAP.md, gap: GAP.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnSTxt: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  btnSSub: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: 2 },
});