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
import { ScopeType, EventStatus, UIEventItem, UserSession } from './types';
import {
  INITIAL_MOCK_USER,
  INITIAL_MOCK_EVENTS,
  fetchCalendarEvents,
  createNewEvent,
} from './services/api';
import {
  getMonthMatrix,
  formatDateKey,
  formatTimeRange,
  SIMULATED_TODAY_KEY,
  SIMULATED_TODAY,
} from './utils/date';
import { theme } from './theme';

type TabType = 'calendar' | 'create' | 'profile';
type CalendarViewMode = 'month' | 'week';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'ALL' | ScopeType>('ALL');
  const [includeExtraSection, setIncludeExtraSection] = useState<boolean>(true); // UC-04 toggle

  // Calendar Date State (November 2026 anchor)
  const [selectedDateKey, setSelectedDateKey] = useState<string>(SIMULATED_TODAY_KEY);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 0-indexed: 10 = November

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formScope, setFormScope] = useState<ScopeType>(ScopeType.SECTION);

  useEffect(() => {
    fetchCalendarEvents().then(setEvents);
  }, []);

  // Compute month matrix
  const monthMatrix = useMemo(() => {
    return getMonthMatrix(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Map events to date keys for dot markers
  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, UIEventItem[]>();
    events.forEach(evt => {
      // Respect extra section filter
      if (evt.targetSections?.includes('IT-B') && !includeExtraSection) {
        return;
      }
      const key = formatDateKey(new Date(evt.startTime));
      const list = map.get(key) || [];
      list.push(evt);
      map.set(key, list);
    });
    return map;
  }, [events, includeExtraSection]);

  // Events filtered for the currently selected day
  const selectedDayEvents = useMemo(() => {
    const dayEvts = eventsByDateKey.get(selectedDateKey) || [];
    return dayEvts.filter(evt => {
      if (selectedScopeFilter === 'ALL') return true;
      return evt.scope === selectedScopeFilter;
    });
  }, [eventsByDateKey, selectedDateKey, selectedScopeFilter]);

  // Week strip around the selected date
  const weekStrip = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const centerDate = new Date(y, m - 1, d);
    const dayOfWeek = centerDate.getDay();
    const days: { date: Date; key: string; dayNum: number; dayName: string; isToday: boolean }[] =
      [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 7; i++) {
      const offset = i - dayOfWeek;
      const targetDate = new Date(y, m - 1, d + offset);
      const key = formatDateKey(targetDate);
      days.push({
        date: targetDate,
        key,
        dayNum: targetDate.getDate(),
        dayName: dayNames[targetDate.getDay()],
        isToday: key === SIMULATED_TODAY_KEY,
      });
    }
    return days;
  }, [selectedDateKey]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(SIMULATED_TODAY.getFullYear());
    setCurrentMonth(SIMULATED_TODAY.getMonth());
    setSelectedDateKey(SIMULATED_TODAY_KEY);
  };

  const handleCreateEvent = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Incomplete Form', 'Please specify event title and venue.');
      return;
    }

    const created = await createNewEvent({
      title: formTitle.trim(),
      description: formDesc.trim(),
      venue: formVenue.trim(),
      startTime: new Date(`${selectedDateKey}T10:00:00.000Z`).toISOString(),
      endTime: new Date(`${selectedDateKey}T12:00:00.000Z`).toISOString(),
      scope: formScope,
      clubName: formScope === ScopeType.CLUB ? user.clubs[0] || 'Coding Club' : undefined,
      targetSections:
        formScope === ScopeType.SECTION ? [`${user.course}-${user.section}`] : undefined,
    });

    setEvents(prev => [created, ...prev]);
    setFormTitle('');
    setFormDesc('');
    setFormVenue('');
    setActiveTab('calendar');

    Alert.alert(
      created.status === EventStatus.PENDING_APPROVAL ? 'Approval Requested' : 'Event Published',
      created.status === EventStatus.PENDING_APPROVAL
        ? 'Campus-level events require administrative approval before public broadcasting.'
        : `Published to ${created.scope} scope.`
    );
  };

  const monthNames = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];

  const selectedDateObject = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const selectedDateFormatted = selectedDateObject.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Architectural Header */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>CASCA</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CAMPUS PULSE</Text>
            </View>
          </View>
          <Text style={styles.userSubtitle}>
            {user.name} · {user.course}-{user.section} (Yr {user.year})
          </Text>
        </View>

        {/* Persona Switcher Pill */}
        <TouchableOpacity
          style={styles.personaBadge}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Switch Persona (Acceptance Testing)',
              'Select actor to test authorization rules:',
              [
                {
                  text: 'Student (Read-Only)',
                  onPress: () =>
                    setUser({
                      ...user,
                      positions: ['Student'],
                      clubs: [],
                    }),
                },
                {
                  text: 'Class Rep (IT-A CR)',
                  onPress: () =>
                    setUser({
                      ...user,
                      positions: ['Class Representative'],
                      clubs: [],
                    }),
                },
                {
                  text: 'Club Coordinator (Coding Club)',
                  onPress: () =>
                    setUser({
                      ...user,
                      positions: ['Club Coordinator'],
                      clubs: ['Coding Club'],
                    }),
                },
              ]
            );
          }}
        >
          <Feather
            name="shield"
            size={12}
            color={theme.colors.accentPrimary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.personaBadgeText}>{user.positions[0] || 'Student'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      {activeTab === 'calendar' && (
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
          {/* Calendar Control Bar */}
          <View style={styles.calendarControlBar}>
            <View style={styles.monthNavRow}>
              <Text style={styles.monthTitle}>
                {monthNames[currentMonth]} <Text style={styles.yearTitle}>{currentYear}</Text>
              </Text>
              <View style={styles.navArrows}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.iconNavBtn} hitSlop={10}>
                  <Feather name="chevron-left" size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleJumpToToday}
                  style={styles.todayBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.todayBtnText}>TODAY</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNextMonth} style={styles.iconNavBtn} hitSlop={10}>
                  <Feather name="chevron-right" size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* View Mode Toggle (Month Grid vs Week Strip) */}
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === 'month' && styles.viewModeBtnActive]}
                onPress={() => setViewMode('month')}
              >
                <Feather
                  name="grid"
                  size={13}
                  color={viewMode === 'month' ? theme.colors.textPrimary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    viewMode === 'month' && styles.viewModeBtnTextActive,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === 'week' && styles.viewModeBtnActive]}
                onPress={() => setViewMode('week')}
              >
                <Feather
                  name="list"
                  size={13}
                  color={viewMode === 'week' ? theme.colors.textPrimary : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    viewMode === 'week' && styles.viewModeBtnTextActive,
                  ]}
                >
                  Week Strip
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Matrix Calendar Grid */}
          {viewMode === 'month' ? (
            <View style={styles.monthContainer}>
              {/* Day-of-week header row */}
              <View style={styles.dayOfWeekHeaderRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
                  <View key={`dayname-${idx}`} style={styles.dayOfWeekHeaderCell}>
                    <Text
                      style={[
                        styles.dayOfWeekHeaderText,
                        (idx === 0 || idx === 6) && styles.weekendHeaderText,
                      ]}
                    >
                      {dayName}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day cells matrix */}
              <View style={styles.daysMatrixGrid}>
                {monthMatrix.map((item, idx) => {
                  const dayEvents = eventsByDateKey.get(item.dateKey) || [];
                  const isSelected = item.dateKey === selectedDateKey;
                  const hasCampus = dayEvents.some(e => e.scope === ScopeType.CAMPUS);
                  const hasClub = dayEvents.some(e => e.scope === ScopeType.CLUB);
                  const hasSection = dayEvents.some(e => e.scope === ScopeType.SECTION);

                  return (
                    <TouchableOpacity
                      key={`matrix-${item.dateKey}-${idx}`}
                      style={[
                        styles.matrixDayCell,
                        !item.isCurrentMonth && styles.matrixDayOutside,
                        item.isToday && styles.matrixDayToday,
                        isSelected && styles.matrixDaySelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedDateKey(item.dateKey)}
                    >
                      <Text
                        style={[
                          styles.matrixDayNumber,
                          !item.isCurrentMonth && styles.matrixDayNumberOutside,
                          item.isToday && styles.matrixDayNumberToday,
                          isSelected && styles.matrixDayNumberSelected,
                        ]}
                      >
                        {item.dayNumber}
                      </Text>

                      {/* Event Scope Indicator Dots */}
                      <View style={styles.dotsRow}>
                        {hasCampus && (
                          <View
                            style={[styles.eventDot, { backgroundColor: theme.colors.campus }]}
                          />
                        )}
                        {hasClub && (
                          <View style={[styles.eventDot, { backgroundColor: theme.colors.club }]} />
                        )}
                        {hasSection && (
                          <View
                            style={[styles.eventDot, { backgroundColor: theme.colors.section }]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Week Carousel Strip */
            <View style={styles.weekStripContainer}>
              {weekStrip.map(item => {
                const dayEvents = eventsByDateKey.get(item.key) || [];
                const isSelected = item.key === selectedDateKey;
                const hasCampus = dayEvents.some(e => e.scope === ScopeType.CAMPUS);
                const hasClub = dayEvents.some(e => e.scope === ScopeType.CLUB);
                const hasSection = dayEvents.some(e => e.scope === ScopeType.SECTION);

                return (
                  <TouchableOpacity
                    key={`strip-${item.key}`}
                    style={[
                      styles.weekStripCell,
                      item.isToday && styles.weekStripCellToday,
                      isSelected && styles.weekStripCellSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedDateKey(item.key)}
                  >
                    <Text
                      style={[
                        styles.weekStripDayName,
                        isSelected && styles.weekStripDayNameSelected,
                      ]}
                    >
                      {item.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.weekStripDayNum,
                        item.isToday && styles.weekStripDayNumToday,
                        isSelected && styles.weekStripDayNumSelected,
                      ]}
                    >
                      {item.dayNum}
                    </Text>

                    <View style={styles.dotsRow}>
                      {hasCampus && (
                        <View style={[styles.eventDot, { backgroundColor: theme.colors.campus }]} />
                      )}
                      {hasClub && (
                        <View style={[styles.eventDot, { backgroundColor: theme.colors.club }]} />
                      )}
                      {hasSection && (
                        <View
                          style={[styles.eventDot, { backgroundColor: theme.colors.section }]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Scope Filters & UC-04 Cross-Section Switcher */}
          <View style={styles.filtersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scopeChipsScroll}
            >
              <TouchableOpacity
                style={[styles.scopeChip, selectedScopeFilter === 'ALL' && styles.scopeChipActive]}
                onPress={() => setSelectedScopeFilter('ALL')}
              >
                <Text
                  style={[
                    styles.scopeChipText,
                    selectedScopeFilter === 'ALL' && styles.scopeChipTextActive,
                  ]}
                >
                  ALL ({eventsByDateKey.get(selectedDateKey)?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeChip,
                  selectedScopeFilter === ScopeType.CAMPUS && styles.scopeChipActiveCampus,
                ]}
                onPress={() => setSelectedScopeFilter(ScopeType.CAMPUS)}
              >
                <View style={[styles.chipIndicatorDot, { backgroundColor: theme.colors.campus }]} />
                <Text
                  style={[
                    styles.scopeChipText,
                    selectedScopeFilter === ScopeType.CAMPUS && styles.scopeChipTextActiveCampus,
                  ]}
                >
                  CAMPUS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeChip,
                  selectedScopeFilter === ScopeType.CLUB && styles.scopeChipActiveClub,
                ]}
                onPress={() => setSelectedScopeFilter(ScopeType.CLUB)}
              >
                <View style={[styles.chipIndicatorDot, { backgroundColor: theme.colors.club }]} />
                <Text
                  style={[
                    styles.scopeChipText,
                    selectedScopeFilter === ScopeType.CLUB && styles.scopeChipTextActiveClub,
                  ]}
                >
                  CLUB
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeChip,
                  selectedScopeFilter === ScopeType.SECTION && styles.scopeChipActiveSection,
                ]}
                onPress={() => setSelectedScopeFilter(ScopeType.SECTION)}
              >
                <View
                  style={[styles.chipIndicatorDot, { backgroundColor: theme.colors.section }]}
                />
                <Text
                  style={[
                    styles.scopeChipText,
                    selectedScopeFilter === ScopeType.SECTION && styles.scopeChipTextActiveSection,
                  ]}
                >
                  SECTION
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* UC-04 Section Lens Pill */}
            <TouchableOpacity
              style={[styles.sectionLensPill, includeExtraSection && styles.sectionLensPillActive]}
              activeOpacity={0.8}
              onPress={() => setIncludeExtraSection(prev => !prev)}
            >
              <Feather
                name={includeExtraSection ? 'eye' : 'eye-off'}
                size={13}
                color={includeExtraSection ? theme.colors.section : theme.colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.sectionLensLabel}>
                UC-04 Cross-Section View:{' '}
                <Text style={styles.sectionLensValue}>
                  {includeExtraSection ? 'IT-A + IT-B (Read-Only)' : 'IT-A Only'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Timeline / Agenda View for the Selected Day */}
          <View style={styles.agendaSection}>
            <View style={styles.agendaHeaderRow}>
              <View>
                <Text style={styles.agendaDateTitle}>{selectedDateFormatted}</Text>
                <Text style={styles.agendaSubtitle}>
                  {selectedDateKey === SIMULATED_TODAY_KEY ? 'TODAY · ' : ''}
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'EVENT' : 'EVENTS'}{' '}
                  SCHEDULED
                </Text>
              </View>
              {selectedDateKey === SIMULATED_TODAY_KEY && (
                <View style={styles.nowBadge}>
                  <View style={styles.nowPulse} />
                  <Text style={styles.nowBadgeText}>18:38 NOW</Text>
                </View>
              )}
            </View>

            {/* Hourly Timeline Stream */}
            {selectedDayEvents.length === 0 ? (
              <View style={styles.emptyDayContainer}>
                <Feather name="calendar" size={32} color={theme.colors.surfaceBorder} />
                <Text style={styles.emptyDayTitle}>No scheduled events</Text>
                <Text style={styles.emptyDaySubtitle}>
                  Nothing marked for this day under the current scope filters.
                </Text>
              </View>
            ) : (
              <View style={styles.timelineStream}>
                {selectedDayEvents.map((evt, idx) => {
                  const { range, duration } = formatTimeRange(evt.startTime, evt.endTime);

                  let scopeColor = theme.colors.section;
                  let scopeIcon: 'globe' | 'code' | 'book-open' = 'book-open';
                  if (evt.scope === ScopeType.CAMPUS) {
                    scopeColor = theme.colors.campus;
                    scopeIcon = 'globe';
                  } else if (evt.scope === ScopeType.CLUB) {
                    scopeColor = theme.colors.club;
                    scopeIcon = 'code';
                  }

                  return (
                    <View key={evt.id} style={styles.timelineItem}>
                      {/* Left time gutter */}
                      <View style={styles.timelineGutter}>
                        <Text style={styles.gutterTimeText}>{range.split('–')[0].trim()}</Text>
                        <View style={styles.gutterLineContainer}>
                          <View style={[styles.gutterNode, { borderColor: scopeColor }]} />
                          {idx < selectedDayEvents.length - 1 && (
                            <View style={styles.gutterConnector} />
                          )}
                        </View>
                      </View>

                      {/* Event Block Card */}
                      <View style={[styles.eventCard, { borderLeftColor: scopeColor }]}>
                        {/* Scope & Metadata Row */}
                        <View style={styles.cardHeaderRow}>
                          <View
                            style={[
                              styles.scopeTag,
                              { borderColor: scopeColor, backgroundColor: `${scopeColor}15` },
                            ]}
                          >
                            <Feather
                              name={scopeIcon}
                              size={11}
                              color={scopeColor}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.scopeTagText, { color: scopeColor }]}>
                              {evt.scope}
                            </Text>
                          </View>

                          <View style={styles.cardTimePill}>
                            <Feather
                              name="clock"
                              size={11}
                              color={theme.colors.textSecondary}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.cardTimeText}>{range}</Text>
                            <Text style={styles.cardDurationText}>({duration})</Text>
                          </View>
                        </View>

                        {/* Title & Description */}
                        <Text style={styles.eventTitle}>{evt.title}</Text>
                        <Text style={styles.eventDesc}>{evt.description}</Text>

                        {/* Badges & Venue Row */}
                        <View style={styles.cardFooterRow}>
                          <View style={styles.venueRow}>
                            <Feather
                              name="map-pin"
                              size={12}
                              color={theme.colors.textMuted}
                              style={{ marginRight: 5 }}
                            />
                            <Text style={styles.venueText}>{evt.venue}</Text>
                          </View>

                          {/* Extra Scope Context Badge */}
                          {evt.clubName && (
                            <View style={styles.clubContextBadge}>
                              <Text style={styles.clubContextText}>{evt.clubName}</Text>
                            </View>
                          )}

                          {evt.targetSections && (
                            <View
                              style={[
                                styles.sectionContextBadge,
                                evt.isReadOnly && styles.readOnlySectionBadge,
                              ]}
                            >
                              {evt.isReadOnly && (
                                <Feather
                                  name="eye"
                                  size={10}
                                  color={theme.colors.accentAmber}
                                  style={{ marginRight: 3 }}
                                />
                              )}
                              <Text
                                style={[
                                  styles.sectionContextText,
                                  evt.isReadOnly && styles.readOnlySectionText,
                                ]}
                              >
                                {evt.targetSections.join(', ')}{' '}
                                {evt.isReadOnly ? '(UC-04 READ-ONLY)' : ''}
                              </Text>
                            </View>
                          )}

                          {evt.status === EventStatus.PENDING_APPROVAL && (
                            <View style={styles.approvalBadge}>
                              <Feather
                                name="alert-circle"
                                size={10}
                                color={theme.colors.accentAmber}
                                style={{ marginRight: 3 }}
                              />
                              <Text style={styles.approvalBadgeText}>PENDING APPROVAL</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Publish Form Screen */}
      {activeTab === 'create' && (
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.createScrollContent}>
          <View style={styles.createFormContainer}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>AUTHOR NEW EVENT</Text>
              <Text style={styles.createSubtitle}>
                Publish verified event to the student calendar or request campus broadcast.
              </Text>
            </View>

            {/* Scope Selection Tiles */}
            <Text style={styles.inputSectionLabel}>SELECT BROADCAST SCOPE</Text>
            <View style={styles.scopeTileRow}>
              <TouchableOpacity
                style={[
                  styles.scopeTile,
                  formScope === ScopeType.SECTION && styles.scopeTileActiveSection,
                ]}
                onPress={() => setFormScope(ScopeType.SECTION)}
              >
                <Feather
                  name="book-open"
                  size={18}
                  color={
                    formScope === ScopeType.SECTION ? theme.colors.section : theme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.scopeTileTitle,
                    formScope === ScopeType.SECTION && styles.scopeTileTitleActive,
                  ]}
                >
                  Section Event
                </Text>
                <Text style={styles.scopeTileDesc}>
                  Internal lectures & reviews for {user.course}-{user.section}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeTile,
                  formScope === ScopeType.CLUB && styles.scopeTileActiveClub,
                ]}
                onPress={() => setFormScope(ScopeType.CLUB)}
              >
                <Feather
                  name="code"
                  size={18}
                  color={formScope === ScopeType.CLUB ? theme.colors.club : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.scopeTileTitle,
                    formScope === ScopeType.CLUB && styles.scopeTileTitleActive,
                  ]}
                >
                  Club Event
                </Text>
                <Text style={styles.scopeTileDesc}>Society hackathons & contests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeTile,
                  formScope === ScopeType.CAMPUS && styles.scopeTileActiveCampus,
                ]}
                onPress={() => setFormScope(ScopeType.CAMPUS)}
              >
                <Feather
                  name="globe"
                  size={18}
                  color={
                    formScope === ScopeType.CAMPUS ? theme.colors.campus : theme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.scopeTileTitle,
                    formScope === ScopeType.CAMPUS && styles.scopeTileTitleActive,
                  ]}
                >
                  Campus Event
                </Text>
                <Text style={styles.scopeTileDesc}>Requires Admin approval (UC-14)</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <Text style={styles.inputSectionLabel}>EVENT DETAILS</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Event Title (e.g. Distributed Systems Lab)"
              placeholderTextColor={theme.colors.textDim}
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <TextInput
              style={styles.textInput}
              placeholder="Venue (e.g. Room 204 or Main Auditorium)"
              placeholderTextColor={theme.colors.textDim}
              value={formVenue}
              onChangeText={setFormVenue}
            />

            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Detailed description, prerequisites, and instructions..."
              placeholderTextColor={theme.colors.textDim}
              value={formDesc}
              onChangeText={setFormDesc}
              multiline
              numberOfLines={4}
            />

            {/* Submit Action Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.85}
              onPress={handleCreateEvent}
            >
              <Feather name="send" size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                {formScope === ScopeType.CAMPUS
                  ? 'SUBMIT FOR APPROVAL (UC-14)'
                  : 'PUBLISH TO CALENDAR'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Profile & Persona Screen */}
      {activeTab === 'profile' && (
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.profileScrollContent}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Feather name="user" size={32} color={theme.colors.accentPrimary} />
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEnrollment}>{user.enrollmentNo}</Text>

            <View style={styles.profileDivider} />

            <View style={styles.profileMetaGrid}>
              <View style={styles.profileMetaItem}>
                <Text style={styles.metaLabel}>COURSE & YEAR</Text>
                <Text style={styles.metaValue}>
                  {user.course} · Year {user.year}
                </Text>
              </View>
              <View style={styles.profileMetaItem}>
                <Text style={styles.metaLabel}>HOME SECTION</Text>
                <Text style={styles.metaValue}>{user.section}</Text>
              </View>
              <View style={styles.profileMetaItem}>
                <Text style={styles.metaLabel}>ACTIVE POSITIONS</Text>
                <Text style={styles.metaValue}>{user.positions.join(', ') || 'Student'}</Text>
              </View>
              <View style={styles.profileMetaItem}>
                <Text style={styles.metaLabel}>AFFILIATED CLUBS</Text>
                <Text style={styles.metaValue}>{user.clubs.join(', ') || 'None'}</Text>
              </View>
            </View>
          </View>

          {/* OOPS & Architecture Principles Card */}
          <View style={styles.architectureCard}>
            <View style={styles.archHeader}>
              <Feather
                name="cpu"
                size={16}
                color={theme.colors.section}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.archTitle}>SYSTEM ARCHITECTURE</Text>
            </View>
            <Text style={styles.archDescription}>
              • 4-Layer Domain Architecture (Domain, Service, Repository, Controller){'\n'}•
              Polymorphic Scope Filtering (Campus, Club, Section){'\n'}• Granular Role-Based Access
              Control (CR, Club Lead, Admin){'\n'}• Strict UTC Database Persist with Local IST
              Display
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Fixed Bottom Glassmorphic Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'calendar' && styles.navBtnActive]}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.8}
        >
          <Feather
            name="calendar"
            size={18}
            color={activeTab === 'calendar' ? theme.colors.accentPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navBtnText, activeTab === 'calendar' && styles.navBtnTextActive]}>
            CALENDAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'create' && styles.navBtnActive]}
          onPress={() => setActiveTab('create')}
          activeOpacity={0.8}
        >
          <Feather
            name="plus-circle"
            size={18}
            color={activeTab === 'create' ? theme.colors.accentPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navBtnText, activeTab === 'create' && styles.navBtnTextActive]}>
            PUBLISH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, activeTab === 'profile' && styles.navBtnActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Feather
            name="user"
            size={18}
            color={activeTab === 'profile' ? theme.colors.accentPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navBtnText, activeTab === 'profile' && styles.navBtnTextActive]}>
            PERSONA
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    backgroundColor: theme.colors.bgSubtle,
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === 'android'
        ? RNStatusBar.currentHeight
          ? RNStatusBar.currentHeight + 8
          : 36
        : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorderSubtle,
  },
  brandContainer: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 155, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 155, 0.25)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.section,
    marginRight: 5,
  },
  liveText: {
    color: theme.colors.section,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  userSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  personaBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainScroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  mainScrollContent: {
    paddingBottom: 80,
  },
  calendarControlBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: theme.colors.bg,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  yearTitle: {
    color: theme.colors.accentPrimary,
    fontWeight: '700',
  },
  navArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconNavBtn: {
    backgroundColor: theme.colors.surface,
    padding: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  todayBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  todayBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorderSubtle,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  viewModeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeBtnTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  monthContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 10,
  },
  dayOfWeekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorderSubtle,
    paddingBottom: 6,
    marginBottom: 4,
  },
  dayOfWeekHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeekHeaderText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekendHeaderText: {
    color: theme.colors.textDim,
  },
  daysMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  matrixDayCell: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  matrixDayOutside: {
    opacity: 0.25,
  },
  matrixDayToday: {
    borderWidth: 1,
    borderColor: theme.colors.nowLaser,
    backgroundColor: theme.colors.nowLaserBg,
  },
  matrixDaySelected: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
  },
  matrixDayNumber: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  matrixDayNumberOutside: {
    color: theme.colors.textDim,
  },
  matrixDayNumberToday: {
    color: theme.colors.nowLaser,
    fontWeight: '900',
  },
  matrixDayNumberSelected: {
    color: theme.colors.accentPrimary,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 4,
    alignItems: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  weekStripContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 6,
    justifyContent: 'space-between',
  },
  weekStripCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  weekStripCellToday: {
    borderWidth: 1,
    borderColor: theme.colors.nowLaser,
    backgroundColor: theme.colors.nowLaserBg,
  },
  weekStripCellSelected: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
  },
  weekStripDayName: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weekStripDayNameSelected: {
    color: theme.colors.accentPrimary,
  },
  weekStripDayNum: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  weekStripDayNumToday: {
    color: theme.colors.nowLaser,
    fontWeight: '900',
  },
  weekStripDayNumSelected: {
    color: theme.colors.accentPrimary,
    fontWeight: '900',
  },
  filtersSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  scopeChipsScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  scopeChipActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.accentPrimary,
  },
  scopeChipActiveCampus: {
    backgroundColor: theme.colors.campusBg,
    borderColor: theme.colors.campus,
  },
  scopeChipActiveClub: {
    backgroundColor: theme.colors.clubBg,
    borderColor: theme.colors.club,
  },
  scopeChipActiveSection: {
    backgroundColor: theme.colors.sectionBg,
    borderColor: theme.colors.section,
  },
  chipIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  scopeChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scopeChipTextActive: {
    color: theme.colors.textPrimary,
  },
  scopeChipTextActiveCampus: {
    color: theme.colors.campus,
  },
  scopeChipTextActiveClub: {
    color: theme.colors.club,
  },
  scopeChipTextActiveSection: {
    color: theme.colors.section,
  },
  sectionLensPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginTop: 6,
  },
  sectionLensPillActive: {
    borderColor: theme.colors.sectionBorder,
    backgroundColor: theme.colors.sectionBg,
  },
  sectionLensLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionLensValue: {
    color: theme.colors.section,
    fontWeight: '700',
  },
  agendaSection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorderSubtle,
    paddingBottom: 8,
  },
  agendaDateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  agendaSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.nowLaserBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.nowLaser,
  },
  nowPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.nowLaser,
    marginRight: 5,
  },
  nowBadgeText: {
    color: theme.colors.nowLaser,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorderSubtle,
  },
  emptyDayTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDaySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  timelineStream: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineGutter: {
    width: 60,
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  gutterTimeText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gutterLineContainer: {
    flex: 1,
    alignItems: 'center',
    width: 14,
    marginTop: 6,
    marginLeft: 6,
  },
  gutterNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: theme.colors.bg,
  },
  gutterConnector: {
    flex: 1,
    width: 1.5,
    backgroundColor: theme.colors.surfaceBorder,
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderLeftWidth: 4,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scopeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  scopeTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTimeText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cardDurationText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginLeft: 4,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 6,
  },
  eventDesc: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorderSubtle,
    paddingTop: 8,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  clubContextBadge: {
    backgroundColor: theme.colors.clubBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clubContextText: {
    color: theme.colors.club,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.sectionBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionContextText: {
    color: theme.colors.section,
    fontSize: 10,
    fontWeight: '700',
  },
  readOnlySectionBadge: {
    backgroundColor: theme.colors.accentAmberBg,
    borderWidth: 1,
    borderColor: theme.colors.accentAmberBorder,
  },
  readOnlySectionText: {
    color: theme.colors.accentAmber,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentAmberBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  approvalBadgeText: {
    color: theme.colors.accentAmber,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createScrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  createFormContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 18,
  },
  createHeader: {
    marginBottom: 16,
  },
  createTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  createSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  inputSectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 8,
  },
  scopeTileRow: {
    gap: 8,
    marginBottom: 8,
  },
  scopeTile: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 12,
  },
  scopeTileActiveSection: {
    borderColor: theme.colors.section,
    backgroundColor: theme.colors.sectionBg,
  },
  scopeTileActiveClub: {
    borderColor: theme.colors.club,
    backgroundColor: theme.colors.clubBg,
  },
  scopeTileActiveCampus: {
    borderColor: theme.colors.campus,
    backgroundColor: theme.colors.campusBg,
  },
  scopeTileTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  scopeTileTitleActive: {
    color: theme.colors.textPrimary,
  },
  scopeTileDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: theme.colors.bgSubtle,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.accentBlue,
    borderRadius: 8,
    paddingVertical: 13,
    marginTop: 12,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileScrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 20,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileEnrollment: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.surfaceBorderSubtle,
    marginVertical: 16,
  },
  profileMetaGrid: {
    width: '100%',
    gap: 12,
  },
  profileMetaItem: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorderSubtle,
  },
  metaLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  architectureCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
    marginTop: 14,
  },
  archHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  archTitle: {
    color: theme.colors.section,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  archDescription: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 62,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  navBtnActive: {},
  navBtnText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  navBtnTextActive: {
    color: theme.colors.accentPrimary,
    fontWeight: '800',
  },
});
