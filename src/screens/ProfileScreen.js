import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import PersonaBar from '../components/PersonaBar';
import ErrorBanner from '../components/ErrorBanner';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

const W = Dimensions.get('window').width;

export default function ProfileScreen({ navigation }) {
  const { active, fullBodyPhoto, setFullBodyPhoto, gender, setGender, outfits, wardrobe } = useApp();
  const [banner, setBanner] = useState(null);

  const tryOnOutfits = (outfits || []).filter((o) => o.tryOnImageUri);

  async function pickPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setBanner({ message: 'Permission required', type: 'error' }); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!r.canceled && r.assets?.[0]) await setFullBodyPhoto(r.assets[0].uri);
    } catch (e) { setBanner({ message: `Error: ${e.message}`, type: 'error' }); }
  }

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { setBanner({ message: 'Permission required', type: 'error' }); return; }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!r.canceled && r.assets?.[0]) await setFullBodyPhoto(r.assets[0].uri);
    } catch (e) { setBanner({ message: `Error: ${e.message}`, type: 'error' }); }
  }

  function removePhoto() {
    Alert.alert('Remove Photo', 'Remove your full-body photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setFullBodyPhoto(null) },
    ]);
  }

  const wornCount = (outfits || []).filter((o) => o.status === 'worn').length;
  const garmentCount = (wardrobe || []).length;

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      {banner && <ErrorBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />}
      <PersonaBar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{active?.name || 'Profile'}</Text>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNum}>{garmentCount}</Text><Text style={s.statLbl}>Garments</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{(outfits || []).length}</Text><Text style={s.statLbl}>Outfits</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{wornCount}</Text><Text style={s.statLbl}>Worn</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{tryOnOutfits.length}</Text><Text style={s.statLbl}>Try-Ons</Text></View>
        </View>

        {/* ─── Gender Selection ─────────────────────── */}
        <Text style={s.secLabel}>Gender</Text>
        <Text style={s.secHint}>Helps generate accurate virtual try-on results</Text>

        <View style={s.genderRow}>
          <TouchableOpacity
            style={[s.genderBtn, gender === 'male' && s.genderActive]}
            onPress={() => setGender('male')}
            activeOpacity={0.7}
          >
            <View style={[s.genderIcon, gender === 'male' && s.genderIconActive]}>
              <Ionicons
                name="man"
                size={28}
                color={gender === 'male' ? COLORS.bg : COLORS.textMuted}
              />
            </View>
            <Text style={[s.genderTxt, gender === 'male' && s.genderTxtActive]}>Male</Text>
            {gender === 'male' && (
              <View style={s.genderCheck}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.genderBtn, gender === 'female' && s.genderActive]}
            onPress={() => setGender('female')}
            activeOpacity={0.7}
          >
            <View style={[s.genderIcon, gender === 'female' && s.genderIconActive]}>
              <Ionicons
                name="woman"
                size={28}
                color={gender === 'female' ? COLORS.bg : COLORS.textMuted}
              />
            </View>
            <Text style={[s.genderTxt, gender === 'female' && s.genderTxtActive]}>Female</Text>
            {gender === 'female' && (
              <View style={s.genderCheck}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!gender && (
          <View style={s.genderWarn}>
            <Ionicons name="warning-outline" size={16} color={COLORS.orange} />
            <Text style={s.genderWarnTxt}>Please select your gender for better try-on results</Text>
          </View>
        )}

        {/* ─── Full Body Photo ──────────────────────── */}
        <Text style={[s.secLabel, { marginTop: GAP.xl }]}>Full-Body Photo</Text>
        <Text style={s.secHint}>Used for virtual try-on</Text>

        {fullBodyPhoto ? (
          <View style={s.photoWrap}>
            <Image source={{ uri: fullBodyPhoto }} style={s.photo} resizeMode="cover" />
            <View style={s.photoActions}>
              <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
                <Ionicons name="camera-reverse-outline" size={18} color={COLORS.primary} />
                <Text style={s.photoBtnTxt}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoBtn} onPress={removePhoto}>
                <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                <Text style={[s.photoBtnTxt, { color: COLORS.red }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.uploadRow}>
            <TouchableOpacity style={s.uploadBtn} onPress={pickPhoto}>
              <Ionicons name="images-outline" size={32} color={COLORS.primary} />
              <Text style={s.uploadTxt}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.uploadBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={s.uploadTxt}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Try-On Gallery ───────────────────────── */}
        {tryOnOutfits.length > 0 && (
          <>
            <Text style={[s.secLabel, { marginTop: GAP.xl }]}>Try-On Gallery</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: GAP.sm, paddingBottom: GAP.md }}
            >
              {tryOnOutfits.map((o) => {
                const topG = (wardrobe || []).find((g) => g.id === o.topId);
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={s.tryOnThumb}
                    onPress={() => {
                      navigation.getParent()?.navigate?.('Style', {
                        screen: 'OutfitDetail',
                        params: { outfitId: o.id },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: o.tryOnImageUri }} style={s.tryOnImg} />
                    <Text style={s.tryOnLabel} numberOfLines={1}>
                      {topG?.summary || o.topLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
          <Text style={s.infoTxt}>
            Each persona has their own wardrobe, outfits, body photo, and gender setting. Long-press a persona chip to rename or delete.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: GAP.xl, paddingBottom: GAP.huge },
  title: { color: COLORS.text, fontSize: TYPE.xxl, fontWeight: '800', marginTop: GAP.lg, marginBottom: GAP.lg },

  statsRow: { flexDirection: 'row', gap: GAP.sm, marginBottom: GAP.xl },
  stat: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RAD.md,
    paddingVertical: GAP.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  statNum: { color: COLORS.primary, fontSize: TYPE.xl, fontWeight: '800' },
  statLbl: { color: COLORS.textDim, fontSize: 10, marginTop: 2, textTransform: 'uppercase' },

  secLabel: { color: COLORS.textDim, fontSize: TYPE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: GAP.xs },
  secHint: { color: COLORS.textMuted, fontSize: TYPE.xs, marginBottom: GAP.md },

  // Gender
  genderRow: { flexDirection: 'row', gap: GAP.md, marginBottom: GAP.md },
  genderBtn: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RAD.lg, paddingVertical: GAP.xl,
    borderWidth: 2, borderColor: COLORS.border,
    position: 'relative',
  },
  genderActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  genderIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: GAP.md,
  },
  genderIconActive: {
    backgroundColor: COLORS.primary,
  },
  genderTxt: {
    color: COLORS.textDim, fontSize: TYPE.base, fontWeight: '600',
  },
  genderTxtActive: {
    color: COLORS.primary, fontWeight: '700',
  },
  genderCheck: {
    position: 'absolute', top: GAP.sm, right: GAP.sm,
  },
  genderWarn: {
    flexDirection: 'row', alignItems: 'center', gap: GAP.sm,
    backgroundColor: COLORS.orange + '10', borderRadius: RAD.md,
    padding: GAP.md, marginBottom: GAP.md,
    borderWidth: 1, borderColor: COLORS.orange + '25',
  },
  genderWarnTxt: { flex: 1, color: COLORS.orange, fontSize: TYPE.xs },

  // Photo
  photoWrap: { marginBottom: GAP.lg },
  photo: { width: W - GAP.xl * 2, height: (W - GAP.xl * 2) * 1.3, borderRadius: RAD.lg, backgroundColor: COLORS.cardLight },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: GAP.xl, marginTop: GAP.md },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: GAP.sm, padding: GAP.sm },
  photoBtnTxt: { color: COLORS.primary, fontSize: TYPE.sm, fontWeight: '600' },

  uploadRow: { flexDirection: 'row', gap: GAP.md, marginBottom: GAP.lg },
  uploadBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryGlow, borderRadius: RAD.lg,
    paddingVertical: GAP.xxxl, gap: GAP.sm,
    borderWidth: 1, borderColor: COLORS.primaryMuted, borderStyle: 'dashed',
  },
  uploadTxt: { color: COLORS.primary, fontSize: TYPE.sm, fontWeight: '600' },

  // Try-On Gallery
  tryOnThumb: { alignItems: 'center', width: 100 },
  tryOnImg: { width: 90, height: 120, borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  tryOnLabel: { color: COLORS.textDim, fontSize: TYPE.xs, marginTop: GAP.xs, textAlign: 'center' },

  infoCard: {
    flexDirection: 'row', gap: GAP.sm, backgroundColor: COLORS.card,
    borderRadius: RAD.md, padding: GAP.md, marginTop: GAP.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoTxt: { flex: 1, color: COLORS.textMuted, fontSize: TYPE.xs, lineHeight: 16 },
});