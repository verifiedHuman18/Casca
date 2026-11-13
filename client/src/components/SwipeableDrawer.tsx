import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ColorTokens } from '../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_DISMISS_THRESHOLD = 90;

export interface SwipeableDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  colors: ColorTokens;
  children: React.ReactNode;
}

export function SwipeableDrawer({
  visible,
  onClose,
  title,
  colors,
  children,
}: SwipeableDrawerProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
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
      <View style={styles.modalRoot}>
        {/* Static, non-animated dark overlay per user instruction */}
        <Pressable
          style={[styles.staticOverlay, { backgroundColor: colors.overlayBg }]}
          onPress={handleClose}
        />

        {/* Animated sheet container */}
        <Animated.View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.bgCard, transform: [{ translateY }] },
          ]}
        >
          {/* Top Drag Handle & Header (Swipeable touch zone) */}
          <View {...panResponder.panHandlers} style={styles.dragHeaderZone}>
            <View style={[styles.dragHandleBar, { backgroundColor: colors.borderStrong }]} />
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
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
            contentContainerStyle={[
              styles.contentScroll,
              { paddingBottom: (Platform.OS === 'ios' ? 44 : 32) + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
