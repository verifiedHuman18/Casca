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
  Pressable,
  BackHandler,
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
const SWIPE_DISMISS_THRESHOLD = 90;

type MainViewMode = 'day' | 'month' | 'event';

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

// ─── Swipeable Drawer Component ──────────────────────────────────────────────
interface SwipeableDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  colors: ReturnType<typeof getTheme>['colors'];
  children: React.ReactNode;
}

function SwipeableDrawer({ visible, onClose, title, colors, children }: SwipeableDrawerProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [translateY, onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 26,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_DISMISS_THRESHOLD || gestureState.vy > 0.6) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 24,
            stiffness: 240,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={drawerStyles.modalRoot}>
        {/* Static, non-animated dark overlay per user instruction */}
        <Pressable
          style={[drawerStyles.staticOverlay, { backgroundColor: colors.overlayBg }]}
          onPress={handleClose}
        />

        {/* Animated sheet container */}
        <Animated.View
          style={[
            drawerStyles.sheetContainer,
            { backgroundColor: colors.bgCard, transform: [{ translateY }] },
          ]}
        >
          {/* Top Drag Handle & Header (Swipeable touch zone) */}
          <View {...panResponder.panHandlers} style={drawerStyles.dragHeaderZone}>
            <View style={[drawerStyles.dragHandleBar, { backgroundColor: colors.borderStrong }]} />
            <View style={drawerStyles.headerRow}>
              <Text style={[drawerStyles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity
                style={[drawerStyles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleClose}
                activeOpacity={0.7}
                accessibilityLabel="Close drawer"
              >
                <Feather name="x" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Drawer Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={drawerStyles.contentScroll}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Application ────────────────────────────────────────────────────────
export default function App() {
  const [viewMode, setViewMode] = useState<MainViewMode>('day');
  const [previousViewMode, setPreviousViewMode] = useState<'day' | 'month'>('day');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<UIEventItem | null>(null);
  const [isReminderSet, setIsReminderSet] = useState(false);

  // Month & Day state
  const today = new Date();
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  // Drawer states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State for Event Creation
  const [formTitle, setFormTitle] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formScope, setFormScope] = useState<ScopeType>(ScopeType.SECTION);

  const th = getTheme(themeMode);
  const c = th.colors;

  useEffect(() => {
    fetchCalendarEvents().then(setEvents);
  }, []);

  // Hardware Back button handling
  useEffect(() => {
    const onBackPress = () => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isCreateOpen) {
        setIsCreateOpen(false);
        return true;
      }
      if (viewMode === 'event') {
        setViewMode(previousViewMode);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isSettingsOpen, isCreateOpen, viewMode, previousViewMode]);

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
      { bg: c.tintWarm, text: c.tintWarmText },
      { bg: c.tintSage, text: c.tintSageText },
      { bg: c.tintLavender, text: c.tintLavenderText },
      { bg: c.tintSky, text: c.tintSkyText },
      { bg: c.tintRose, text: c.tintRoseText },
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
      events: eventsByDay.get(selectedDayKey) || [],
      tintBg: c.tintWarm,
      tintText: c.tintWarmText,
    };
  }, [dayGroups, selectedDayKey, eventsByDay, c]);

  const currentRole = user.positions[0] || 'Student';

  const handleSelectRole = (roleId: string) =>
    setUser(prev => ({
      ...prev,
      positions: [roleId],
    }));

  const handleOpenEventScreen = (evt: UIEventItem, fromView: 'day' | 'month') => {
    setSelectedEvent(evt);
    setIsReminderSet(false);
    setPreviousViewMode(fromView);
    setViewMode('event');
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Required Fields', 'Please enter event title and venue.');
      return;
    }

    if (currentRole === 'Student') {
      Alert.alert(
        'Permission Restricted',
        'Student accounts have read-only access. Switch your role to Class Representative or Club Coordinator in Settings to publish campus events.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch to Class Rep',
            onPress: () => {
              handleSelectRole('Class Representative');
              Alert.alert(
                'Role Updated',
                'You are now Class Representative (IT-A). Tap Publish again.'
              );
            },
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
    setIsCreateOpen(false);
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDow = getFirstDayOfWeek(calendarYear, calendarMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarYear, calendarMonth]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const styles = useMemo(() => makeStyles(c), [c]);
  const statusBarStyle = themeMode === 'dark' ? 'light' : 'dark';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBarStyle} />

      {/* ── TOP BAR (When not on Event Screen) ─────────────────────────── */}
      {viewMode !== 'event' ? (
        <View style={styles.topBar}>
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

          {/* Dedicated Settings Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setIsSettingsOpen(true)}
            activeOpacity={0.8}
            accessibilityLabel="Profile and settings drawer"
          >
            <Feather name="sliders" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Event Screen Navigation Header */
        <View style={styles.eventNavHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setViewMode(previousViewMode)}
            activeOpacity={0.75}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={22} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.eventNavTitle}>Event Details</Text>
          <TouchableOpacity
            style={styles.eventShareBtn}
            onPress={() => Alert.alert('Share Event', 'Calendar invitation link copied.')}
            activeOpacity={0.75}
          >
            <Feather name="share-2" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── 1. DAY VIEW ────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Hero Date Display */}
          <View style={styles.heroDateRow}>
            <View style={styles.heroDateLeft}>
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
              accessibilityLabel="Open settings drawer"
            >
              <Text style={styles.contextRole}>{currentRole}</Text>
              <Text style={styles.contextSection}>
                {user.course}-{user.section} · Year {user.year}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section Divider */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Day Schedule</Text>
            <Text style={styles.sectionCount}>{selectedDayGroup.events.length} events</Text>
          </View>

          {/* Event Cards */}
          <View style={styles.eventsList}>
            {selectedDayGroup.events.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="calendar" size={32} color={c.textMuted} />
                <Text style={styles.emptyText}>No events scheduled for today</Text>
              </View>
            ) : (
              selectedDayGroup.events.map((evt, idx) => {
                const cardTints = [c.tintWarm, c.tintSage, c.tintLavender, c.tintSky];
                const cardBg = cardTints[idx % cardTints.length];

                return (
                  <TouchableOpacity
                    key={evt.id}
                    style={[styles.eventCard, { backgroundColor: cardBg }]}
                    onPress={() => handleOpenEventScreen(evt, 'day')}
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
                      {evt.isReadOnly && <Text style={styles.readOnlyNote}>IT-B · Read-Only</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ── 2. MONTH VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Month Header & Controls */}
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

          {/* Day-of-week Column Labels */}
          <View style={styles.calendarWeekHeader}>
            {DAY_SHORT.map(d => (
              <Text key={d} style={styles.calendarWeekHeaderText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Month Grid Cells */}
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
                  onPress={() => setSelectedDayKey(key)}
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

          {/* Events list for selected date in month view */}
          <View style={styles.monthEventListHeader}>
            <Text style={styles.monthEventListTitle}>
              {selectedDayGroup.dayOfWeek}, {selectedDayGroup.dayNumber}{' '}
              {selectedDayGroup.monthShort}
            </Text>
            <Text style={styles.monthEventListCount}>
              {selectedDayGroup.events.length} event
              {selectedDayGroup.events.length === 1 ? '' : 's'}
            </Text>
          </View>

          {selectedDayGroup.events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No events scheduled on this day</Text>
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
                    onPress={() => handleOpenEventScreen(evt, 'month')}
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
                      <Text style={styles.readOnlyNote}>Tap for details →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── 3. DEDICATED EVENT SCREEN ──────────────────────────────────── */}
      {viewMode === 'event' && selectedEvent && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Event Hero Card */}
          <View style={[styles.eventScreenHero, { backgroundColor: c.tintLavender }]}>
            <Text style={styles.eventScreenTitle}>{selectedEvent.title}</Text>
            <View style={styles.eventScreenTimeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.eventScreenTime}>{formatTime(selectedEvent.startTime)}</Text>
                <Text style={styles.timeSub}>Start Time</Text>
              </View>
              <View style={styles.eventScreenDurationPill}>
                <Text style={styles.eventScreenDurationText}>
                  {getDuration(selectedEvent.startTime, selectedEvent.endTime)}
                </Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.eventScreenTime}>{formatTime(selectedEvent.endTime)}</Text>
                <Text style={styles.timeSub}>End Time</Text>
              </View>
            </View>
          </View>

          {/* Structured Event Metadata */}
          <View style={styles.eventScreenSection}>
            <Text style={styles.eventScreenSectionTitle}>LOGISTICS & VENUE</Text>
            <View style={styles.eventScreenInfoBox}>
              <View style={styles.eventScreenInfoRow}>
                <Feather
                  name="map-pin"
                  size={16}
                  color={c.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Location / Room</Text>
                  <Text style={styles.infoValue}>{selectedEvent.venue}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.eventScreenInfoRow}>
                <Feather
                  name="calendar"
                  size={16}
                  color={c.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Scheduled Date</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedEvent.startTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.eventScreenSection}>
            <Text style={styles.eventScreenSectionTitle}>AUDIENCE & SCOPE</Text>
            <View style={styles.eventScreenInfoBox}>
              <View style={styles.eventScreenInfoRow}>
                <Feather
                  name="users"
                  size={16}
                  color={c.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Target Scope</Text>
                  <Text style={styles.infoValue}>
                    {selectedEvent.scope === ScopeType.SECTION
                      ? (selectedEvent.targetSections || []).join(', ') || 'Section IT-A'
                      : selectedEvent.scope === ScopeType.CLUB
                        ? selectedEvent.clubName || 'Coding Club'
                        : 'Campus-wide'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.eventScreenInfoRow}>
                <Feather
                  name="check-circle"
                  size={16}
                  color={c.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Timetable Overlap</Text>
                  <Text style={styles.infoValue}>No conflicts detected</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Agenda & Notes */}
          {selectedEvent.description ? (
            <View style={styles.eventScreenSection}>
              <Text style={styles.eventScreenSectionTitle}>NOTES & AGENDA</Text>
              <View style={styles.eventScreenInfoBox}>
                <Text style={styles.eventScreenDesc}>{selectedEvent.description}</Text>
              </View>
            </View>
          ) : null}

          {/* Actions */}
          <TouchableOpacity
            style={[
              styles.eventActionBtn,
              isReminderSet && {
                backgroundColor: c.surfaceSubtle,
                borderWidth: 1.5,
                borderColor: c.borderStrong,
              },
            ]}
            onPress={() => {
              setIsReminderSet(!isReminderSet);
              Alert.alert(
                !isReminderSet ? 'Reminder Set' : 'Reminder Removed',
                !isReminderSet
                  ? 'You will receive a notification 15 minutes before this session.'
                  : 'Personal notification cancelled.'
              );
            }}
            activeOpacity={0.85}
          >
            <Feather
              name={isReminderSet ? 'check' : 'bell'}
              size={18}
              color={isReminderSet ? c.textPrimary : c.pillActiveText}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.eventActionBtnText, isReminderSet && { color: c.textPrimary }]}>
              {isReminderSet ? 'Reminder Active (15m prior)' : 'Add to Personal Reminders'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── FLOATING ACTION BUTTON (Add Event) ─────────────────────────── */}
      {viewMode !== 'event' && (
        <TouchableOpacity
          style={styles.floatingAddBtn}
          onPress={() => setIsCreateOpen(true)}
          activeOpacity={0.88}
          accessibilityLabel="Add new event drawer"
        >
          <Feather name="plus" size={24} color={c.pillActiveText} />
        </TouchableOpacity>
      )}

      {/* ── SWIPEABLE SETTINGS DRAWER ──────────────────────────────────── */}
      <SwipeableDrawer
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Profile & Settings"
        colors={c}
      >
        {/* Appearance / Dark Mode Option (Prominently placed at the top) */}
        <View style={styles.sheetSection}>
          <Text style={styles.sheetSectionTitle}>APPEARANCE</Text>
          <View style={styles.themeSelectorBox}>
            <TouchableOpacity
              style={[styles.themeOptionBtn, themeMode === 'light' && styles.themeOptionBtnActive]}
              onPress={() => setThemeMode('light')}
              activeOpacity={0.8}
            >
              <Feather
                name="sun"
                size={18}
                color={themeMode === 'light' ? c.pillActiveText : c.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  themeMode === 'light' && styles.themeOptionTextActive,
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOptionBtn, themeMode === 'dark' && styles.themeOptionBtnActive]}
              onPress={() => setThemeMode('dark')}
              activeOpacity={0.8}
            >
              <Feather
                name="moon"
                size={18}
                color={themeMode === 'dark' ? c.pillActiveText : c.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  themeMode === 'dark' && styles.themeOptionTextActive,
                ]}
              >
                Dark Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
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

        {/* Campus Persona Switcher */}
        <View style={styles.sheetSection}>
          <Text style={styles.sheetSectionTitle}>CAMPUS PERSONA</Text>
          <Text style={styles.sheetSectionSub}>
            Switch active role to test Casca&apos;s role-based publishing & view permissions:
          </Text>

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

        {/* Campus Sync Info */}
        <View style={styles.sheetSection}>
          <Text style={styles.sheetSectionTitle}>CAMPUS SYNC & OFFLINE</Text>
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
              <Text style={styles.infoValue}>{events.length} Items Synced</Text>
            </View>
          </View>
        </View>

        {/* App Footer */}
        <View style={styles.appFooter}>
          <Text style={styles.appName}>Casca Campus</Text>
          <Text style={styles.appMeta}>v0.1.0 · Calm, distraction-free academic scheduling</Text>
        </View>

        <TouchableOpacity
          style={styles.sheetDoneBtn}
          onPress={() => setIsSettingsOpen(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.sheetDoneBtnText}>Done</Text>
        </TouchableOpacity>
      </SwipeableDrawer>

      {/* ── SWIPEABLE ADD EVENT DRAWER ─────────────────────────────────── */}
      <SwipeableDrawer
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Event"
        colors={c}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Text style={styles.createSubtitle}>
            Publish an event directly to the campus calendar without noise.
          </Text>

          {/* Student Notice */}
          {currentRole === 'Student' && (
            <View style={styles.studentNoticeBox}>
              <Feather
                name="info"
                size={16}
                color={c.tintWarmText}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.studentNoticeText}>
                  Student accounts have read-only permissions. Switch to Class Rep or Club
                  Coordinator to publish campus events.
                </Text>
                <TouchableOpacity
                  onPress={() => handleSelectRole('Class Representative')}
                  style={styles.quickSwitchBtn}
                >
                  <Text style={styles.quickSwitchText}>Quick switch to Class Rep →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Scope Selector */}
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

          {/* Form Inputs */}
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

          <TouchableOpacity style={styles.publishBtn} activeOpacity={0.85} onPress={handleCreate}>
            <Text style={styles.publishBtnText}>Publish Event</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SwipeableDrawer>
    </SafeAreaView>
  );
}

// ─── Swipeable Drawer Styles ─────────────────────────────────────────────────
const drawerStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  staticOverlay: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '88%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  dragHeaderZone: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
});

// ─── App Styles Factory ──────────────────────────────────────────────────────
function makeStyles(c: ReturnType<typeof getTheme>['colors']) {
  const statusBarH = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.bg,
    },
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
    segmentBtn: {
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 9999,
    },
    segmentBtnActive: {
      backgroundColor: c.pillActiveBg,
    },
    segmentBtnText: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    segmentBtnTextActive: {
      color: c.pillActiveText,
      fontWeight: '700',
    },
    settingsBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
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
      shadowOpacity: 0.25,
      shadowRadius: 8,
      zIndex: 99,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 22,
      paddingBottom: 110,
    },

    // ── Day View Hero ──
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
      color: c.textSecondary,
      marginBottom: 2,
    },
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
    heroContextRight: {
      alignItems: 'flex-end',
      paddingTop: 8,
    },
    contextRole: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    contextSection: {
      fontSize: 12,
      color: c.textMuted,
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
      color: c.textPrimary,
    },
    sectionCount: {
      fontSize: 13,
      color: c.textMuted,
    },
    eventsList: {
      gap: 16,
    },
    eventCard: {
      borderRadius: 28,
      padding: 22,
    },
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
    timeBlock: {
      alignItems: 'flex-start',
    },
    timeValue: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    timeSub: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    durationPill: {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 9999,
    },
    durationText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
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
      color: c.textSecondary,
      fontWeight: '500',
    },
    readOnlyNote: {
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 10,
    },
    emptyText: {
      fontSize: 14,
      color: c.textMuted,
      fontWeight: '500',
    },

    // ── Month Calendar ──
    calendarMonthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 4,
    },
    monthNavBtn: {
      padding: 6,
    },
    monthCurrentText: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: 0.5,
    },
    calendarWeekHeader: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    calendarWeekHeaderText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: c.calendarWeekHeader,
      letterSpacing: 0.5,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarCell: {
      width: `${100 / 7}%`,
      aspectRatio: 0.92,
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
    calendarDayToday: {
      backgroundColor: c.calendarToday,
    },
    calendarDaySelected: {
      backgroundColor: c.calendarSelected,
      borderWidth: 1.5,
      borderColor: c.pillActiveBg,
    },
    calendarDayText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textPrimary,
    },
    calendarDayTextToday: {
      color: c.calendarTodayText,
      fontWeight: '800',
    },
    calendarDayTextSelected: {
      color: c.calendarSelectedText,
      fontWeight: '800',
    },
    calendarEventDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: c.dayEventDot,
      marginTop: 3,
    },
    monthEventListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 14,
    },
    monthEventListTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    monthEventListCount: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '600',
    },

    // ── Dedicated Event Screen ──
    eventNavHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: statusBarH + 12,
      paddingBottom: 16,
      backgroundColor: c.bg,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventNavTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
    },
    eventShareBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventScreenHero: {
      borderRadius: 28,
      padding: 24,
      marginTop: 10,
      marginBottom: 24,
    },
    eventScreenTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: c.textPrimary,
      lineHeight: 30,
      marginBottom: 20,
    },
    eventScreenTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eventScreenTime: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
    },
    eventScreenDurationPill: {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 9999,
    },
    eventScreenDurationText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textPrimary,
    },
    eventScreenSection: {
      marginBottom: 20,
    },
    eventScreenSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textMuted,
      letterSpacing: 1.4,
      marginBottom: 8,
    },
    eventScreenInfoBox: {
      backgroundColor: c.bgCard,
      borderRadius: 20,
      padding: 18,
    },
    eventScreenInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventScreenDesc: {
      fontSize: 14,
      color: c.textPrimary,
      lineHeight: 22,
    },
    eventActionBtn: {
      flexDirection: 'row',
      backgroundColor: c.pillActiveBg,
      borderRadius: 9999,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    eventActionBtnText: {
      color: c.pillActiveText,
      fontSize: 15,
      fontWeight: '700',
    },

    // ── Drawer Internal Components ──
    sheetSection: {
      marginBottom: 24,
    },
    sheetSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textMuted,
      letterSpacing: 1.4,
      marginBottom: 10,
    },
    sheetSectionSub: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
      marginBottom: 14,
    },
    themeSelectorBox: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 9999,
      padding: 4,
      gap: 6,
    },
    themeOptionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 9999,
    },
    themeOptionBtnActive: {
      backgroundColor: c.pillActiveBg,
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
    },
    themeOptionTextActive: {
      color: c.pillActiveText,
      fontWeight: '700',
    },
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
    avatarText: {
      fontSize: 18,
      fontWeight: '800',
      color: c.pillActiveText,
      letterSpacing: 1,
    },
    profileDetails: {
      flex: 1,
    },
    profileName: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
    },
    profileEnrollment: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginTop: 2,
    },
    profileMeta: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    rolesList: {
      gap: 10,
    },
    roleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceSubtle,
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: 16,
      padding: 16,
    },
    roleItemActive: {
      borderColor: c.pillActiveBg,
      backgroundColor: c.bgCard,
    },
    roleItemLeft: {
      flex: 1,
      paddingRight: 12,
    },
    roleLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    roleLabelActive: {
      color: c.textPrimary,
      fontWeight: '800',
    },
    roleDescription: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 16,
    },
    infoBox: {
      backgroundColor: c.surfaceSubtle,
      borderRadius: 18,
      padding: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '700',
    },
    infoDivider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 12,
    },
    appFooter: {
      alignItems: 'center',
      marginVertical: 18,
    },
    appName: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: 0.5,
    },
    appMeta: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
    },
    sheetDoneBtn: {
      backgroundColor: c.pillActiveBg,
      borderRadius: 9999,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    sheetDoneBtnText: {
      color: c.pillActiveText,
      fontSize: 15,
      fontWeight: '700',
    },

    // ── Create Event Drawer ──
    createSubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
      marginBottom: 18,
    },
    studentNoticeBox: {
      flexDirection: 'row',
      backgroundColor: c.tintWarm,
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
    },
    studentNoticeText: {
      fontSize: 12,
      color: c.tintWarmText,
      lineHeight: 17,
    },
    quickSwitchBtn: {
      marginTop: 6,
    },
    quickSwitchText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.tintWarmText,
      textDecorationLine: 'underline',
    },
    scopeSelector: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 9999,
      padding: 4,
      marginBottom: 16,
    },
    scopeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 9999,
    },
    scopeBtnActive: {
      backgroundColor: c.bgCard,
    },
    scopeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    scopeBtnTextActive: {
      color: c.textPrimary,
      fontWeight: '700',
    },
    inputField: {
      backgroundColor: c.surfaceSubtle,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      color: c.textPrimary,
      marginBottom: 12,
    },
    inputArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    publishBtn: {
      backgroundColor: c.pillActiveBg,
      borderRadius: 9999,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    publishBtnText: {
      color: c.pillActiveText,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
