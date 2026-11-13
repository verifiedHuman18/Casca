import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SwipeableDrawer } from './SwipeableDrawer';
import { AnimatedFocusInput } from './AnimatedFocusInput';
import type { ColorTokens } from '../theme';
import type { UIEventItem } from '../types';
import { formatTimeRange } from '../utils/date';
import { fetchApprovalQueue, approveEventApi, rejectEventApi } from '../services/api';

export interface ApprovalQueueDrawerProps {
  visible: boolean;
  onClose: () => void;
  colors: ColorTokens;
  onEventApproved: (event: UIEventItem) => void;
  onEventRejected: (eventId: string, reason: string) => void;
}

export function ApprovalQueueDrawer({
  visible,
  onClose,
  colors,
  onEventApproved,
  onEventRejected,
}: ApprovalQueueDrawerProps) {
  const [queue, setQueue] = useState<UIEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<UIEventItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchApprovalQueue();
      setQueue(items);
    } catch {
      // Handled by api fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadQueue();
      setRejectingItem(null);
      setRejectionReason('');
    }
  }, [visible, loadQueue]);

  const handleApprove = async (item: UIEventItem) => {
    Alert.alert('Approve Campus Event', `Approve "${item.title}" for campus-wide publishing?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            await approveEventApi(item.id);
            setQueue(prev => prev.filter(e => e.id !== item.id));
            onEventApproved(item);
            Alert.alert('Approved', `"${item.title}" is now active on the campus calendar.`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Approval failed.';
            Alert.alert('Error', msg);
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const trimmed = rejectionReason.trim();
    if (!trimmed) {
      Alert.alert('Reason Required', 'Please provide a clear reason for rejecting this event.');
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectEventApi(rejectingItem.id, trimmed);
      const rejectedId = rejectingItem.id;
      setQueue(prev => prev.filter(e => e.id !== rejectedId));
      onEventRejected(rejectedId, trimmed);
      setRejectingItem(null);
      setRejectionReason('');
      Alert.alert(
        'Rejected',
        'Event request rejected. The requester has been notified with the reason.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SwipeableDrawer
      visible={visible}
      onClose={onClose}
      title="Campus Approval Queue"
      colors={colors}
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading pending requests...
          </Text>
        </View>
      ) : rejectingItem ? (
        <View style={styles.rejectContainer}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.rejectTargetTitle, { color: colors.textPrimary }]}>
              {rejectingItem.title}
            </Text>
            <Text style={[styles.rejectTargetClub, { color: colors.textSecondary }]}>
              {rejectingItem.clubName
                ? `Submitted by ${rejectingItem.clubName}`
                : 'Campus Proposal'}
            </Text>
          </View>

          <AnimatedFocusInput
            label="Reason for Rejection (Required)"
            placeholder="Explain why this event cannot be approved (e.g., venue clash, missing approval, date conflict)..."
            value={rejectionReason}
            onChangeText={setRejectionReason}
            colors={colors}
            multiline
            numberOfLines={4}
          />

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.borderStrong }]}
              onPress={() => setRejectingItem(null)}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rejectConfirmBtn, { backgroundColor: colors.tintRose }]}
              onPress={handleConfirmReject}
              disabled={isSubmitting}
            >
              <Text style={[styles.rejectConfirmBtnText, { color: colors.tintRoseText }]}>
                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
            <Feather name="check" size={28} color={colors.textPrimary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All Clear</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No pending campus-wide event proposals waiting for review.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={[styles.queueCount, { color: colors.textSecondary }]}>
            {queue.length} {queue.length === 1 ? 'proposal' : 'proposals'} awaiting council review
          </Text>

          {queue.map(item => {
            const timeInfo = formatTimeRange(item.startTime, item.endTime);
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: colors.tintWarm }]}>
                    <Text style={[styles.badgeText, { color: colors.tintWarmText }]}>
                      {item.clubName || 'CAMPUS'}
                    </Text>
                  </View>
                  <Text style={[styles.timeDuration, { color: colors.textSecondary }]}>
                    {timeInfo.duration}
                  </Text>
                </View>

                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                {item.description ? (
                  <Text
                    style={[styles.itemDescription, { color: colors.textSecondary }]}
                    numberOfLines={3}
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

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { backgroundColor: colors.tintRose }]}
                    onPress={() => setRejectingItem(item)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x" size={15} color={colors.tintRoseText} />
                    <Text style={[styles.rejectBtnText, { color: colors.tintRoseText }]}>
                      Reject
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: colors.tintSage }]}
                    onPress={() => handleApprove(item)}
                    activeOpacity={0.8}
                  >
                    <Feather name="check" size={15} color={colors.tintSageText} />
                    <Text style={[styles.approveBtnText, { color: colors.tintSageText }]}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                </View>
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
  queueCount: {
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
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
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rejectContainer: {
    paddingBottom: 24,
  },
  rejectTargetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rejectTargetClub: {
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  reasonInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 110,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
