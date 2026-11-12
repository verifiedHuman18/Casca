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
  Modal,
  KeyboardAvoidingView,
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

type MainViewMode = 'today' | 'calendar';

interface DayGroup {
  dateKey: string;
  dayOfWeek: string;
  dayNumber: number;
  monthShort: string;
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

export default function App() {
  const [viewMode, setViewMode] = useState<MainViewMode>('today');
  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('2026-11-12');

  // Modal Sheet States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  const currentRole = user.positions[0] || 'Student';

  const handleSelectRole = (roleId: string) => {
    setUser(prev => ({
      ...prev,
      positions: [roleId],
    }));
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Required Fields', 'Please enter event title and venue.');
      return;
    }

    if (currentRole === 'Student') {
      Alert.alert(
        'Permission Restricted',
        'Student accounts have read-only access. Switch your role to Class Representative or Club Coordinator to publish campus events.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch to Class Rep',
            onPress: () => {
              handleSelectRole('Class Representative');
              Alert.alert(
                'Role Updated',
                'You are now Class Representative (IT-A). Try publishing again.'
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Bar: Segmented Controls on Left, Dedicated Settings/Profile Button on Right */}
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

        {/* Dedicated Settings Button (Profile + Settings) */}
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setIsSettingsOpen(true)}
          activeOpacity={0.8}
          accessibilityLabel="Profile and settings"
        >
          <Feather name="sliders" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* VIEW 1: TODAY / SCHEDULE VIEW */}
      {viewMode === 'today' && (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Big Bold Date Hero */}
          <View style={styles.heroDateRow}>
            <View style={styles.heroDateLeft}>
              <Text style={styles.heroDayOfWeek}>{selectedDayGroup.dayOfWeek}</Text>
              <Text style={styles.heroDateNumber}>{selectedDayGroup.dayNumber}.11</Text>
              <Text style={styles.heroMonthText}>{selectedDayGroup.monthShort}</Text>
            </View>

            {/* Quick Context / Profile Pill (tappable to open settings) */}
            <TouchableOpacity
              style={styles.heroContextRight}
              onPress={() => setIsSettingsOpen(true)}
              activeOpacity={0.7}
              accessibilityLabel="Open profile and settings"
            >
              <Text style={styles.contextRole}>{currentRole}</Text>
              <Text style={styles.contextSection}>
                {user.course}-{user.section} · Year {user.year}
              </Text>
            </TouchableOpacity>
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

      {/* VIEW 2: CALENDAR STACKED FEED */}
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

      {/* FLOATING ACTION BUTTON (Add Event anchored at the bottom) */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        onPress={() => setIsCreateOpen(true)}
        activeOpacity={0.88}
        accessibilityLabel="Add new event"
      >
        <Feather name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* PROFILE + SETTINGS MODAL SHEET */}
      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsSettingsOpen(false)}
          />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Profile & Settings</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsSettingsOpen(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
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
                          color={isActive ? theme.colors.pillActiveBg : theme.colors.borderStrong}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Campus & Sync Info */}
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

              {/* App Identity */}
              <View style={styles.appFooter}>
                <Text style={styles.appName}>Casca Campus</Text>
                <Text style={styles.appMeta}>
                  v0.1.0 · Calm, distraction-free academic scheduling
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetDoneBtn}
                onPress={() => setIsSettingsOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CREATE EVENT MODAL SHEET */}
      <Modal
        visible={isCreateOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsCreateOpen(false)}
          />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Event</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsCreateOpen(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.createSubtitle}>
                Publish an event directly to the campus calendar without noise.
              </Text>

              {/* Read-Only Notice if user is Student */}
              {currentRole === 'Student' && (
                <View style={styles.studentNoticeBox}>
                  <Feather
                    name="info"
                    size={16}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentNoticeText}>
                      Student accounts have read-only permissions. Switch to Class Rep or Club
                      Coordinator in Settings to publish campus events.
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
                  style={[
                    styles.scopeBtn,
                    formScope === ScopeType.SECTION && styles.scopeBtnActive,
                  ]}
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceSubtle,
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
    backgroundColor: theme.colors.pillActiveBg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000000',
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
    paddingBottom: 110, // Extra clearance for the bottom floating action button
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

  // Calendar Feed Styles
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

  // Modal Sheet Shared Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 21, 24, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: theme.colors.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetScrollContent: {
    paddingBottom: 24,
  },

  // Profile Details
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.pillActiveBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.pillActiveText,
    letterSpacing: 1,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  profileEnrollment: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // Sheet Sections
  sheetSection: {
    marginBottom: 24,
  },
  sheetSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sheetSectionSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  rolesList: {
    gap: 10,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: theme.radius.md,
    padding: 16,
  },
  roleItemActive: {
    borderColor: theme.colors.pillActiveBg,
    backgroundColor: '#ffffff',
  },
  roleItemLeft: {
    flex: 1,
    paddingRight: 12,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  roleLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  roleDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  // Info Box
  infoBox: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },

  appFooter: {
    alignItems: 'center',
    marginVertical: 18,
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  appMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sheetDoneBtn: {
    backgroundColor: theme.colors.pillActiveBg,
    borderRadius: theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sheetDoneBtnText: {
    color: theme.colors.pillActiveText,
    fontSize: 15,
    fontWeight: '700',
  },

  // Create Event Form Styles
  createSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 18,
  },
  studentNoticeBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tintWarm,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  studentNoticeText: {
    fontSize: 12,
    color: theme.colors.tintWarmText,
    lineHeight: 17,
  },
  quickSwitchBtn: {
    marginTop: 6,
  },
  quickSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.tintWarmText,
    textDecorationLine: 'underline',
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
    height: 80,
    textAlignVertical: 'top',
  },
  publishBtn: {
    backgroundColor: theme.colors.pillActiveBg,
    borderRadius: theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  publishBtnText: {
    color: theme.colors.pillActiveText,
    fontSize: 15,
    fontWeight: '700',
  },
});
