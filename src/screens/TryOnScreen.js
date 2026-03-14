// src/screens/TryOnScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useWardrobe } from '../context/WardrobeContext';
import tryOnService from '../services/tryOnService';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const W = Dimensions.get('window').width;

const LOAD_STEPS = [
  { msg: 'Uploading Images', sub: 'Sending to generation server...' },
  { msg: 'Preparing Model', sub: 'Loading FLUX model...' },
  { msg: 'Generating Try-On', sub: 'AI is dressing your avatar...' },
  { msg: 'Refining Details', sub: 'Adjusting fit and lighting...' },
  { msg: 'Almost Ready', sub: 'Finalizing image...' },
];

export default function TryOnScreen({ route, navigation }) {
  const { outfit, wardrobe: routeWardrobe } = route.params || {};
  const { userPhoto, setUserPhoto, wardrobe, addTryOn } = useWardrobe();

  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [resultImage, setResultImage] = useState(null);
  const intervalRef = useRef(null);

  // Get garment data
  const wd = routeWardrobe || wardrobe;
  const topG = outfit ? wd.find((g) => g.id === outfit.topId) : null;
  const botG = outfit ? wd.find((g) => g.id === outfit.bottomId) : null;

  useEffect(() => {
    if (loading) {
      setLoadStep(0);
      intervalRef.current = setInterval(() => {
        setLoadStep((p) => Math.min(p + 1, LOAD_STEPS.length - 1));
      }, 8000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  async function pickUserPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setBanner({ message: 'Photo library permission needed', type: 'error' });
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!r.canceled && r.assets?.[0]) {
        await setUserPhoto(r.assets[0].uri);
      }
    } catch (e) {
      setBanner({ message: `Error: ${e.message}`, type: 'error' });
    }
  }

  async function takeUserPhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setBanner({ message: 'Camera permission needed', type: 'error' });
        return;
      }

      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });

      if (!r.canceled && r.assets?.[0]) {
        await setUserPhoto(r.assets[0].uri);
      }
    } catch (e) {
      setBanner({ message: `Error: ${e.message}`, type: 'error' });
    }
  }

  async function generate() {
    if (!userPhoto) {
      setBanner({ message: 'Upload your full-body photo first', type: 'warning' });
      return;
    }
    if (!topG) {
      setBanner({ message: 'No top garment found for this outfit', type: 'error' });
      return;
    }

    setLoading(true);
    setResultImage(null);

    try {
      const result = await tryOnService.generateTryOn({
        fullBodyImageUri: userPhoto,
        topGarmentImageUri: topG.imageUri,
        bottomGarmentImageUri: botG?.imageUri || null,
        topSummary: topG.summary,
        bottomSummary: botG?.summary || '',
      });

      setResultImage(result.imageUri);

      // Save to history
      addTryOn({
        resultImageUri: result.imageUri,
        topLabel: topG.summary,
        bottomLabel: botG?.summary || 'N/A',
        userPhotoUri: userPhoto,
      });

      setBanner({ message: 'Try-on generated!', type: 'success' });
    } catch (err) {
      setBanner({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}

      {loading && (
        <View style={s.overlay}>
          <View style={s.loadCard}>
            <View style={s.spinner} />
            <Text style={s.loadMsg}>{LOAD_STEPS[loadStep].msg}</Text>
            <Text style={s.loadSub}>{LOAD_STEPS[loadStep].sub}</Text>
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
        {/* Result image (show on top when generated) */}
        {resultImage && (
          <View style={s.resultSection}>
            <Text style={s.secLabel}>Try-On Result</Text>
            <Image source={{ uri: resultImage }} style={s.resultImg} resizeMode="contain" />
          </View>
        )}

        {/* User Photo */}
        <Text style={s.secLabel}>Your Full-Body Photo</Text>
        <Text style={s.secHint}>Upload a clear, full-body photo of yourself</Text>

        {userPhoto ? (
          <View style={s.photoWrap}>
            <Image source={{ uri: userPhoto }} style={s.userPhoto} resizeMode="cover" />
            <TouchableOpacity style={s.changePhotoBtn} onPress={pickUserPhoto}>
              <Ionicons name="camera-reverse-outline" size={18} color={COLORS.primary} />
              <Text style={s.changePhotoTxt}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.uploadRow}>
            <TouchableOpacity style={s.uploadBtn} onPress={pickUserPhoto} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={28} color={COLORS.primary} />
              <Text style={s.uploadTxt}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.uploadBtn} onPress={takeUserPhoto} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
              <Text style={s.uploadTxt}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Outfit being tried on */}
        <Text style={[s.secLabel, { marginTop: GAP.xl }]}>Outfit</Text>
        <View style={s.outfitRow}>
          {topG ? (
            <View style={s.garmentThumb}>
              <Image source={{ uri: topG.imageUri }} style={s.thumbImg} />
              <Text style={s.thumbLabel} numberOfLines={1}>{topG.summary}</Text>
              <Text style={s.thumbCat}>Top</Text>
            </View>
          ) : (
            <View style={s.garmentThumb}>
              <View style={[s.thumbImg, s.thumbPh]}>
                <Ionicons name="shirt-outline" size={24} color={COLORS.textMuted} />
              </View>
              <Text style={s.thumbLabel}>No top</Text>
            </View>
          )}

          {outfit?.bottomLabel !== 'N/A' && botG && (
            <View style={s.garmentThumb}>
              <Image source={{ uri: botG.imageUri }} style={s.thumbImg} />
              <Text style={s.thumbLabel} numberOfLines={1}>{botG.summary}</Text>
              <Text style={s.thumbCat}>Bottom</Text>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={s.disclaimerTxt}>
            Powered by FLUX AI. Results are approximate visualizations and may not perfectly
            represent actual garment fit. Uses Hugging Face free tier.
          </Text>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[s.genBtn, (!userPhoto || !topG) && { opacity: 0.4 }]}
          onPress={generate}
          activeOpacity={0.8}
          disabled={!userPhoto || !topG || loading}
        >
          <Ionicons name="sparkles" size={22} color={COLORS.bg} />
          <Text style={s.genTxt}>
            {resultImage ? 'Regenerate Try-On' : 'Generate Try-On'}
          </Text>
        </TouchableOpacity>

        {resultImage && (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={s.backTxt}>Back to Outfit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay,
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  loadCard: { alignItems: 'center', padding: GAP.xxxl },
  spinner: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3,
    borderColor: COLORS.accent, borderTopColor: 'transparent', marginBottom: GAP.xl,
  },
  loadMsg: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '600', textAlign: 'center' },
  loadSub: { color: COLORS.textDim, fontSize: TYPE.sm, marginTop: GAP.sm, textAlign: 'center' },
  loadHint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginTop: GAP.lg, textAlign: 'center' },

  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GAP.lg, paddingVertical: GAP.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  hdrTitle: { color: COLORS.text, fontSize: TYPE.xl, fontWeight: '700' },
  scroll: { paddingHorizontal: GAP.xl, paddingTop: GAP.lg, paddingBottom: GAP.huge * 2 },

  secLabel: {
    color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.xs,
  },
  secHint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginBottom: GAP.md },

  resultSection: { marginBottom: GAP.xl },
  resultImg: {
    width: W - GAP.xl * 2, height: (W - GAP.xl * 2) * 1.33,
    borderRadius: RAD.lg, backgroundColor: COLORS.cardLight,
  },

  photoWrap: { marginBottom: GAP.md },
  userPhoto: {
    width: W - GAP.xl * 2, height: (W - GAP.xl * 2) * 1.2,
    borderRadius: RAD.lg, backgroundColor: COLORS.cardLight,
  },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: GAP.sm, paddingVertical: GAP.md,
  },
  changePhotoTxt: { color: COLORS.primary, fontSize: TYPE.sm, fontWeight: '600' },

  uploadRow: { flexDirection: 'row', gap: GAP.md, marginBottom: GAP.md },
  uploadBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow, borderRadius: RAD.lg,
    paddingVertical: GAP.xxl, gap: GAP.sm,
    borderWidth: 1, borderColor: COLORS.primaryMuted, borderStyle: 'dashed',
  },
  uploadTxt: { color: COLORS.primary, fontSize: TYPE.sm, fontWeight: '600' },

  outfitRow: {
    flexDirection: 'row', gap: GAP.md, marginBottom: GAP.lg,
  },
  garmentThumb: { alignItems: 'center', width: 100 },
  thumbImg: { width: 90, height: 90, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  thumbPh: { justifyContent: 'center', alignItems: 'center' },
  thumbLabel: { color: COLORS.text, fontSize: TYPE.xs, fontWeight: '500', marginTop: GAP.xs, textAlign: 'center' },
  thumbCat: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },

  disclaimer: {
    flexDirection: 'row', gap: GAP.sm, backgroundColor: COLORS.card,
    borderRadius: RAD.md, padding: GAP.md, marginBottom: GAP.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  disclaimerTxt: { flex: 1, color: COLORS.textMuted, fontSize: TYPE.xs, lineHeight: 16 },

  genBtn: {
    flexDirection: 'row', backgroundColor: COLORS.accent, borderRadius: RAD.lg,
    paddingVertical: GAP.lg, justifyContent: 'center', alignItems: 'center',
    gap: GAP.sm, marginBottom: GAP.md,
  },
  genTxt: { color: COLORS.bg, fontSize: TYPE.lg, fontWeight: '700' },

  backBtn: { alignItems: 'center', paddingVertical: GAP.lg },
  backTxt: { color: COLORS.textDim, fontSize: TYPE.base, fontWeight: '500' },
});