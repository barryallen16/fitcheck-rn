import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';

export default function PersonaBar() {
  const { personas, activeId, switchPersona, addPersona, renamePersona, deletePersona } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addPersona(name);
    setNewName('');
    setShowAdd(false);
  }

  function handleLongPress(p) {
    const options = [
      { text: 'Rename', onPress: () => {
        Alert.prompt?.('Rename Persona', '', (name) => { if (name?.trim()) renamePersona(p.id, name.trim()); }, 'plain-text', p.name)
        || Alert.alert('Rename', `Current: ${p.name}`, [{ text: 'OK' }]); // Android fallback
      }},
      ...(personas.length > 1 ? [{ text: 'Delete', style: 'destructive', onPress: () => {
        Alert.alert('Delete Persona', `Delete "${p.name}" and all their data?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deletePersona(p.id) },
        ]);
      }}] : []),
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert(p.name, 'Manage persona', options);
  }

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {personas.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[s.chip, activeId === p.id && { backgroundColor: p.color + '25', borderColor: p.color }]}
            onPress={() => switchPersona(p.id)}
            onLongPress={() => handleLongPress(p)}
            activeOpacity={0.7}
          >
            <View style={[s.dot, { backgroundColor: p.color }]} />
            <Text style={[s.name, activeId === p.id && { color: p.color, fontWeight: '700' }]} numberOfLines={1}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.addChip} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={18} color={COLORS.textDim} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New Persona</Text>
            <TextInput
              style={s.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Persona name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              maxLength={20}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => { setShowAdd(false); setNewName(''); }}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalOk, !newName.trim() && { opacity: 0.4 }]} onPress={handleAdd} disabled={!newName.trim()}>
                <Text style={s.okTxt}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: GAP.lg, paddingVertical: GAP.sm, gap: GAP.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: GAP.md, paddingVertical: GAP.sm,
    borderRadius: RAD.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, gap: GAP.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { color: COLORS.textDim, fontSize: TYPE.sm, fontWeight: '500', maxWidth: 100 },
  addChip: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.card, borderRadius: RAD.lg, padding: GAP.xxl, width: '80%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700', marginBottom: GAP.lg },
  input: {
    backgroundColor: COLORS.cardLight, color: COLORS.text, borderRadius: RAD.sm,
    paddingHorizontal: GAP.md, paddingVertical: GAP.md, fontSize: TYPE.base,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: GAP.lg,
  },
  modalBtns: { flexDirection: 'row', gap: GAP.md },
  modalCancel: { flex: 1, paddingVertical: GAP.md, alignItems: 'center', borderRadius: RAD.md, backgroundColor: COLORS.cardLight },
  cancelTxt: { color: COLORS.textDim, fontSize: TYPE.base, fontWeight: '600' },
  modalOk: { flex: 1, paddingVertical: GAP.md, alignItems: 'center', borderRadius: RAD.md, backgroundColor: COLORS.primary },
  okTxt: { color: COLORS.bg, fontSize: TYPE.base, fontWeight: '700' },
});