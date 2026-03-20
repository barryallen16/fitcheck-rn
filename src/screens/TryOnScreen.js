import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import tryOnService from '../services/tryOnService';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const W = Dimensions.get('window').width;

const STEPS = [
  { msg: 'Uploading Images', sub: 'Preparing garment and body images...' },
  { msg: 'Queuing Request', sub: 'Waiting for model availability...' },
  { msg: 'Generating Try-On', sub: 'FLUX AI is compositing the outfit...' },
  { msg: 'Refining Details', sub: 'Adjusting fabric drape and lighting...' },
  { msg: 'Almost Ready', sub: 'Finalizing the image...' },
];

export default function TryOnScreen({ route, navigation }) {
  const { outfitId } = route.params;
  const { wardrobe, outfits, fullBodyPhoto, setOutfitTryOn, gender } = useApp();
  const outfit = outfits.find((o) => o.id === outfitId);
  const topG = wardrobe.find((g) => g.id === outfit?.topId);
  const botG = wardrobe.find((g) => g.id === outfit?.bottomId);

  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState(outfit?.tryOnImageUri || null);
  const [banner, setBanner] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const iRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setStepIdx(0);
      setErrorDetail(null);
      iRef.current = setInterval(() => setStepIdx((p) => Math.min(p + 1, STEPS.length - 1)), 8000);
    } else {
      if (iRef.current) clearInterval(iRef.current);
    }
    return () => { if (iRef.current) clearInterval(iRef.current); };
  }, [loading]);

  // Update result if outfit's tryOnImageUri changes
  useEffect(() => {
    if (outfit?.tryOnImageUri && !result) {
      setResult(outfit.tryOnImageUri);
    }
  }, [outfit?.tryOnImageUri]);

  if (!outfit) {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
          <Text style={s.errTxt}>Outfit not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.linkBtn}>
            <Text style={s.linkTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!fullBodyPhoto) {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Virtual Try-On</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}>
          <Ionicons name="person-outline" size={56} color={COLORS.orange} />
          <Text style={s.noPhotoTitle}>No Full-Body Photo</Text>
          <Text style={s.noPhotoSub}>
            Go to the "Me" tab and upload a full-body photo first.
          </Text>
          <TouchableOpacity style={s.goMeBtn} onPress={() => navigation.getParent()?.navigate?.('Me')}>
            <Ionicons name="person" size={20} color={COLORS.bg} />
            <Text style={s.goMeTxt}>Go to Me Tab</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function generate() {
    if (!topG) {
      setBanner({ message: 'Top garment image not found', type: 'error' });
      return;
    }

    if (!gender) {
      Alert.alert(
        'Gender Not Set',
        'Setting your gender in the "Me" tab helps generate more accurate try-on results. Continue anyway?',
        [
          { text: 'Set Gender', onPress: () => navigation.getParent()?.navigate?.('Me') },
          { text: 'Continue', onPress: doGenerate },
        ]
      );
      return;
    }

    doGenerate();
  }

  async function doGenerate() {
    setLoading(true);
    setResult(null);
    setErrorDetail(null);

    try {
      const uri = await tryOnService.generate({
        fullBodyUri: fullBodyPhoto,
        topUri: topG.imageUri,
        bottomUri: botG?.imageUri || null,
        topSummary: topG.summary || outfit.topLabel,
        bottomSummary: (botG?.summary || outfit.bottomLabel) !== 'N/A' ? (botG?.summary || outfit.bottomLabel) : '',
        gender: gender,
      });

      setResult(uri);
      setOutfitTryOn(outfitId, uri);
      setBanner({ message: 'Try-on generated and saved!', type: 'success' });
    } catch (err) {
      console.warn('TryOn error:', err);
      setErrorDetail(err.message);
      setBanner({ message: 'Try-on failed. See details below.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}

      {loading && (
        <View style={s.overlay}>
          <View style={s.loadBox}>
            <View style={s.spinner} />
            <Text style={s.loadMsg}>{STEPS[stepIdx].msg}</Text>
            <Text style={s.loadSub}>{STEPS[stepIdx].sub}</Text>
            <Text style={s.loadHint}>This may take 30-90 seconds</Text>
          </View>
        </View>
      )}

      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: GAP.xs }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Virtual Try-On</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Result */}
        {result && (
          <View style={s.resultSection}>
            <Text style={s.secLabel}>Try-On Result</Text>
            <Image source={{ uri: result }} style={s.resultImg} resizeMode="contain" />
          </View>
        )}

        {/* Error detail */}
        {errorDetail && !loading && (
          <View style={s.errorCard}>
            <View style={s.errorHdr}>
              <Ionicons name="alert-circle" size={20} color={COLORS.red} />
              <Text style={s.errorTitle}>Generation Failed</Text>
            </View>
            <Text style={s.errorBody}>{errorDetail}</Text>
            <View style={s.errorTips}>
              <Text style={s.tipTitle}>Troubleshooting:</Text>
              <Text style={s.tipItem}>• The HF Space may be sleeping — wait 30s and retry</Text>
              <Text style={s.tipItem}>• Rate limited — wait a few minutes</Text>
              <Text style={s.tipItem}>• Try with a clearer full-body photo</Text>
              <Text style={s.tipItem}>• Check your HF tokens in config/keys.js</Text>
            </View>
          </View>
        )}

        {/* Input preview */}
        <Text style={s.secLabel}>Inputs</Text>
        <View style={s.inputRow}>
          <View style={s.inputBox}>
            <Image source={{ uri: fullBodyPhoto }} style={s.inputImg} resizeMode="cover" />
            <Text style={s.inputLabel}>You</Text>
          </View>
          {topG && (
            <View style={s.inputBox}>
              <Image source={{ uri: topG.imageUri }} style={s.inputImg} resizeMode="cover" />
              <Text style={s.inputLabel} numberOfLines={1}>Top</Text>
            </View>
          )}
          {botG && outfit.bottomLabel !== 'N/A' && (
            <View style={s.inputBox}>
              <Image source={{ uri: botG.imageUri }} style={s.inputImg} resizeMode="cover" />
              <Text style={s.inputLabel} numberOfLines={1}>Bottom</Text>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={s.disclaimerTxt}>
            Powered by FLUX AI on Hugging Face. Results are approximate visualizations. Free tier has rate limits.
          </Text>
        </View>

        {/* Generate */}
        <TouchableOpacity
          style={[s.genBtn, (!topG || loading) && { opacity: 0.4 }]}
          onPress={generate}
          activeOpacity={0.8}
          disabled={!topG || loading}
        >
          <Ionicons name="sparkles" size={22} color={COLORS.bg} />
          <Text style={s.genTxt}>{result ? 'Regenerate' : 'Generate Try-On'}</Text>
        </TouchableOpacity>

        {errorDetail && !loading && (
          <TouchableOpacity
            style={s.retryBtn}
            onPress={generate}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GAP.xxxl },
  errTxt: { color: COLORS.red, fontSize: TYPE.lg, fontWeight: '600', marginTop: GAP.lg },
  linkBtn: { marginTop: GAP.xl, paddingVertical: GAP.md, paddingHorizontal: GAP.xxl, backgroundColor: COLORS.card, borderRadius: RAD.md },
  linkTxt: { color: COLORS.text, fontSize: TYPE.base },

  noPhotoTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700', marginTop: GAP.lg },
  noPhotoSub: { color: COLORS.textDim, fontSize: TYPE.sm, textAlign: 'center', marginTop: GAP.sm, lineHeight: 22 },
  goMeBtn: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, backgroundColor: COLORS.primary, borderRadius: RAD.lg, paddingVertical: GAP.md, paddingHorizontal: GAP.xxl, marginTop: GAP.xl },
  goMeTxt: { color: COLORS.bg, fontSize: TYPE.base, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadBox: { alignItems: 'center', padding: GAP.xxxl },
  spinner: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: COLORS.accent, borderTopColor: 'transparent', marginBottom: GAP.xl },
  loadMsg: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600', textAlign: 'center' },
  loadSub: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: GAP.sm, textAlign: 'center' },
  loadHint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.lg },

  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GAP.lg, paddingVertical: GAP.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge * 2 },

  secLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.md },

  resultSection: { marginBottom: GAP.xl },
  resultImg: { width: W - GAP.xl * 2, height: (W - GAP.xl * 2) * 1.33, borderRadius: RAD.lg, backgroundColor: COLORS.cardLight },

  errorCard: {
    backgroundColor: COLORS.red + '08', borderRadius: RAD.lg, padding: GAP.lg,
    marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.red + '30',
  },
  errorHdr: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, marginBottom: GAP.sm },
  errorTitle: { color: COLORS.red, fontSize: TYPE.base, fontWeight: '700' },
  errorBody: { color: COLORS.text, fontSize: TYPE.sm, lineHeight: 20, marginBottom: GAP.md },
  errorTips: { backgroundColor: COLORS.card, borderRadius: RAD.md, padding: GAP.md },
  tipTitle: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', marginBottom: GAP.sm },
  tipItem: { color: COLORS.textMuted, fontSize: TYPE.xs, lineHeight: 18 },

  inputRow: { flexDirection: 'row', gap: GAP.md, marginBottom: GAP.xl },
  inputBox: { alignItems: 'center', flex: 1 },
  inputImg: { width: '100%', aspectRatio: 0.75, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  inputLabel: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs, fontWeight: '600' },

  disclaimer: { flexDirection: 'row', gap: GAP.sm, backgroundColor: COLORS.card, borderRadius: RAD.md, padding: GAP.md, marginBottom: GAP.xl, borderWidth: 1, borderColor: COLORS.border },
  disclaimerTxt: { flex: 1, color: COLORS.textMuted, fontSize: TYPE.xs, lineHeight: 16 },

  genBtn: { flexDirection: 'row', backgroundColor: COLORS.accent, borderRadius: RAD.lg, paddingVertical: GAP.lg, justifyContent: 'center', alignItems: 'center', gap: GAP.sm, marginBottom: GAP.md },
  genTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },

  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryGlow, borderRadius: RAD.lg, paddingVertical: GAP.lg, gap: GAP.sm, borderWidth: 1, borderColor: COLORS.primaryMuted },
  retryTxt: { color: COLORS.primary, fontSize: TYPE.base, fontWeight: '700' },
});