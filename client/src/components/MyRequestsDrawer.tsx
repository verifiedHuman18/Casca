import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SwipeableDrawer } from './SwipeableDrawer';
import type { ColorTokens } from '../theme';
import { EventStatus, type UIEventItem } from '../types';
import { formatTimeRange } from '../utils/date';
import { fetchMyRequests } from '../services/api';

export interface MyRequestsDrawerProps {
  visible: boolean;
  onClose: () => void;
  colors: ColorTokens;
  onOpenResubmit: (event: UIEventItem) => void;
}

export function MyRequestsDrawer({
  visible,
  onClose,
  colors,
  onOpenResubmit,
}: MyRequestsDrawerProps) {
  const [requests, setRequests] = useState<UIEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchMyRequests();
      setRequests(items);
    } catch {
      // Handled by api fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible, loadRequests]);

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case EventStatus.PENDING_APPROVAL:
        return {
          bg: colors.tintWarm,
          text: colors.tintWarmText,
          label: 'Awaiting Council Review',
          icon: 'clock' as const,
        };
      case EventStatus.ACTIVE:
        return {
          bg: colors.tintSage,
          text: colors.tintSageText,
          label: 'Approved & Live',
          icon: 'check-circle' as const,
        };
      case EventStatus.REJECTED:
        return {
          bg: colors.tintRose,
          text: colors.tintRoseText,
          label: 'Needs Revision',
          icon: 'alert-circle' as const,
        };
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          label: status,
          icon: 'info' as const,
        };
    }
  };

  return (
    <SwipeableDrawer
      visible={visible}
      onClose={onClose}
      title="My Campus Proposals"
      colors={colors}
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your proposals...
          </Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
            <Feather name="file-text" size={28} color={colors.textPrimary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Proposals Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You haven't submitted any campus-wide event requests. Club office bearers can submit
            proposals from the new event drawer.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {requests.length} {requests.length === 1 ? 'proposal' : 'proposals'} submitted
          </Text>

          {requests.map(item => {
            const timeInfo = formatTimeRange(item.startTime, item.endTime);
            const badge = getStatusBadge(item.status);
            const isRejected = item.status === EventStatus.REJECTED;

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: isRejected ? colors.tintRose : colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Feather
                      name={badge.icon}
                      size={12}
                      color={badge.text}
                      style={styles.badgeIcon}
                    />
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <Text style={[styles.timeDuration, { color: colors.textSecondary }]}>
                    {timeInfo.duration}
                  </Text>
                </View>

                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                {item.description ? (
                  <Text
                    style={[styles.itemDescription, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {item.venue}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="clock" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {timeInfo.range}
                  </Text>
                </View>

                {isRejected ? (
                  <View
                    style={[
                      styles.feedbackBox,
                      { backgroundColor: colors.bgCard, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.feedbackHeader}>
                      <Feather name="message-square" size={13} color={colors.tintRoseText} />
                      <Text style={[styles.feedbackTitle, { color: colors.tintRoseText }]}>
                        Council Review Feedback
                      </Text>
                    </View>
                    <Text style={[styles.feedbackBody, { color: colors.textPrimary }]}>
                      Please reschedule to avoid clash with Annual Tech Symposium in the Main
                      Auditorium.
                    </Text>

                    <TouchableOpacity
                      style={[styles.resubmitBtn, { backgroundColor: colors.pillActiveBg }]}
                      onPress={() => {
                        onClose();
                        onOpenResubmit(item);
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-3" size={14} color={colors.pillActiveText} />
                      <Text style={[styles.resubmitBtnText, { color: colors.pillActiveText }]}>
                        Revise & Resubmit Proposal
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </SwipeableDrawer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 56,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    paddingBottom: 24,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeIcon: {
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  feedbackBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  feedbackBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  resubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
