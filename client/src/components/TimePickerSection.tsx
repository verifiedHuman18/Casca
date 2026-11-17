import React, { useMemo, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { ColorTokens } from '../theme';
import {
  calculateEndTime24,
  formatTime24,
  getTimeDuration,
  parseDateKey,
  parseIsoToTimeParts,
  MONTH_NAMES,
  DAY_SHORT,
} from '../utils/date';

export interface TimePickerSectionProps {
  colors: ColorTokens;
  dateKey: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  onChangeStartTime: (time24: string) => void;
  onChangeEndTime: (time24: string) => void;
  onChangeDateKey?: (dateKey: string) => void;
}

const DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
];

export function TimePickerSection({
  colors: c,
  dateKey,
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
}: TimePickerSectionProps) {
  // State for non-Android platforms (iOS / Web modal)
  const [iosPickerTarget, setIosPickerTarget] = useState<'start' | 'end' | null>(null);
  const [iosTempDate, setIosTempDate] = useState<Date>(new Date());

  // Duration computation
  const durationInfo = useMemo(() => {
    return getTimeDuration(startTime, endTime);
  }, [startTime, endTime]);

  // Formatted date string for display
  const dateFormatted = useMemo(() => {
    try {
      const d = parseDateKey(dateKey);
      const dayName = DAY_SHORT[d.getDay()];
      const monthName = MONTH_NAMES[d.getMonth()];
      return `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`;
    } catch {
      return dateKey;
    }
  }, [dateKey]);

  // Helper to convert HH:mm to a Date object today
  const time24ToDate = (time24: string): Date => {
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 10, m || 0, 0, 0);
    return d;
  };

  const handleStartTimeSelected = (newStart24: string) => {
    onChangeStartTime(newStart24);
    // Keep duration intact if previously valid
    if (durationInfo.isValid && durationInfo.durationMinutes > 0) {
      onChangeEndTime(calculateEndTime24(newStart24, durationInfo.durationMinutes));
    }
  };

  const handleEndTimeSelected = (newEnd24: string) => {
    onChangeEndTime(newEnd24);
  };

  // Open native system time picker
  const openTimePicker = (target: 'start' | 'end') => {
    const initialDate = target === 'start' ? time24ToDate(startTime) : time24ToDate(endTime);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'time',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const parts = parseIsoToTimeParts(selectedDate);
            if (target === 'start') {
              handleStartTimeSelected(parts.time24);
            } else {
              handleEndTimeSelected(parts.time24);
            }
          }
        },
      });
    } else {
      // iOS / Web modal fallback
      setIosTempDate(initialDate);
      setIosPickerTarget(target);
    }
  };

  const applyPresetDuration = (minutes: number) => {
    const newEnd = calculateEndTime24(startTime, minutes);
    onChangeEndTime(newEnd);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surfaceSubtle,
          borderColor: c.border,
        },
      ]}
    >
      {/* Date Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="calendar" size={14} color={c.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.dateText, { color: c.textPrimary }]}>{dateFormatted}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: c.bgCard }]}>
          <Text style={[styles.statusBadgeText, { color: c.textSecondary }]}>System Clock</Text>
        </View>
      </View>

      {/* ── TIME PICKER CARDS (Side-by-side) ────────────────────────────── */}
      <View style={styles.timeCardsRow}>
        {/* Start Time Card */}
        <TouchableOpacity
          style={[
            styles.timeCard,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
          onPress={() => openTimePicker('start')}
          activeOpacity={0.75}
        >
          <View style={styles.timeCardHeader}>
            <Text style={[styles.timeCardLabel, { color: c.textSecondary }]}>START TIME</Text>
            <Feather name="clock" size={13} color={c.textSecondary} />
          </View>
          <Text style={[styles.timeCardValue, { color: c.textPrimary }]}>
            {formatTime24(startTime)}
          </Text>
          <Text style={[styles.timeCardHint, { color: c.textMuted }]}>Tap to change</Text>
        </TouchableOpacity>

        {/* End Time Card */}
        <TouchableOpacity
          style={[
            styles.timeCard,
            {
              backgroundColor: c.bgCard,
              borderColor: durationInfo.isValid ? c.border : '#fca5a5',
            },
          ]}
          onPress={() => openTimePicker('end')}
          activeOpacity={0.75}
        >
          <View style={styles.timeCardHeader}>
            <Text style={[styles.timeCardLabel, { color: c.textSecondary }]}>END TIME</Text>
            {durationInfo.isValid ? (
              <View style={[styles.durationBadge, { backgroundColor: c.tintSage }]}>
                <Text style={[styles.durationBadgeText, { color: c.tintSageText }]}>
                  {durationInfo.formatted}
                </Text>
              </View>
            ) : (
              <View style={[styles.durationBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.durationBadgeText, { color: '#b91c1c' }]}>Invalid</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.timeCardValue,
              { color: durationInfo.isValid ? c.textPrimary : '#b91c1c' },
            ]}
          >
            {formatTime24(endTime)}
          </Text>
          <Text style={[styles.timeCardHint, { color: c.textMuted }]}>Tap to change</Text>
        </TouchableOpacity>
      </View>

      {/* ── QUICK DURATION PRESET CHIPS ────────────────────────────── */}
      <View style={styles.presetsRow}>
        <Text style={[styles.presetLabel, { color: c.textSecondary }]}>Duration:</Text>
        <View style={styles.presetChips}>
          {DURATION_PRESETS.map(preset => {
            const isActive =
              durationInfo.isValid && durationInfo.durationMinutes === preset.minutes;
            return (
              <TouchableOpacity
                key={`preset-${preset.minutes}`}
                onPress={() => applyPresetDuration(preset.minutes)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isActive ? c.tintSage : c.bgCard,
                    borderColor: isActive ? c.tintSageText : c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isActive ? c.tintSageText : c.textSecondary },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── IOS / WEB MODAL FALLBACK ────────────────────────────── */}
      {Platform.OS !== 'android' && iosPickerTarget && (
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(iosPickerTarget)}
          onRequestClose={() => setIosPickerTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.iosModalContent, { backgroundColor: c.bgCard, borderColor: c.border }]}
            >
              <View style={styles.iosModalHeader}>
                <Text style={[styles.iosModalTitle, { color: c.textPrimary }]}>
                  Select {iosPickerTarget === 'start' ? 'Start' : 'End'} Time
                </Text>
                <TouchableOpacity onPress={() => setIosPickerTarget(null)}>
                  <Feather name="x" size={20} color={c.textSecondary} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={iosTempDate}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (selectedDate) setIosTempDate(selectedDate);
                }}
              />

              <TouchableOpacity
                style={[styles.modalDoneBtn, { backgroundColor: c.pillActiveBg }]}
                onPress={() => {
                  const parts = parseIsoToTimeParts(iosTempDate);
                  if (iosPickerTarget === 'start') {
                    handleStartTimeSelected(parts.time24);
                  } else {
                    handleEndTimeSelected(parts.time24);
                  }
                  setIosPickerTarget(null);
                }}
              >
                <Text style={[styles.modalDoneBtnText, { color: c.pillActiveText }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  timeCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeCardValue: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 2,
  },
  timeCardHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 8,
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iosModalContent: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  iosModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iosModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDoneBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalDoneBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
