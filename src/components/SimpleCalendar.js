// src/components/SimpleCalendar.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPE, GAP, RAD } from '../constants/theme';
import { todayStr } from '../utils/helpers';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SimpleCalendar({ markedDates = {}, onDayPress, selectedDate }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const today = todayStr();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function dateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.arrow}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.arrow}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Day names */}
      <View style={s.row}>
        {DAYS.map((d) => (
          <View key={d} style={s.cell}>
            <Text style={s.dayName}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={s.row}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) return <View key={col} style={s.cell} />;

            const ds = dateStr(day);
            const isToday = ds === today;
            const isSelected = ds === selectedDate;
            const hasOutfit = markedDates[ds];

            return (
              <TouchableOpacity
                key={col}
                style={[
                  s.cell,
                  isToday && s.todayCell,
                  isSelected && s.selectedCell,
                ]}
                onPress={() => onDayPress?.(ds)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    s.dayNum,
                    isToday && s.todayNum,
                    isSelected && s.selectedNum,
                  ]}
                >
                  {day}
                </Text>
                {hasOutfit && <View style={s.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card, borderRadius: RAD.lg,
    padding: GAP.md, borderWidth: 1, borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: GAP.sm, marginBottom: GAP.md,
  },
  arrow: { padding: GAP.sm },
  monthLabel: { color: COLORS.text, fontSize: TYPE.lg, fontWeight: '700' },
  row: { flexDirection: 'row' },
  cell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: GAP.sm, minHeight: 42,
  },
  dayName: { color: COLORS.textMuted, fontSize: TYPE.xs, fontWeight: '600' },
  dayNum: { color: COLORS.text, fontSize: TYPE.sm, fontWeight: '500' },
  todayCell: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RAD.sm,
  },
  todayNum: { color: COLORS.primary, fontWeight: '700' },
  selectedCell: {
    backgroundColor: COLORS.primary, borderRadius: RAD.sm,
  },
  selectedNum: { color: COLORS.bg, fontWeight: '800' },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.green, marginTop: 2,
  },
});