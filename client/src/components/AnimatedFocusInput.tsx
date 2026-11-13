import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { ColorTokens } from '../theme';

export type TextInputHandle = React.ElementRef<typeof TextInput>;

export interface AnimatedFocusInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  colors: ColorTokens;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onFocusChange?: (focused: boolean) => void;
}

export const AnimatedFocusInput = React.forwardRef<TextInputHandle, AnimatedFocusInputProps>(
  function AnimatedFocusInput(
    {
      label,
      colors,
      value,
      onChangeText,
      placeholder,
      placeholderTextColor,
      multiline = false,
      numberOfLines = 1,
      style,
      containerStyle,
      onFocus,
      onBlur,
      onFocusChange,
      ...restProps
    },
    ref
  ) {
    const [isFocused, setIsFocused] = useState(false);
    const elevateAnim = useRef(new Animated.Value(0)).current;
    const innerRef = useRef<TextInputHandle | null>(null);

    // Synchronize ref forwarding
    const setRefs = (element: TextInputHandle | null) => {
      innerRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    useEffect(() => {
      Animated.spring(elevateAnim, {
        toValue: isFocused ? 1 : 0,
        damping: isFocused ? 20 : 24,
        stiffness: isFocused ? 240 : 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }, [isFocused, elevateAnim]);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocusChange?.(true);
      onFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onFocusChange?.(false);
      onBlur?.(e);
    };

    const handleDone = () => {
      (innerRef.current as { blur?: () => void } | null)?.blur?.();
      Keyboard.dismiss();
    };

    // Interpolated transforms for the "Lift above keyboard & Dock back" animation
    const scale = elevateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.025],
    });

    const translateY = elevateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

    const headerOpacity = elevateAnim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0, 1],
    });

    const headerTranslateY = elevateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 0],
    });

    return (
      <View style={[styles.wrapper, { zIndex: isFocused ? 999 : 1 }, containerStyle]}>
        {/* Floating accessory header that slides in when focused */}
        {isFocused && (
          <Animated.View
            style={[
              styles.floatingHeader,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslateY }],
              },
            ]}
          >
            <View style={styles.floatingHeaderLeft}>
              <Feather
                name="edit-3"
                size={13}
                color={colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.floatingHeaderLabel, { color: colors.textSecondary }]}>
                {label}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.pillActiveBg }]}
              onPress={handleDone}
              activeOpacity={0.8}
              accessibilityLabel={`Finish editing ${label}`}
            >
              <Feather
                name="check"
                size={14}
                color={colors.pillActiveText}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.doneBtnText, { color: colors.pillActiveText }]}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Elevated input card that scales, shadows, and docks back into place */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isFocused ? colors.bgCard : colors.surfaceSubtle,
              borderColor: isFocused ? colors.pillActiveBg : colors.border,
              borderWidth: isFocused ? 1.5 : 1,
              transform: [{ scale }, { translateY }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: isFocused ? 6 : 0 },
              shadowOpacity: isFocused ? 0.16 : 0,
              shadowRadius: isFocused ? 10 : 0,
              elevation: isFocused ? 8 : 0,
            },
          ]}
        >
          <TextInput
            ref={setRefs}
            style={[
              styles.input,
              multiline && styles.inputMultiline,
              { color: colors.textPrimary },
              style,
            ]}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? 'top' : 'center'}
            {...restProps}
          />
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    width: '100%',
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  floatingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardContainer: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  inputMultiline: {
    minHeight: 88,
  },
});
