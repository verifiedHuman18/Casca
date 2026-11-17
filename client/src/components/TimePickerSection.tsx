import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { ColorTokens } from '../theme';
import {
  calculateEndTime24,
  formatTime24,
  getTimeDuration,
  parseDateKey,
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

const MINUTE_STEPS = [0, 15, 30, 45];

export function TimePickerSection({
  colors: c,
  dateKey,
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
}: TimePickerSectionProps) {
  // Parse Start Time parts
  const [startH24, startM] = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number);
    return [h ?? 10, m ?? 0];
  }, [startTime]);

  const startIsPm = startH24 >= 12;
  const startHour12 = startH24 % 12 || 12;

  // Parse End Time parts
  const [endH24, endM] = useMemo(() => {
    const [h, m] = endTime.split(':').map(Number);
    return [h ?? 11, m ?? 30];
  }, [endTime]);

  const endIsPm = endH24 >= 12;
  const endHour12 = endH24 % 12 || 12;

  // Calculate current duration
  const durationInfo = useMemo(() => {
    return getTimeDuration(startTime, endTime);
  }, [startTime, endTime]);

  // Formatted date string
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

  // Helper to construct 24h string from 12h + AM/PM + mins
  const to24h = (hour12: number, isPm: boolean, minutes: number): string => {
    let h24 = hour12 % 12;
    if (isPm) h24 += 12;
    return `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const adjustStartHour = (delta: number) => {
    let next12 = startHour12 + delta;
    if (next12 > 12) next12 = 1;
    if (next12 < 1) next12 = 12;
    const nextStart24 = to24h(next12, startIsPm, startM);
    onChangeStartTime(nextStart24);

    // If duration was valid, automatically shift end time by the same duration
    if (durationInfo.isValid && durationInfo.durationMinutes > 0) {
      onChangeEndTime(calculateEndTime24(nextStart24, durationInfo.durationMinutes));
    }
  };

  const toggleStartAmPm = (targetIsPm: boolean) => {
    if (startIsPm === targetIsPm) return;
    const nextStart24 = to24h(startHour12, targetIsPm, startM);
    onChangeStartTime(nextStart24);

    if (durationInfo.isValid && durationInfo.durationMinutes > 0) {
      onChangeEndTime(calculateEndTime24(nextStart24, durationInfo.durationMinutes));
    }
  };

  const setStartMinutes = (m: number) => {
    const nextStart24 = to24h(startHour12, startIsPm, m);
    onChangeStartTime(nextStart24);

    if (durationInfo.isValid && durationInfo.durationMinutes > 0) {
      onChangeEndTime(calculateEndTime24(nextStart24, durationInfo.durationMinutes));
    }
  };

  const adjustEndHour = (delta: number) => {
    let next12 = endHour12 + delta;
    if (next12 > 12) next12 = 1;
    if (next12 < 1) next12 = 12;
    onChangeEndTime(to24h(next12, endIsPm, endM));
  };

  const toggleEndAmPm = (targetIsPm: boolean) => {
    if (endIsPm === targetIsPm) return;
    onChangeEndTime(to24h(endHour12, targetIsPm, endM));
  };

  const setEndMinutes = (m: number) => {
    onChangeEndTime(to24h(endHour12, endIsPm, m));
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
          <Text style={[styles.statusBadgeText, { color: c.textSecondary }]}>Event Schedule</Text>
        </View>
      </View>

      {/* ── START TIME ROW ────────────────────────────── */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>START TIME</Text>
        <View style={styles.timeControlsRow}>
          {/* Hour Stepper */}
          <View
            style={[styles.stepperContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
          >
            <TouchableOpacity
              onPress={() => adjustStartHour(-1)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="minus" size={14} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.hourValue, { color: c.textPrimary }]}>
              {String(startHour12).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={() => adjustStartHour(1)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus" size={14} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Minute Selector Pills */}
          <View style={styles.minutePillsRow}>
            {MINUTE_STEPS.map(m => {
              const isSelected = startM === m;
              return (
                <TouchableOpacity
                  key={`start-m-${m}`}
                  onPress={() => setStartMinutes(m)}
                  style={[
                    styles.minPill,
                    {
                      backgroundColor: isSelected ? c.tintWarm : c.bgCard,
                      borderColor: isSelected ? c.tintWarmText : c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.minPillText,
                      { color: isSelected ? c.tintWarmText : c.textSecondary },
                    ]}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AM / PM Segmented Control */}
          <View
            style={[styles.amPmContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
          >
            <TouchableOpacity
              onPress={() => toggleStartAmPm(false)}
              style={[styles.amPmBtn, !startIsPm && { backgroundColor: c.tintWarm }]}
            >
              <Text
                style={[styles.amPmText, { color: !startIsPm ? c.tintWarmText : c.textSecondary }]}
              >
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleStartAmPm(true)}
              style={[styles.amPmBtn, startIsPm && { backgroundColor: c.tintWarm }]}
            >
              <Text
                style={[styles.amPmText, { color: startIsPm ? c.tintWarmText : c.textSecondary }]}
              >
                PM
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── QUICK DURATION PRESETS ────────────────────────────── */}
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

      {/* ── END TIME ROW ────────────────────────────── */}
      <View style={styles.sectionBlock}>
        <View style={styles.endHeaderRow}>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>END TIME</Text>
          {durationInfo.isValid ? (
            <View style={[styles.durationBadge, { backgroundColor: c.tintSage }]}>
              <Feather name="clock" size={11} color={c.tintSageText} style={{ marginRight: 4 }} />
              <Text style={[styles.durationBadgeText, { color: c.tintSageText }]}>
                {durationInfo.formatted}
              </Text>
            </View>
          ) : (
            <View style={[styles.durationBadge, { backgroundColor: '#fee2e2' }]}>
              <Feather name="alert-circle" size={11} color="#b91c1c" style={{ marginRight: 4 }} />
              <Text style={[styles.durationBadgeText, { color: '#b91c1c' }]}>Invalid range</Text>
            </View>
          )}
        </View>

        <View style={styles.timeControlsRow}>
          {/* Hour Stepper */}
          <View
            style={[styles.stepperContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
          >
            <TouchableOpacity
              onPress={() => adjustEndHour(-1)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="minus" size={14} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.hourValue, { color: c.textPrimary }]}>
              {String(endHour12).padStart(2, '0')}
            </Text>
            <TouchableOpacity
              onPress={() => adjustEndHour(1)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus" size={14} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Minute Selector Pills */}
          <View style={styles.minutePillsRow}>
            {MINUTE_STEPS.map(m => {
              const isSelected = endM === m;
              return (
                <TouchableOpacity
                  key={`end-m-${m}`}
                  onPress={() => setEndMinutes(m)}
                  style={[
                    styles.minPill,
                    {
                      backgroundColor: isSelected ? c.tintWarm : c.bgCard,
                      borderColor: isSelected ? c.tintWarmText : c.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.minPillText,
                      { color: isSelected ? c.tintWarmText : c.textSecondary },
                    ]}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AM / PM Segmented Control */}
          <View
            style={[styles.amPmContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
          >
            <TouchableOpacity
              onPress={() => toggleEndAmPm(false)}
              style={[styles.amPmBtn, !endIsPm && { backgroundColor: c.tintWarm }]}
            >
              <Text
                style={[styles.amPmText, { color: !endIsPm ? c.tintWarmText : c.textSecondary }]}
              >
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleEndAmPm(true)}
              style={[styles.amPmBtn, endIsPm && { backgroundColor: c.tintWarm }]}
            >
              <Text
                style={[styles.amPmText, { color: endIsPm ? c.tintWarmText : c.textSecondary }]}
              >
                PM
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Summary Footer */}
      <View style={styles.summaryFooter}>
        <Text style={[styles.summaryText, { color: c.textSecondary }]}>
          Schedule:{' '}
          <Text style={{ fontWeight: '600', color: c.textPrimary }}>{formatTime24(startTime)}</Text>{' '}
          – <Text style={{ fontWeight: '600', color: c.textPrimary }}>{formatTime24(endTime)}</Text>
        </Text>
      </View>
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
    marginBottom: 12,
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
  sectionBlock: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  endHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  hourValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  minutePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  minPill: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  minPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amPmContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  amPmBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  amPmText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 8,
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryFooter: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  summaryText: {
    fontSize: 12,
  },
});
