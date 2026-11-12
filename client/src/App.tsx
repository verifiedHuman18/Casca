import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
  Switch,
  Pressable,
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
import { getTheme, ThemeMode } from './theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 100; // px drag down to dismiss

// ── View modes ───────────────────────────────────────────────────────────────
type MainViewMode = 'day' | 'month';

// ── Data types ───────────────────────────────────────────────────────────────
interface DayGroup {
  dateKey: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  dayNumber: number;
  monthShort: string;
  monthNumber: number;
  year: number;
  events: UIEventItem[];
  tintBg: string;
  tintText: string;
}

// ── Swipeable bottom-sheet hook ───────────────────────────────────────────────
function useBottomSheet(onClose: () => void) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const open = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 200,
    }).start();
  }, [translateY]);

  const close = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 8,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > SWIPE_THRESHOLD || vy > 1.5) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 24,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

  return { translateY, open, close, panResponder };
}

// ── Role config ───────────────────────────────────────────────────────────────
const AVAILABLE_ROLES = [
  {
    id: 'Student',
    label: 'Student',
    description: 'Personal timetable & campus notices (Read-Only)',
  },
  {
    id: 'Class Representative',
    label: 'Class Representative (CR)',
    description: 'Author & manage Section IT-A timetable & updates',
  },
  {
    id: 'Club Coordinator',
    label: 'Club Coordinator',
    description: 'Publish Coding Club & campus hackathon events',
  },
];

// ── Calendar helpers ──────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [viewMode, setViewMode] = useState<MainViewMode>('day');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const th = getTheme(themeMode);
  const c = th.colors;

  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);

  // Date navigation
  const today = new Date();
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()); // 0-based
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  // Sheets / overlays
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UIEventItem | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formScope, setFormScope] = useState<ScopeType>(ScopeType.SECTION);

  useEffect(() => {
    fetchCalendarEvents().then(setEvents);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const parseDateKey = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  };

  const getDateKeyFromISO = (iso: string) => {
    const d = new Date(iso);
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const fh = h % 12 || 12;
    return `${fh}:${m === 0 ? '00' : String(m).padStart(2, '0')} ${ampm}`;
  };

  const getDuration = (start: string, end: string) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.round((ms % 3600000) / 60000);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // ── Event grouping ──────────────────────────────────────────────────────────
  const eventsByDay = useMemo(() => {
    const map = new Map<string, UIEventItem[]>();
    events.forEach(evt => {
      const key = getDateKeyFromISO(evt.startTime);
      map.set(key, [...(map.get(key) || []), evt]);
    });
    return map;
  }, [events]);

  const tintCycle = useMemo(
    () => [
      { bg: c.tintLavender, text: c.tintLavenderText },
      { bg: c.tintRose, text: c.tintRoseText },
      { bg: c.tintSage, text: c.tintSageText },
      { bg: c.tintWarm, text: c.tintWarmText },
      { bg: c.tintSky, text: c.tintSkyText },
    ],
    [c]
  );

  const dayGroups: DayGroup[] = useMemo(() => {
    const sortedKeys = Array.from(eventsByDay.keys()).sort();
    return sortedKeys.map((key, idx) => {
      const { year, month, day } = parseDateKey(key);
      const date = new Date(year, month, day);
      const tint = tintCycle[idx % tintCycle.length];
      return {
        dateKey: key,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekShort: DAY_SHORT[date.getDay()],
        dayNumber: day,
        monthShort: MONTH_SHORT[month],
        monthNumber: month,
        year,
        events: eventsByDay.get(key) || [],
        tintBg: tint.bg,
        tintText: tint.text,
      };
    });
  }, [eventsByDay, tintCycle]);

  const selectedDayGroup = useMemo(() => {
    const found = dayGroups.find(g => g.dateKey === selectedDayKey);
    if (found) return found;
    const { year, month, day } = parseDateKey(selectedDayKey);
    const date = new Date(year, month, day);
    return {
      dateKey: selectedDayKey,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      dayOfWeekShort: DAY_SHORT[date.getDay()],
      dayNumber: day,
      monthShort: MONTH_SHORT[month],
      monthNumber: month,
      year,
      events: [],
      tintBg: c.tintWarm,
      tintText: c.tintWarmText,
    };
  }, [dayGroups, selectedDayKey, c]);

  const currentRole = user.positions[0] || 'Student';

  const handleSelectRole = (roleId: string) => setUser(prev => ({ ...prev, positions: [roleId] }));

  // ── Sheet controllers ───────────────────────────────────────────────────────
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);
  const closeEventDetail = useCallback(() => setSelectedEvent(null), []);

  const settingsSheet = useBottomSheet(closeSettings);
  const createSheet = useBottomSheet(closeCreate);
  const eventSheet = useBottomSheet(closeEventDetail);

  // Open / close sheet when visible state changes
  useEffect(() => {
    if (isSettingsOpen) settingsSheet.open();
  }, [isSettingsOpen]);
  useEffect(() => {
    if (isCreateOpen) createSheet.open();
  }, [isCreateOpen]);
  useEffect(() => {
    if (selectedEvent) eventSheet.open();
  }, [selectedEvent]);

  // ── Event creation ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Required Fields', 'Please enter event title and venue.');
      return;
    }
    if (currentRole === 'Student') {
      Alert.alert(
        'Permission Restricted',
        'Student accounts are read-only. Switch to Class Rep or Club Coordinator to publish events.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch to Class Rep',
            onPress: () => handleSelectRole('Class Representative'),
          },
        ]
      );
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
    createSheet.close();
  };

  // ── Month grid helpers ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDow = getFirstDayOfWeek(calendarYear, calendarMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarYear, calendarMonth]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // ── Styles factory (theme-aware, computed once per theme change) ─────────────
  const styles = useMemo(() => makeStyles(c), [c]);

  const statusBarStyle = themeMode === 'dark' ? 'light' : 'dark';

  // ── Bottom Sheet wrapper ─────────────────────────────────────────────────────
  const BottomSheet = ({
    visible,
    translateY,
    panResponder,
    onClose,
    children,
  }: {
    visible: boolean;
    translateY: Animated.Value;
    panResponder: ReturnType<typeof PanResponder.create>;
    onClose: () => void;
    children: React.ReactNode;
  }) => (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Static backdrop — no fade animation */}
      <View style={styles.backdropFixed} />
      <Pressable style={styles.backdropTouchable} onPress={onClose} />
      <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.handleZone}>
          <View style={styles.sheetHandle} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBarStyle} />

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        {/* Day | Month segmented control */}
        <View style={styles.segmentedControls}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'day' && styles.segmentBtnActive]}
            onPress={() => setViewMode('day')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.segmentBtnText, viewMode === 'day' && styles.segmentBtnTextActive]}
            >
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'month' && styles.segmentBtnActive]}
            onPress={() => setViewMode('month')}
            activeOpacity={0.85}
          >
            <Text
              style={[styles.segmentBtnText, viewMode === 'month' && styles.segmentBtnTextActive]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings button */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setIsSettingsOpen(true)}
          activeOpacity={0.8}
          accessibilityLabel="Profile and settings"
        >
          <Feather name="sliders" size={18} color={c.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── DAY VIEW ────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Date hero */}
          <View style={styles.heroDateRow}>
            <View>
              <Text style={styles.heroDayOfWeek}>{selectedDayGroup.dayOfWeek}</Text>
              <Text style={styles.heroDateNumber}>
                {selectedDayGroup.dayNumber}.
                {String(selectedDayGroup.monthNumber + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.heroMonthText}>{selectedDayGroup.monthShort}</Text>
            </View>
            <TouchableOpacity
              style={styles.heroContextRight}
              onPress={() => setIsSettingsOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.contextRole}>{currentRole}</Text>
              <Text style={styles.contextSection}>
                {user.course}-{user.section} · Year {user.year}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section label */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Schedule</Text>
            <Text style={styles.sectionCount}>{selectedDayGroup.events.length} events</Text>
          </View>

          {/* Event cards — tap goes to Event Detail sheet */}
          <View style={styles.eventsList}>
            {selectedDayGroup.events.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="calendar" size={32} color={c.textMuted} />
                <Text style={styles.emptyText}>No events today</Text>
              </View>
            )}
            {selectedDayGroup.events.map((evt, idx) => {
              const cardTints = [c.tintWarm, c.tintSage, c.tintLavender, c.tintSky];
              const cardBg = cardTints[idx % cardTints.length];
              return (
                <TouchableOpacity
                  key={evt.id}
                  style={[styles.eventCard, { backgroundColor: cardBg }]}
                  onPress={() => setSelectedEvent(evt)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.eventTitle}>{evt.title}</Text>
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
                  <View style={styles.cardBottomRow}>
                    <View style={styles.venueContainer}>
                      <Feather
                        name="map-pin"
                        size={13}
                        color={c.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.venueText}>{evt.venue}</Text>
                    </View>
                    {evt.isReadOnly && <Text style={styles.readOnlyNote}>Read-Only</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ── MONTH VIEW ──────────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Month navigation */}
          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity
              onPress={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear(y => y - 1);
                } else {
                  setCalendarMonth(m => m - 1);
                }
              }}
              style={styles.monthNavBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="chevron-left" size={22} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthCurrentText}>
              {MONTH_NAMES[calendarMonth].toUpperCase()} {calendarYear}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear(y => y + 1);
                } else {
                  setCalendarMonth(m => m + 1);
                }
              }}
              style={styles.monthNavBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="chevron-right" size={22} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.calendarWeekHeader}>
            {DAY_SHORT.map(d => (
              <Text key={d} style={styles.calendarWeekHeaderText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Day cells grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return <View key={`empty-${idx}`} style={styles.calendarCell} />;
              }
              const key = toDateKey(calendarYear, calendarMonth, dayNum);
              const isToday = key === todayKey;
              const isSelected = key === selectedDayKey;
              const hasEvents = (eventsByDay.get(key) || []).length > 0;

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.calendarCell}
                  onPress={() => {
                    setSelectedDayKey(key);
                    setViewMode('day');
                  }}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.calendarDayCircle,
                      isToday && styles.calendarDayToday,
                      isSelected && !isToday && styles.calendarDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isToday && styles.calendarDayTextToday,
                        isSelected && !isToday && styles.calendarDayTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </View>
                  {hasEvents && (
                    <View
                      style={[styles.calendarEventDot, isToday && { backgroundColor: c.bgCard }]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Events for selected month-day shown below the grid */}
          <View style={styles.monthEventListHeader}>
            <Text style={styles.monthEventListTitle}>
              {selectedDayGroup.dayOfWeek}, {selectedDayGroup.dayNumber}{' '}
              {selectedDayGroup.monthShort}
            </Text>
          </View>
          {selectedDayGroup.events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events on this day</Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {selectedDayGroup.events.map((evt, idx) => {
                const cardTints = [c.tintWarm, c.tintSage, c.tintLavender, c.tintSky];
                const cardBg = cardTints[idx % cardTints.length];
                return (
                  <TouchableOpacity
                    key={evt.id}
                    style={[styles.eventCard, { backgroundColor: cardBg }]}
                    onPress={() => setSelectedEvent(evt)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.eventTitle}>{evt.title}</Text>
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
                    <View style={styles.cardBottomRow}>
                      <View style={styles.venueContainer}>
                        <Feather
                          name="map-pin"
                          size={13}
                          color={c.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.venueText}>{evt.venue}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Floating Add Button ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        onPress={() => setIsCreateOpen(true)}
        activeOpacity={0.88}
        accessibilityLabel="Add new event"
      >
        <Feather name="plus" size={24} color={c.pillActiveText} />
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════════════
          EVENT DETAIL SHEET
      ══════════════════════════════════════════════════════════════════ */}
      <BottomSheet
        visible={!!selectedEvent}
        translateY={eventSheet.translateY}
        panResponder={eventSheet.panResponder}
        onClose={closeEventDetail}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Event</Text>
          <TouchableOpacity
            style={styles.sheetCloseBtn}
            onPress={eventSheet.close}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
        {selectedEvent && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
            {/* Hero title area */}
            <View style={[styles.eventDetailHero, { backgroundColor: c.tintLavender }]}>
              <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
              <View style={styles.eventDetailTimeRow}>
                <Text style={styles.eventDetailTime}>{formatTime(selectedEvent.startTime)}</Text>
                <Text style={styles.eventDetailDash}> — </Text>
                <Text style={styles.eventDetailTime}>{formatTime(selectedEvent.endTime)}</Text>
                <Text style={styles.eventDetailDuration}>
                  {' '}
                  {getDuration(selectedEvent.startTime, selectedEvent.endTime)}
                </Text>
              </View>
            </View>

            {/* Meta rows */}
            <View style={styles.eventDetailMeta}>
              <View style={styles.eventDetailMetaRow}>
                <Feather name="map-pin" size={16} color={c.textSecondary} />
                <Text style={styles.eventDetailMetaText}>{selectedEvent.venue}</Text>
              </View>
              <View style={styles.eventDetailMetaDivider} />
              <View style={styles.eventDetailMetaRow}>
                <Feather name="users" size={16} color={c.textSecondary} />
                <Text style={styles.eventDetailMetaText}>
                  {selectedEvent.scope === ScopeType.SECTION
                    ? (selectedEvent.targetSections || []).join(', ') || 'Section event'
                    : selectedEvent.scope === ScopeType.CLUB
                      ? selectedEvent.clubName || 'Club event'
                      : 'Campus-wide'}
                </Text>
              </View>
              {selectedEvent.description ? (
                <>
                  <View style={styles.eventDetailMetaDivider} />
                  <Text style={styles.eventDetailDesc}>{selectedEvent.description}</Text>
                </>
              ) : null}
            </View>
          </ScrollView>
        )}
      </BottomSheet>

      {/* ══════════════════════════════════════════════════════════════════
          SETTINGS SHEET
      ══════════════════════════════════════════════════════════════════ */}
      <BottomSheet
        visible={isSettingsOpen}
        translateY={settingsSheet.translateY}
        panResponder={settingsSheet.panResponder}
        onClose={closeSettings}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Profile & Settings</Text>
          <TouchableOpacity
            style={styles.sheetCloseBtn}
            onPress={settingsSheet.close}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScrollContent}
        >
          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>AS</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEnrollment}>{user.enrollmentNo}</Text>
              <Text style={styles.profileMeta}>
                {user.course}-{user.section} · Semester 4 (Year {user.year})
              </Text>
            </View>
          </View>

          {/* Campus persona */}
          <View style={styles.sheetSection}>
            <Text style={styles.sheetSectionTitle}>CAMPUS PERSONA</Text>
            <View style={styles.rolesList}>
              {AVAILABLE_ROLES.map(role => {
                const isActive = currentRole === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[styles.roleItem, isActive && styles.roleItemActive]}
                    onPress={() => handleSelectRole(role.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roleItemLeft}>
                      <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                        {role.label}
                      </Text>
                      <Text style={styles.roleDescription}>{role.description}</Text>
                    </View>
                    <Feather
                      name={isActive ? 'check-circle' : 'circle'}
                      size={20}
                      color={isActive ? c.pillActiveBg : c.borderStrong}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Appearance */}
          <View style={styles.sheetSection}>
            <Text style={styles.sheetSectionTitle}>APPEARANCE</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather
                    name={themeMode === 'dark' ? 'moon' : 'sun'}
                    size={16}
                    color={c.textSecondary}
                  />
                  <Text style={styles.infoLabel}>Dark Mode</Text>
                </View>
                <Switch
                  value={themeMode === 'dark'}
                  onValueChange={v => setThemeMode(v ? 'dark' : 'light')}
                  trackColor={{ false: c.surfaceSubtle, true: c.pillActiveBg }}
                  thumbColor={themeMode === 'dark' ? c.pillActiveText : c.bgCard}
                />
              </View>
            </View>
          </View>

          {/* Campus sync */}
          <View style={styles.sheetSection}>
            <Text style={styles.sheetSectionTitle}>CAMPUS SYNC</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Institution</Text>
                <Text style={styles.infoValue}>IIIT Allahabad</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Calendar Gateway</Text>
                <Text style={styles.infoValue}>Connected · Real-time</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Offline Cache</Text>
                <Text style={styles.infoValue}>{events.length} items synced</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.appFooter}>
            <Text style={styles.appName}>Casca Campus</Text>
            <Text style={styles.appMeta}>v0.1.0 · Calm, distraction-free academic scheduling</Text>
          </View>

          <TouchableOpacity
            style={styles.sheetDoneBtn}
            onPress={settingsSheet.close}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* ══════════════════════════════════════════════════════════════════
          CREATE EVENT SHEET
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={isCreateOpen}
        transparent
        animationType="none"
        onRequestClose={() => createSheet.close()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Static backdrop */}
          <View style={styles.backdropFixed} />
          <Pressable style={styles.backdropTouchable} onPress={() => createSheet.close()} />
          <Animated.View
            style={[styles.sheetContainer, { transform: [{ translateY: createSheet.translateY }] }]}
          >
            <View {...createSheet.panResponder.panHandlers} style={styles.handleZone}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Event</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => createSheet.close()}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.createSubtitle}>
                Publish an event directly to the campus calendar.
              </Text>

              {currentRole === 'Student' && (
                <View style={styles.studentNoticeBox}>
                  <Feather
                    name="info"
                    size={16}
                    color={c.tintWarmText}
                    style={{ marginRight: 8, marginTop: 1 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentNoticeText}>
                      Student accounts are read-only. Switch role to publish events.
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleSelectRole('Class Representative')}
                      style={styles.quickSwitchBtn}
                    >
                      <Text style={styles.quickSwitchText}>Switch to Class Rep →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.scopeSelector}>
                {([ScopeType.SECTION, ScopeType.CLUB, ScopeType.CAMPUS] as ScopeType[]).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.scopeBtn, formScope === s && styles.scopeBtnActive]}
                    onPress={() => setFormScope(s)}
                  >
                    <Text
                      style={[styles.scopeBtnText, formScope === s && styles.scopeBtnTextActive]}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.inputField}
                placeholder="Event Title"
                placeholderTextColor={c.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <TextInput
                style={styles.inputField}
                placeholder="Venue or Room"
                placeholderTextColor={c.textMuted}
                value={formVenue}
                onChangeText={setFormVenue}
              />
              <TextInput
                style={[styles.inputField, styles.inputArea]}
                placeholder="Notes or Agenda (Optional)"
                placeholderTextColor={c.textMuted}
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.publishBtn}
                activeOpacity={0.85}
                onPress={handleCreate}
              >
                <Text style={styles.publishBtnText}>Publish Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  STYLES — theme-aware factory
// ═══════════════════════════════════════════════════════════════════════════
function makeStyles(c: ReturnType<typeof getTheme>['colors']) {
  const statusBarH = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },

    // ── Top bar ────────────────────────────────────────────────────────────
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: statusBarH + 12,
      paddingBottom: 16,
      backgroundColor: c.bg,
    },
    segmentedControls: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 9999,
      padding: 4,
      gap: 4,
    },
    segmentBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 9999 },
    segmentBtnActive: { backgroundColor: c.pillActiveBg },
    segmentBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    segmentBtnTextActive: { color: c.pillActiveText, fontWeight: '700' },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── FAB ────────────────────────────────────────────────────────────────
    floatingAddBtn: {
      position: 'absolute',
      bottom: 28,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.pillActiveBg,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      zIndex: 99,
    },

    // ── Scroll ────────────────────────────────────────────────────────────
    scrollContainer: { flex: 1 },
    scrollContent: { paddingHorizontal: 22, paddingBottom: 110 },

    // ── Day hero ──────────────────────────────────────────────────────────
    heroDateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 18,
      marginBottom: 26,
    },
    heroDayOfWeek: { fontSize: 15, fontWeight: '600', color: c.textSecondary, marginBottom: 2 },
    heroDateNumber: {
      fontSize: 52,
      fontWeight: '900',
      color: c.textPrimary,
      letterSpacing: -1.5,
      lineHeight: 56,
    },
    heroMonthText: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: 2,
      marginTop: -4,
    },
    heroContextRight: { alignItems: 'flex-end', paddingTop: 8 },
    contextRole: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    contextSection: { fontSize: 12, color: c.textMuted, marginTop: 4 },

    // ── Section header ────────────────────────────────────────────────────
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionLabel: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    sectionCount: { fontSize: 13, color: c.textMuted },

    // ── Event cards ───────────────────────────────────────────────────────
    eventsList: { gap: 16 },
    eventCard: { borderRadius: 28, padding: 22 },
    eventTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      lineHeight: 26,
      marginBottom: 18,
    },
    timeSpanRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    timeBlock: { alignItems: 'flex-start' },
    timeValue: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    timeSub: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
    durationPill: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 9999,
    },
    durationText: { fontSize: 12, fontWeight: '700', color: c.textPrimary },
    cardBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.06)',
      paddingTop: 14,
    },
    venueContainer: { flexDirection: 'row', alignItems: 'center' },
    venueText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    readOnlyNote: { fontSize: 11, fontStyle: 'italic', color: c.textSecondary },

    // ── Empty state ───────────────────────────────────────────────────────
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { fontSize: 15, color: c.textMuted, fontWeight: '500' },

    // ── Month calendar ────────────────────────────────────────────────────
    calendarMonthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 4,
    },
    monthNavBtn: { padding: 4 },
    monthCurrentText: { fontSize: 17, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.5 },
    calendarWeekHeader: { flexDirection: 'row', marginBottom: 8 },
    calendarWeekHeaderText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: c.calendarWeekHeader,
      letterSpacing: 0.5,
    },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarCell: {
      width: `${100 / 7}%`,
      aspectRatio: 0.9,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 4,
    },
    calendarDayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarDayToday: { backgroundColor: c.calendarToday },
    calendarDaySelected: { backgroundColor: c.calendarSelected },
    calendarDayText: { fontSize: 14, fontWeight: '500', color: c.textPrimary },
    calendarDayTextToday: { color: c.calendarTodayText, fontWeight: '800' },
    calendarDayTextSelected: { color: c.calendarSelectedText, fontWeight: '700' },
    calendarEventDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.dayEventDot,
      marginTop: 3,
    },
    monthEventListHeader: { paddingTop: 24, paddingBottom: 14 },
    monthEventListTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },

    // ── Sheet backdrop ────────────────────────────────────────────────────
    backdropFixed: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.overlayBg,
    },
    backdropTouchable: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: '30%', // leaves space for the sheet
    },

    // ── Bottom sheet ──────────────────────────────────────────────────────
    sheetContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.bgCard,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 28,
      maxHeight: '88%',
    },
    handleZone: {
      paddingTop: 12,
      paddingBottom: 8,
      alignItems: 'center',
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderStrong,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    sheetTitle: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
    sheetCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetScrollContent: { paddingBottom: 24 },

    // ── Event detail ──────────────────────────────────────────────────────
    eventDetailHero: {
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
    },
    eventDetailTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: c.textPrimary,
      lineHeight: 28,
      marginBottom: 14,
    },
    eventDetailTimeRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
    eventDetailTime: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    eventDetailDash: { fontSize: 16, color: c.textSecondary },
    eventDetailDuration: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    eventDetailMeta: {
      backgroundColor: c.surfaceSubtle,
      borderRadius: 16,
      padding: 18,
      gap: 2,
    },
    eventDetailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    eventDetailMetaText: { fontSize: 14, color: c.textPrimary, fontWeight: '500', flex: 1 },
    eventDetailMetaDivider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
    eventDetailDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 20, marginTop: 4 },

    // ── Profile card ──────────────────────────────────────────────────────
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 22,
      padding: 16,
      marginBottom: 24,
    },
    avatarCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.pillActiveBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: c.pillActiveText, letterSpacing: 1 },
    profileDetails: { flex: 1 },
    profileName: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
    profileEnrollment: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginTop: 2 },
    profileMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    // ── Sheet sections ────────────────────────────────────────────────────
    sheetSection: { marginBottom: 24 },
    sheetSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textMuted,
      letterSpacing: 1.4,
      marginBottom: 10,
    },
    rolesList: { gap: 10 },
    roleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: 14,
      padding: 16,
    },
    roleItemActive: {
      borderColor: c.pillActiveBg,
      backgroundColor: c.bgCard,
    },
    roleItemLeft: { flex: 1, paddingRight: 12 },
    roleLabel: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 2 },
    roleLabelActive: { fontWeight: '800' },
    roleDescription: { fontSize: 12, color: c.textSecondary, lineHeight: 16 },

    // ── Info box ──────────────────────────────────────────────────────────
    infoBox: { backgroundColor: c.surfaceSubtle, borderRadius: 14, padding: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    infoValue: { fontSize: 13, color: c.textPrimary, fontWeight: '700' },
    infoDivider: { height: 1, backgroundColor: c.border, marginVertical: 12 },

    appFooter: { alignItems: 'center', marginVertical: 18 },
    appName: { fontSize: 14, fontWeight: '800', color: c.textPrimary, letterSpacing: 0.5 },
    appMeta: { fontSize: 12, color: c.textMuted, marginTop: 4 },

    sheetDoneBtn: {
      backgroundColor: c.pillActiveBg,
      borderRadius: 9999,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    sheetDoneBtnText: { color: c.pillActiveText, fontSize: 15, fontWeight: '700' },

    // ── Create form ───────────────────────────────────────────────────────
    createSubtitle: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginBottom: 18 },
    studentNoticeBox: {
      flexDirection: 'row',
      backgroundColor: c.tintWarm,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    studentNoticeText: { fontSize: 12, color: c.tintWarmText, lineHeight: 17 },
    quickSwitchBtn: { marginTop: 6 },
    quickSwitchText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.tintWarmText,
      textDecorationLine: 'underline',
    },
    scopeSelector: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 14,
      padding: 4,
      marginBottom: 16,
    },
    scopeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    scopeBtnActive: { backgroundColor: c.bgCard },
    scopeBtnText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    scopeBtnTextActive: { color: c.textPrimary, fontWeight: '700' },
    inputField: {
      backgroundColor: c.surfaceSubtle,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      color: c.textPrimary,
      marginBottom: 12,
    },
    inputArea: { height: 80, textAlignVertical: 'top' },
    publishBtn: {
      backgroundColor: c.pillActiveBg,
      borderRadius: 9999,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    publishBtnText: { color: c.pillActiveText, fontSize: 15, fontWeight: '700' },
  });
}
