import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ScopeType, EventStatus, UIEventItem, UserSession } from './types';
import {
  INITIAL_MOCK_USER,
  INITIAL_MOCK_EVENTS,
  fetchCalendarEvents,
  createNewEvent,
} from './services/api';

type TabType = 'calendar' | 'create' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [user, setUser] = useState<UserSession>(INITIAL_MOCK_USER);
  const [events, setEvents] = useState<UIEventItem[]>(INITIAL_MOCK_EVENTS);
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<'ALL' | ScopeType>('ALL');
  const [extraSectionView, setExtraSectionView] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formScope, setFormScope] = useState<ScopeType>(ScopeType.SECTION);

  useEffect(() => {
    fetchCalendarEvents().then(setEvents);
  }, []);

  const handleCreateEvent = async () => {
    if (!formTitle.trim() || !formVenue.trim()) {
      Alert.alert('Validation Error', 'Title and venue are required.');
      return;
    }

    const created = await createNewEvent({
      title: formTitle.trim(),
      description: formDesc.trim(),
      venue: formVenue.trim(),
      startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
      endTime: new Date(Date.now() + 3600000 * 26).toISOString(),
      scope: formScope,
      clubName: formScope === ScopeType.CLUB ? user.clubs[0] || 'Tech Club' : undefined,
      targetSections:
        formScope === ScopeType.SECTION ? [`${user.course}-${user.section}`] : undefined,
    });

    setEvents(prev => [created, ...prev]);
    setFormTitle('');
    setFormDesc('');
    setFormVenue('');
    setActiveTab('calendar');

    const msg =
      created.status === EventStatus.PENDING_APPROVAL
        ? 'Campus event request submitted! It will appear on calendars once approved by an Admin (UC-14).'
        : 'Event published successfully and added to calendar!';
    Alert.alert('Success', msg);
  };

  // Filter events based on active filters and section preference
  const filteredEvents = events.filter(evt => {
    if (selectedScopeFilter !== 'ALL' && evt.scope !== selectedScopeFilter) {
      return false;
    }
    return true;
  });

  const formatIST = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getScopeBadgeColor = (scope: ScopeType) => {
    switch (scope) {
      case ScopeType.CAMPUS:
        return '#2563eb'; // Blue
      case ScopeType.CLUB:
        return '#7c3aed'; // Purple
      case ScopeType.SECTION:
        return '#059669'; // Emerald Green
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Casca</Text>
          <Text style={styles.headerSubtitle}>
            {user.name} · {user.course}-{user.section} (Yr {user.year})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.roleTag}
          onPress={() => {
            Alert.alert('Switch Persona (Testing)', 'Choose an actor persona to preview:', [
              {
                text: 'Student Only',
                onPress: () =>
                  setUser({
                    ...user,
                    positions: ['Student'],
                    clubs: [],
                  }),
              },
              {
                text: 'Class Rep (CR)',
                onPress: () =>
                  setUser({
                    ...user,
                    positions: ['Class Representative'],
                    clubs: [],
                  }),
              },
              {
                text: 'Club Coordinator',
                onPress: () =>
                  setUser({
                    ...user,
                    positions: ['Club Coordinator'],
                    clubs: ['Coding Club'],
                  }),
              },
            ]);
          }}
        >
          <Text style={styles.roleTagText}>{user.positions[0] || 'Student'}</Text>
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      <View style={styles.content}>
        {activeTab === 'calendar' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {/* Filter Chips */}
            <View style={styles.filterRow}>
              {(['ALL', ScopeType.CAMPUS, ScopeType.CLUB, ScopeType.SECTION] as const).map(
                scope => (
                  <TouchableOpacity
                    key={scope}
                    style={[
                      styles.filterChip,
                      selectedScopeFilter === scope && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedScopeFilter(scope)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedScopeFilter === scope && styles.filterChipTextActive,
                      ]}
                    >
                      {scope}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* UC-04 Section Switcher Banner */}
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionBannerText}>
                Active View:{' '}
                <Text style={styles.boldText}>
                  {user.course}-{user.section}
                </Text>
                {extraSectionView ? ` + ${extraSectionView} (Read-Only)` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setExtraSectionView(prev => (prev ? null : 'IT-B'));
                }}
              >
                <Text style={styles.toggleLink}>
                  {extraSectionView ? 'Reset View' : '+ Browse IT-B (UC-04)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Events List */}
            {filteredEvents.map(evt => (
              <View key={evt.id} style={styles.eventCard}>
                <View style={styles.cardHeader}>
                  <View
                    style={[styles.scopeBadge, { backgroundColor: getScopeBadgeColor(evt.scope) }]}
                  >
                    <Text style={styles.scopeBadgeText}>{evt.scope}</Text>
                  </View>
                  {evt.status === EventStatus.PENDING_APPROVAL && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending Approval</Text>
                    </View>
                  )}
                  {extraSectionView && evt.targetSections?.includes('IT-B') && (
                    <View style={styles.readOnlyBadge}>
                      <Text style={styles.readOnlyBadgeText}>Read-Only</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.eventTitle}>{evt.title}</Text>
                <Text style={styles.eventDesc}>{evt.description}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>📍 {evt.venue}</Text>
                  <Text style={styles.metaText}>⏰ {formatIST(evt.startTime)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'create' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeading}>Publish / Request Event</Text>
            <Text style={styles.subtext}>
              Role-based publishing: Club office bearers create club events or request campus
              events; CRs publish for their section.
            </Text>

            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Winter Coding Hackathon"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Event agenda and instructions..."
              value={formDesc}
              onChangeText={setFormDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Venue</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Main Auditorium / Lab 3"
              value={formVenue}
              onChangeText={setFormVenue}
            />

            <Text style={styles.label}>Event Scope</Text>
            <View style={styles.scopeSelector}>
              {[
                { type: ScopeType.SECTION, label: 'Section (Own Class)' },
                { type: ScopeType.CLUB, label: 'Club (Coding Club)' },
                { type: ScopeType.CAMPUS, label: 'Campus (Request Admin Approval)' },
              ].map(item => (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.scopeButton, formScope === item.type && styles.scopeButtonActive]}
                  onPress={() => setFormScope(item.type)}
                >
                  <Text
                    style={[
                      styles.scopeButtonText,
                      formScope === item.type && styles.scopeButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEvent}>
              <Text style={styles.submitBtnText}>
                {formScope === ScopeType.CAMPUS
                  ? 'Submit for Admin Approval (UC-14)'
                  : 'Publish Event'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileSub}>Enrollment: {user.enrollmentNo}</Text>
              <Text style={styles.profileSub}>
                Course: {user.course} · Section: {user.section} · Year: {user.year}
              </Text>
            </View>

            <Text style={styles.sectionHeading}>Active Roles & Assignments</Text>
            {user.positions.map((pos, idx) => (
              <View key={idx} style={styles.roleCard}>
                <Text style={styles.roleCardTitle}>{pos}</Text>
                <Text style={styles.roleCardDesc}>
                  Permissions computed dynamically from current role assignments.
                </Text>
              </View>
            ))}

            <Text style={styles.sectionHeading}>Clubs Joined</Text>
            {user.clubs.length > 0 ? (
              user.clubs.map((c, i) => (
                <View key={i} style={styles.clubCard}>
                  <Text style={styles.clubName}>⚡ {c}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No clubs joined yet.</Text>
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('calendar')}>
          <Text style={[styles.navIcon, activeTab === 'calendar' && styles.navIconActive]}>📅</Text>
          <Text style={[styles.navText, activeTab === 'calendar' && styles.navTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('create')}>
          <Text style={[styles.navIcon, activeTab === 'create' && styles.navIconActive]}>➕</Text>
          <Text style={[styles.navText, activeTab === 'create' && styles.navTextActive]}>
            Publish
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  roleTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#1e3a8a',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  sectionBanner: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionBannerText: {
    fontSize: 12,
    color: '#0369a1',
  },
  boldText: {
    fontWeight: 'bold',
  },
  toggleLink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  pendingBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '600',
  },
  readOnlyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  readOnlyBadgeText: {
    color: '#64748b',
    fontSize: 10,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  scopeSelector: {
    gap: 8,
    marginBottom: 16,
  },
  scopeButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
  },
  scopeButtonActive: {
    borderColor: '#1e3a8a',
    backgroundColor: '#eff6ff',
  },
  scopeButtonText: {
    fontSize: 13,
    color: '#475569',
  },
  scopeButtonTextActive: {
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  roleCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  roleCardDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  clubCard: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  clubName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  navBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingBottom: 16,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  navIconActive: {
    color: '#1e3a8a',
  },
  navText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  navTextActive: {
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
});
