import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
  BackHandler,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import { ScopeType, EventStatus, UIEventItem, UserSession } from './types';
import {
  INITIAL_MOCK_USER,
  INITIAL_MOCK_EVENTS,
  fetchCalendarEvents,
  createNewEvent,
  updateEventApi,
  rescheduleEventApi,
  cancelEventApi,
  resubmitEventApi,
  logoutApi,
  setAuthToken,
} from './services/api';
import { getTheme, ThemeMode } from './theme';
import { SwipeableDrawer } from './components/SwipeableDrawer';
import { AnimatedFocusInput } from './components/AnimatedFocusInput';
import { ApprovalQueueDrawer } from './components/ApprovalQueueDrawer';
import { MyRequestsDrawer } from './components/MyRequestsDrawer';
import { AuthScreen } from './components/AuthScreen';
import {
  MONTH_NAMES,
  MONTH_SHORT,
  DAY_SHORT,
  getDaysInMonth,
  getFirstDayOfWeek,
  toDateKey,
  getWeekDays,
  getPreviousDayKey,
  getNextDayKey,
} from './utils/date';

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
  {
    id: 'Admin',
    label: 'SAC Admin',
    description: 'Review campus proposals & manage approval queue',
  },
];

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
  const [isApprovalQueueOpen, setIsApprovalQueueOpen] = useState(false);
  const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(false);
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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
      if (isApprovalQueueOpen) {
        setIsApprovalQueueOpen(false);
        return true;
      }
      if (isMyRequestsOpen) {
        setIsMyRequestsOpen(false);
        return true;
      }
      if (isAuthScreenOpen) {
        setIsAuthScreenOpen(false);
        return true;
      }
      if (isCreateOpen) {
        setIsCreateOpen(false);
        setEditingEventId(null);
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
  }, [
    isSettingsOpen,
    isApprovalQueueOpen,
    isMyRequestsOpen,
    isAuthScreenOpen,
    isCreateOpen,
    viewMode,
    previousViewMode,
  ]);

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

  const isAdmin = user.positions.includes('Admin');
  const isClubOfficer = user.positions.some(
    p => p.includes('Coordinator') || p.includes('President')
  );
  const isClassRep = user.positions.includes('Class Representative');

  const canManageEvent =
    Boolean(selectedEvent) &&
    (user.userId === selectedEvent?.createdBy ||
      isAdmin ||
      (selectedEvent?.scope === ScopeType.CLUB && isClubOfficer) ||
      (selectedEvent?.scope === ScopeType.SECTION && isClassRep));

  const handleSelectRole = (roleId: string) => {
    // When switching to Admin, set positions: ['Admin']
    // When switching to Club Coordinator, ensure club positions
    // When switching to Class Rep, set positions: ['Class Representative']
    setUser(prev => ({
      ...prev,
      positions: [roleId],
    }));
  };

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

    if (editingEventId) {
      const existing = events.find(e => e.id === editingEventId);
      if (existing?.status === EventStatus.REJECTED) {
        try {
          const updated = await resubmitEventApi(editingEventId, {
            title: formTitle.trim(),
            description: formDesc.trim(),
            venue: formVenue.trim(),
            startTime: existing.startTime,
            endTime: existing.endTime,
          });
          setEvents(prev => prev.map(e => (e.id === editingEventId ? updated : e)));
          Alert.alert('Resubmitted', 'Event request resubmitted for council review.');
        } catch (err: unknown) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Resubmission failed.');
        }
      } else {
        try {
          const updated = await updateEventApi(editingEventId, {
            title: formTitle.trim(),
            description: formDesc.trim(),
            venue: formVenue.trim(),
          });
          setEvents(prev => prev.map(e => (e.id === editingEventId ? updated : e)));
          if (selectedEvent?.id === editingEventId) {
            setSelectedEvent(updated);
          }
          Alert.alert('Updated', 'Event details updated successfully.');
        } catch (err: unknown) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Update failed.');
        }
      }
      setEditingEventId(null);
      setFormTitle('');
      setFormVenue('');
      setFormDesc('');
      setIsCreateOpen(false);
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

  const handleOpenEdit = (evt: UIEventItem) => {
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormVenue(evt.venue);
    setFormDesc(evt.description);
    setFormScope(evt.scope);
    setIsCreateOpen(true);
  };

  const handleReschedule = async () => {
    if (!selectedEvent) return;
    Alert.alert('Reschedule Session', 'Shift this session to tomorrow (same time)?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Shift +24h',
        onPress: async () => {
          const start = new Date(selectedEvent.startTime);
          const end = new Date(selectedEvent.endTime);
          start.setDate(start.getDate() + 1);
          end.setDate(end.getDate() + 1);

          try {
            const updated = await rescheduleEventApi(
              selectedEvent.id,
              start.toISOString(),
              end.toISOString()
            );
            setSelectedEvent(updated);
            setEvents(prev => prev.map(e => (e.id === selectedEvent.id ? updated : e)));
            Alert.alert('Rescheduled', 'Session schedule updated.');
          } catch (err: unknown) {
            Alert.alert(
              'Reschedule Failed',
              err instanceof Error ? err.message : 'Error rescheduling'
            );
          }
        },
      },
    ]);
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;
    Alert.alert('Cancel Event', `Are you sure you want to cancel "${selectedEvent.title}"?`, [
      { text: 'No, Keep', style: 'cancel' },
      {
        text: 'Yes, Cancel Event',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelEventApi(selectedEvent.id);
            const updated = { ...selectedEvent, status: EventStatus.CANCELLED };
            setSelectedEvent(updated);
            setEvents(prev => prev.map(e => (e.id === selectedEvent.id ? updated : e)));
            Alert.alert('Cancelled', 'This event has been marked as cancelled.');
          } catch (err: unknown) {
            Alert.alert('Cancel Failed', err instanceof Error ? err.message : 'Error cancelling');
          }
        },
      },
    ]);
  };

  const handleEventApproved = (item: UIEventItem) => {
    setEvents(prev => {
      const exists = prev.some(e => e.id === item.id);
      if (exists) {
        return prev.map(e => (e.id === item.id ? { ...e, status: EventStatus.ACTIVE } : e));
      }
      return [{ ...item, status: EventStatus.ACTIVE }, ...prev];
    });
  };

  const handleLoginSuccess = (session: UserSession, token: string) => {
    setAuthToken(token);
    setUser(session);
    setIsAuthScreenOpen(false);
    fetchCalendarEvents().then(setEvents);
    Alert.alert('Welcome', `Signed in as ${session.name} (${session.course}-${session.section})`);
  };

  const handleLogout = async () => {
    await logoutApi();
    setUser(INITIAL_MOCK_USER);
    setIsSettingsOpen(false);
    Alert.alert('Signed Out', 'You have been signed out.');
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

  const handlePrevDay = () => {
    const prevKey = getPreviousDayKey(selectedDayKey);
    setSelectedDayKey(prevKey);
    const { month, year } = parseDateKey(prevKey);
    setCalendarMonth(month);
    setCalendarYear(year);
  };

  const handleNextDay = () => {
    const nextKey = getNextDayKey(selectedDayKey);
    setSelectedDayKey(nextKey);
    const { month, year } = parseDateKey(nextKey);
    setCalendarMonth(month);
    setCalendarYear(year);
  };

  const handleToday = () => {
    setSelectedDayKey(todayKey);
    const { month, year } = parseDateKey(todayKey);
    setCalendarMonth(month);
    setCalendarYear(year);
  };

  const handleSelectDay = (key: string) => {
    setSelectedDayKey(key);
    const { month, year } = parseDateKey(key);
    setCalendarMonth(month);
    setCalendarYear(year);
  };

  const currentWeekDays = useMemo(() => {
    return getWeekDays(selectedDayKey);
  }, [selectedDayKey]);

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

          {/* Quick Actions & Settings */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.quickNavBtn}
                onPress={() => setIsApprovalQueueOpen(true)}
                activeOpacity={0.8}
                accessibilityLabel="Open approval queue"
              >
                <Feather name="check-square" size={16} color={c.pillActiveBg} />
                <Text style={styles.quickNavBtnText}>Queue</Text>
              </TouchableOpacity>
            )}

            {isClubOfficer && (
              <TouchableOpacity
                style={styles.quickNavBtn}
                onPress={() => setIsMyRequestsOpen(true)}
                activeOpacity={0.8}
                accessibilityLabel="Open my requests"
              >
                <Feather name="file-text" size={16} color={c.pillActiveBg} />
                <Text style={styles.quickNavBtnText}>Proposals</Text>
              </TouchableOpacity>
            )}

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
          {/* Hero Date Display & Navigation */}
          <View style={styles.heroDateRow}>
            <View style={styles.heroDateLeft}>
              <View style={styles.heroDayOfWeekRow}>
                <Text style={styles.heroDayOfWeek}>{selectedDayGroup.dayOfWeek}</Text>
                {selectedDayKey === todayKey ? (
                  <View style={styles.heroTodayBadge}>
                    <Text style={styles.heroTodayBadgeText}>Today</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.heroJumpTodayBtn}
                    onPress={handleToday}
                    activeOpacity={0.8}
                    accessibilityLabel="Jump to today"
                  >
                    <Feather name="rotate-ccw" size={11} color={c.pillActiveText} />
                    <Text style={styles.heroJumpTodayText}>Today</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Big Date Number and Month Name Side-by-Side */}
              <View style={styles.heroDateInlineRow}>
                <Text style={styles.heroDateNumber}>{selectedDayGroup.dayNumber}</Text>
                <Text style={styles.heroMonthText}>{selectedDayGroup.monthShort}</Text>
              </View>
            </View>

            {/* Stepper Arranged as Up and Down */}
            <View style={styles.heroNavColumn}>
              <TouchableOpacity
                style={styles.heroNavBtn}
                onPress={handleNextDay}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
                accessibilityLabel="Next day"
              >
                <Feather name="chevron-up" size={20} color={c.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroNavBtn}
                onPress={handlePrevDay}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
                accessibilityLabel="Previous day"
              >
                <Feather name="chevron-down" size={20} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Week Day Selector Strip */}
          <View style={styles.weekStripContainer}>
            {currentWeekDays.map(item => {
              const isSelected = item.dateKey === selectedDayKey;
              const isToday = item.dateKey === todayKey;
              const dayEvents = eventsByDay.get(item.dateKey) || [];
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={item.dateKey}
                  style={[
                    styles.weekDayPill,
                    isSelected && styles.weekDayPillSelected,
                    isToday && !isSelected && styles.weekDayPillToday,
                  ]}
                  onPress={() => handleSelectDay(item.dateKey)}
                  activeOpacity={0.75}
                  accessibilityLabel={`Select ${item.dayShort} ${item.dayNumber}`}
                >
                  <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>
                    {item.dayShort}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      isSelected && styles.weekDayNumberSelected,
                      isToday && !isSelected && styles.weekDayNumberToday,
                    ]}
                  >
                    {item.dayNumber}
                  </Text>
                  <View
                    style={[
                      styles.weekEventDot,
                      hasEvents
                        ? isSelected
                          ? styles.weekEventDotActive
                          : styles.weekEventDotVisible
                        : styles.weekEventDotHidden,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
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
          {/* Status Badges */}
          {selectedEvent.status === EventStatus.CANCELLED && (
            <View style={styles.cancelledBanner}>
              <Feather name="slash" size={16} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.cancelledBannerText}>
                This event has been cancelled by the organizer.
              </Text>
            </View>
          )}

          {selectedEvent.status === EventStatus.PENDING_APPROVAL && (
            <View style={styles.pendingBanner}>
              <Feather name="clock" size={16} color={c.tintWarmText} style={{ marginRight: 8 }} />
              <Text style={styles.pendingBannerText}>
                Pending Review · Awaiting SAC Council Approval
              </Text>
            </View>
          )}

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

          {/* Management Actions for Event Organizers / Admins */}
          {canManageEvent && selectedEvent.status !== EventStatus.CANCELLED && (
            <View style={styles.mgmtActionsContainer}>
              <Text style={styles.mgmtSectionTitle}>ORGANIZER ACTIONS</Text>
              <TouchableOpacity
                style={styles.mgmtBtn}
                onPress={() => handleOpenEdit(selectedEvent)}
                activeOpacity={0.85}
              >
                <Feather name="edit-3" size={16} color={c.textPrimary} />
                <Text style={styles.mgmtBtnText}>Edit Event Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mgmtBtn}
                onPress={handleReschedule}
                activeOpacity={0.85}
              >
                <Feather name="calendar" size={16} color={c.textPrimary} />
                <Text style={styles.mgmtBtnText}>Reschedule (+24h Shift)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mgmtBtn, styles.mgmtCancelBtn]}
                onPress={handleCancelEvent}
                activeOpacity={0.85}
              >
                <Feather name="slash" size={16} color="#DC2626" />
                <Text style={[styles.mgmtBtnText, styles.mgmtCancelBtnText]}>Cancel Event</Text>
              </TouchableOpacity>
            </View>
          )}
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

        {/* Workflow & Quick Navigation */}
        <View style={styles.sheetSection}>
          <Text style={styles.sheetSectionTitle}>WORKFLOW & ACTIONS</Text>
          <View style={{ gap: 10 }}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.settingsActionBtn}
                onPress={() => {
                  setIsSettingsOpen(false);
                  setIsApprovalQueueOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Feather
                  name="check-square"
                  size={18}
                  color={c.pillActiveBg}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsActionTitle}>SAC Approval Queue</Text>
                  <Text style={styles.settingsActionSub}>Review club & campus event proposals</Text>
                </View>
                <Feather name="chevron-right" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}

            {isClubOfficer && (
              <TouchableOpacity
                style={styles.settingsActionBtn}
                onPress={() => {
                  setIsSettingsOpen(false);
                  setIsMyRequestsOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Feather
                  name="file-text"
                  size={18}
                  color={c.pillActiveBg}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsActionTitle}>My Proposals & Status</Text>
                  <Text style={styles.settingsActionSub}>
                    Track review status and resubmit revisions
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.settingsActionBtn}
              onPress={() => {
                setIsSettingsOpen(false);
                setIsAuthScreenOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Feather
                name="user-check"
                size={18}
                color={c.textPrimary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsActionTitle}>Switch Account / Sign In</Text>
                <Text style={styles.settingsActionSub}>Log in with enrollment credentials</Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsActionBtn, { borderColor: '#FCA5A5' }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={18} color="#DC2626" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsActionTitle, { color: '#DC2626' }]}>Sign Out</Text>
                <Text style={styles.settingsActionSub}>
                  Reset session to default student preview
                </Text>
              </View>
            </TouchableOpacity>
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
      </SwipeableDrawer>

      {/* ── SWIPEABLE ADD EVENT DRAWER ─────────────────────────────────── */}
      <SwipeableDrawer
        visible={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingEventId(null);
          setFormTitle('');
          setFormVenue('');
          setFormDesc('');
        }}
        title={
          editingEventId
            ? events.find(e => e.id === editingEventId)?.status === EventStatus.REJECTED
              ? 'Revise & Resubmit'
              : 'Edit Event'
            : 'New Event'
        }
        colors={c}
      >
        <View style={{ width: '100%' }}>
          <Text style={styles.createSubtitle}>
            {editingEventId
              ? 'Update event details or address feedback before resubmitting.'
              : 'Publish an event directly to the campus calendar without noise.'}
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

          {/* Elevated Floating Inputs */}
          <AnimatedFocusInput
            label="Event Title"
            placeholder="Event Title"
            value={formTitle}
            onChangeText={setFormTitle}
            colors={c}
          />

          <AnimatedFocusInput
            label="Venue or Room"
            placeholder="Venue or Room"
            value={formVenue}
            onChangeText={setFormVenue}
            colors={c}
          />

          <AnimatedFocusInput
            label="Notes or Agenda"
            placeholder="Notes or Agenda (Optional)"
            value={formDesc}
            onChangeText={setFormDesc}
            colors={c}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.publishBtn} activeOpacity={0.85} onPress={handleCreate}>
            <Text style={styles.publishBtnText}>
              {editingEventId
                ? events.find(e => e.id === editingEventId)?.status === EventStatus.REJECTED
                  ? 'Resubmit for Review'
                  : 'Save Changes'
                : 'Publish Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </SwipeableDrawer>

      {/* ── APPROVAL QUEUE DRAWER (UC-15) ────────────────────────────── */}
      <ApprovalQueueDrawer
        visible={isApprovalQueueOpen}
        onClose={() => setIsApprovalQueueOpen(false)}
        colors={c}
        onEventApproved={handleEventApproved}
        onEventRejected={(id, _reason) => {
          setEvents(prev => prev.filter(e => e.id !== id));
        }}
      />

      {/* ── MY REQUESTS & RESUBMISSION DRAWER (UC-14) ────────────────── */}
      <MyRequestsDrawer
        visible={isMyRequestsOpen}
        onClose={() => setIsMyRequestsOpen(false)}
        colors={c}
        onOpenResubmit={handleOpenEdit}
      />

      {/* ── AUTH SCREEN MODAL (UC-01, UC-13) ─────────────────────────── */}
      <Modal
        visible={isAuthScreenOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsAuthScreenOpen(false)}
      >
        <AuthScreen
          colors={c}
          onLoginSuccess={handleLoginSuccess}
          onGuestPreview={() => setIsAuthScreenOpen(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

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
      borderRadius: 22,
      height: 44,
      padding: 4,
      alignItems: 'center',
      gap: 4,
    },
    segmentBtn: {
      height: 36,
      paddingHorizontal: 20,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
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

    // ── Day View Hero & Navigation ──
    heroDateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 18,
      marginBottom: 22,
    },
    heroDateLeft: {
      alignItems: 'flex-start',
    },
    heroDayOfWeekRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    heroDayOfWeek: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textSecondary,
    },
    heroTodayBadge: {
      backgroundColor: c.surfaceSubtle,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 9999,
    },
    heroTodayBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroJumpTodayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.pillActiveBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 9999,
      gap: 4,
    },
    heroJumpTodayText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.pillActiveText,
    },
    heroDateInlineRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    heroDateNumber: {
      fontSize: 64,
      fontWeight: '900',
      color: c.textPrimary,
      letterSpacing: -2,
      lineHeight: 68,
    },
    heroMonthText: {
      fontSize: 42,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: 1.5,
      lineHeight: 48,
      paddingBottom: 4,
    },
    heroNavColumn: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 4,
    },
    heroNavBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.surfaceSubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Week Day Selector Strip ──
    weekStripContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 20,
      padding: 6,
      marginBottom: 24,
    },
    weekDayPill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 14,
    },
    weekDayPillSelected: {
      backgroundColor: c.pillActiveBg,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    weekDayPillToday: {
      borderWidth: 1.5,
      borderColor: c.pillActiveBg,
    },
    weekDayName: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    weekDayNameSelected: {
      color: c.pillActiveText,
      opacity: 0.9,
    },
    weekDayNumber: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    weekDayNumberSelected: {
      color: c.pillActiveText,
      fontWeight: '800',
    },
    weekDayNumberToday: {
      color: c.pillActiveBg,
      fontWeight: '800',
    },
    weekEventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 4,
    },
    weekEventDotVisible: {
      backgroundColor: c.pillActiveBg,
    },
    weekEventDotActive: {
      backgroundColor: c.pillActiveText,
    },
    weekEventDotHidden: {
      backgroundColor: 'transparent',
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

    // ── Quick Nav Pills ──
    quickNavBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: c.surfaceSubtle,
      gap: 6,
    },
    quickNavBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    },

    // ── Event Screen Status Banners & Actions ──
    cancelledBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEE2E2',
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    cancelledBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#991B1B',
      flex: 1,
    },
    pendingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.tintWarm,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
    },
    pendingBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.tintWarmText,
      flex: 1,
    },
    mgmtActionsContainer: {
      marginTop: 22,
      gap: 10,
    },
    mgmtSectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: c.textMuted,
      marginBottom: 4,
    },
    mgmtBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 9999,
      paddingVertical: 14,
      gap: 8,
    },
    mgmtBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    },
    mgmtCancelBtn: {
      backgroundColor: '#FEE2E2',
    },
    mgmtCancelBtnText: {
      color: '#991B1B',
    },

    // ── Settings Workflow Action Items ──
    settingsActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceSubtle,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    settingsActionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    settingsActionSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
}
