import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import { ScopeType, UIEventItem, UserSession } from './types';
import {
  INITIAL_MOCK_USER,
  INITIAL_MOCK_EVENTS,
  fetchCalendarEvents,
  createNewEvent,
} from './services/api';
import { theme } from './theme';

type MainViewMode = 'today' | 'calendar' | 'create';

interface DayGroup {
  dateKey: string;
  dayOfWeek: string;
  dayNumber: number;
  monthShort: string;
  events: UIEventItem[];
  tintBg: string;
  tintText: string;
}

export default function App() {
  const [viewMode, setViewMode] = useState<MainViewMode>('today');
  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('2026-11-12');

  // Form State for Event Creation
  const [formTitle, setFormTitle] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formScope, setFormScope] = useState<ScopeType>(ScopeType.SECTION);

  useEffect(() => {
    fetchCalendarEvents().then(setEvents);
  }, []);

  // Format date helper: YYYY-MM-DD
  const getDayKey = (isoString: string) => {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Group events by day for the stacked calendar view
  const dayGroups: DayGroup[] = useMemo(() => {
    const map = new Map<string, UIEventItem[]>();
    events.forEach(evt => {
      const key = getDayKey(evt.startTime);
      const list = map.get(key) || [];
      list.push(evt);
      map.set(key, list);
    });

    const tints = [
      { bg: theme.colors.tintLavender, text: theme.colors.tintLavenderText },
      { bg: theme.colors.tintRose, text: theme.colors.tintRoseText },
      { bg: theme.colors.tintSage, text: theme.colors.tintSageText },
      { bg: theme.colors.tintWarm, text: theme.colors.tintWarmText },
      { bg: theme.colors.tintSky, text: theme.colors.tintSkyText },
    ];

    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((key, idx) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const monthShort = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const tint = tints[idx % tints.length];

      return {
        dateKey: key,
        dayOfWeek,
        dayNumber: d,
        monthShort,
        events: map.get(key) || [],
        tintBg: tint.bg,
        tintText: tint.text,
      };
    });
  }, [events]);

  // Events for the selected day in "Today" view
  const selectedDayGroup = useMemo(() => {
    return (
      dayGroups.find(g => g.dateKey === selectedDayKey) ||
      dayGroups[0] || {
        dateKey: '2026-11-12',
        dayOfWeek: 'Thursday',
        dayNumber: 12,
        monthShort: 'NOV',
        events: [],
        tintBg: theme.colors.tintWarm,
        tintText: theme.colors.tintWarmText,
      }
    );
  }, [dayGroups, selectedDayKey]);

  // Format time range nicely (e.g. 10:00 AM – 11:30 AM)
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes === 0 ? '00' : String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const getDuration = (startIso: string, endIso: string) => {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);
    if (diffHours > 0 && diffMins > 0) return `${diffHours}h ${diffMins}m`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${diffMins}m`;
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Required Fields', 'Please enter event title and venue.');
      return;
    }

    const created = await createNewEvent({
      title: formTitle.trim(),
      description: formDesc.trim(),
      venue: formVenue.trim(),
      startTime: `${selectedDayKey}T10:00:00.000Z`,
      endTime: `${selectedDayKey}T11:30:00.000Z`,
      scope: formScope,
      clubName: formScope === ScopeType.CLUB ? user.clubs[0] || 'Coding Club' : undefined,
      targetSections:
        formScope === ScopeType.SECTION ? [`${user.course}-${user.section}`] : undefined,
    });

    setEvents(prev => [created, ...prev]);
    setFormTitle('');
    setFormVenue('');
    setFormDesc('');
    setViewMode('today');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Segmented Control (Image 1 reference) */}
      <View style={styles.topBar}>
        <View style={styles.segmentedControls}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'today' && styles.segmentBtnActive]}
            onPress={() => setViewMode('today')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.segmentBtnText, viewMode === 'today' && styles.segmentBtnTextActive]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'calendar' && styles.segmentBtnActive]}
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'calendar' && styles.segmentBtnTextActive,
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plus / Add Event Action */}
        <TouchableOpacity
          style={[styles.plusBtn, viewMode === 'create' && styles.plusBtnActive]}
          onPress={() => setViewMode(viewMode === 'create' ? 'today' : 'create')}
          activeOpacity={0.85}
        >
          <Feather
            name={viewMode === 'create' ? 'x' : 'plus'}
            size={18}
            color={viewMode === 'create' ? theme.colors.pillActiveText : theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* VIEW 1: TODAY / SCHEDULE VIEW (Image 1 Left Screen) */}
      {viewMode === 'today' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Big Bold Date Hero (Image 1 inspired) */}
          <View style={styles.heroDateRow}>
            <View style={styles.heroDateLeft}>
              <Text style={styles.heroDayOfWeek}>{selectedDayGroup.dayOfWeek}</Text>
              <Text style={styles.heroDateNumber}>{selectedDayGroup.dayNumber}.11</Text>
              <Text style={styles.heroMonthText}>{selectedDayGroup.monthShort}</Text>
            </View>

            {/* Context Info (clean, zero badge clutter) */}
            <View style={styles.heroContextRight}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Switch Actor', 'Test role permissions:', [
                    {
                      text: 'Student (Read-Only)',
                      onPress: () => setUser({ ...user, positions: ['Student'] }),
                    },
                    {
                      text: 'Class Rep (IT-A)',
                      onPress: () => setUser({ ...user, positions: ['Class Representative'] }),
                    },
                    {
                      text: 'Club Coordinator',
                      onPress: () => setUser({ ...user, positions: ['Club Coordinator'] }),
                    },
                  ]);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.contextRole}>{user.positions[0] || 'Student'}</Text>
                <Text style={styles.contextSection}>
                  {user.course}-{user.section} · Year {user.year}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Divider / Label */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Schedule</Text>
            <Text style={styles.sectionCount}>{selectedDayGroup.events.length} events</Text>
          </View>

          {/* Minimalist Event Cards (Ample negative space, zero badges) */}
          <View style={styles.eventsList}>
            {selectedDayGroup.events.map((evt, idx) => {
              const cardTints = [
                theme.colors.tintWarm,
                theme.colors.tintSage,
                theme.colors.tintLavender,
                theme.colors.tintSky,
              ];
              const cardBg = cardTints[idx % cardTints.length];

              return (
                <View key={evt.id} style={[styles.eventCard, { backgroundColor: cardBg }]}>
                  {/* Event Title */}
                  <Text style={styles.eventTitle}>{evt.title}</Text>

                  {/* Clean Time Span Row */}
                  <View style={styles.timeSpanRow}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeValue}>{formatTime(evt.startTime)}</Text>
                      <Text style={styles.timeSub}>Start</Text>
                    </View>

                    <View style={styles.durationPill}>
                      <Text style={styles.durationText}>
                        {getDuration(evt.startTime, evt.endTime)}
                      </Text>
                    </View>

                    <View style={styles.timeBlock}>
                      <Text style={styles.timeValue}>{formatTime(evt.endTime)}</Text>
                      <Text style={styles.timeSub}>End</Text>
                    </View>
                  </View>

                  {/* Understated Venue / Context */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.venueContainer}>
                      <Feather
                        name="map-pin"
                        size={13}
                        color={theme.colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.venueText}>{evt.venue}</Text>
                    </View>
                    {evt.isReadOnly && <Text style={styles.readOnlyNote}>IT-B · Read-Only</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* VIEW 2: CALENDAR STACKED FEED (Image 1 Right Screen) */}
      {viewMode === 'calendar' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Subtle Month Navigation */}
          <View style={styles.calendarMonthHeader}>
            <Text style={styles.monthPrev}>OCT</Text>
            <View style={styles.monthCurrentRow}>
              <Feather name="chevron-left" size={16} color={theme.colors.textMuted} />
              <Text style={styles.monthCurrentText}>NOV 2026</Text>
              <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.monthNext}>DEC</Text>
          </View>

          {/* Stacked Day Blocks (Generous Negative Space) */}
          <View style={styles.dayBlocksContainer}>
            {dayGroups.map(group => {
              const isSelected = group.dateKey === selectedDayKey;

              return (
                <TouchableOpacity
                  key={group.dateKey}
                  style={[
                    styles.dayBlockCard,
                    { backgroundColor: group.tintBg },
                    isSelected && styles.dayBlockCardSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedDayKey(group.dateKey);
                    setViewMode('today');
                  }}
                >
                  {/* Left Column: Big Date */}
                  <View style={styles.dayBlockLeft}>
                    <Text style={styles.dayBlockWeekday}>{group.dayOfWeek}</Text>
                    <Text style={styles.dayBlockNumber}>{group.dayNumber}</Text>
                    <Text style={styles.dayBlockMonth}>{group.monthShort}</Text>
                  </View>

                  {/* Right Column: Clean Event Lines */}
                  <View style={styles.dayBlockRight}>
                    {group.events.map(evt => (
                      <View key={evt.id} style={styles.dayBlockEventItem}>
                        <Text style={styles.dayBlockEventTime}>{formatTime(evt.startTime)}</Text>
                        <Text style={styles.dayBlockEventTitle} numberOfLines={1}>
                          {evt.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* VIEW 3: AUTHOR EVENT (Clean, Uncluttered Form) */}
      {viewMode === 'create' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.createContainer}>
            <Text style={styles.createTitle}>New Event</Text>
            <Text style={styles.createSubtitle}>
              Publish an event directly to the campus calendar without noise.
            </Text>

            {/* Scope Toggle (Clean text options, no heavy badges) */}
            <View style={styles.scopeSelector}>
              <TouchableOpacity
                style={[styles.scopeBtn, formScope === ScopeType.SECTION && styles.scopeBtnActive]}
                onPress={() => setFormScope(ScopeType.SECTION)}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    formScope === ScopeType.SECTION && styles.scopeBtnTextActive,
                  ]}
                >
                  Section
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, formScope === ScopeType.CLUB && styles.scopeBtnActive]}
                onPress={() => setFormScope(ScopeType.CLUB)}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    formScope === ScopeType.CLUB && styles.scopeBtnTextActive,
                  ]}
                >
                  Club
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, formScope === ScopeType.CAMPUS && styles.scopeBtnActive]}
                onPress={() => setFormScope(ScopeType.CAMPUS)}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    formScope === ScopeType.CAMPUS && styles.scopeBtnTextActive,
                  ]}
                >
                  Campus
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <TextInput
              style={styles.inputField}
              placeholder="Event Title"
              placeholderTextColor={theme.colors.textMuted}
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <TextInput
              style={styles.inputField}
              placeholder="Venue or Room"
              placeholderTextColor={theme.colors.textMuted}
              value={formVenue}
              onChangeText={setFormVenue}
            />

            <TextInput
              style={[styles.inputField, styles.inputArea]}
              placeholder="Notes or Agenda (Optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={formDesc}
              onChangeText={setFormDesc}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.publishBtn} activeOpacity={0.85} onPress={handleCreate}>
              <Text style={styles.publishBtnText}>Publish Event</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop:
      Platform.OS === 'android'
        ? RNStatusBar.currentHeight
          ? RNStatusBar.currentHeight + 12
          : 40
        : 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.bg,
  },
  segmentedControls: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.pillActiveBg,
  },
  segmentBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: theme.colors.pillActiveText,
    fontWeight: '700',
  },
  plusBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBtnActive: {
    backgroundColor: theme.colors.pillActiveBg,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  // Today View Styles
  heroDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 18,
    marginBottom: 26,
  },
  heroDateLeft: {
    alignItems: 'flex-start',
  },
  heroDayOfWeek: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  heroDateNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  heroMonthText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 2,
    marginTop: -4,
  },
  heroContextRight: {
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  contextRole: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contextSection: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  eventsList: {
    gap: 16,
  },
  eventCard: {
    borderRadius: theme.radius.xl,
    padding: 22,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 26,
    marginBottom: 18,
  },
  timeSpanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  timeBlock: {
    alignItems: 'flex-start',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  durationPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 14,
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  readOnlyNote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },

  // Calendar Feed Styles (Image 1 Right Screen)
  calendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 8,
  },
  monthPrev: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  monthCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthCurrentText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  monthNext: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  dayBlocksContainer: {
    gap: 14,
  },
  dayBlockCard: {
    borderRadius: theme.radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBlockCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.pillActiveBg,
  },
  dayBlockLeft: {
    width: 90,
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.08)',
    paddingRight: 12,
  },
  dayBlockWeekday: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  dayBlockNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    lineHeight: 36,
  },
  dayBlockMonth: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  dayBlockRight: {
    flex: 1,
    paddingLeft: 16,
    gap: 10,
  },
  dayBlockEventItem: {
    flexDirection: 'column',
  },
  dayBlockEventTime: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  dayBlockEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  // Author Event Form Styles
  createContainer: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.xl,
    padding: 24,
    marginTop: 10,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  createSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  scopeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 16,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  scopeBtnActive: {
    backgroundColor: theme.colors.bgCard,
  },
  scopeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  scopeBtnTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  inputArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  publishBtn: {
    backgroundColor: theme.colors.pillActiveBg,
    borderRadius: theme.radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  publishBtnText: {
    color: theme.colors.pillActiveText,
    fontSize: 14,
    fontWeight: '700',
  },
});
