import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import type { DateTimePickerFieldProps } from '@/components/ui/dateTimePickerFieldTypes';
import { TextButton } from '@/components/ui/TextButton';
import {
  borderWidths,
  componentSizes,
  iconSizes,
  opacity,
  radii,
  spacing,
  touchTargets,
  useTheme,
  useThemedStyles,
  type Theme,
} from '@/theme';
import { clampDateToMaximum } from '@/utils/dateTimeInput';

export function DateTimePickerField({
  mode,
  value,
  displayValue,
  onChange,
  accessibilityLabel,
  accessibilityHint,
  isEmpty = false,
  maximumDate,
  disabled = false,
  hasError = false,
  onOpenChange,
  style,
}: DateTimePickerFieldProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [iosDraft, setIosDraft] = useState<Date | null>(null);
  const androidOpen = useRef(false);
  const dateMaximum = mode === 'date' ? maximumDate : undefined;

  useEffect(
    () => () => {
      if (androidOpen.current) {
        void DateTimePickerAndroid.dismiss(mode);
      }
    },
    [mode],
  );

  const open = () => {
    if (disabled) {
      return;
    }
    Keyboard.dismiss();
    onOpenChange?.(true);
    if (Platform.OS === 'android') {
      androidOpen.current = true;
      DateTimePickerAndroid.open({
        value,
        mode,
        maximumDate: dateMaximum,
        onChange: (event, selected) => {
          androidOpen.current = false;
          onOpenChange?.(false);
          if (event.type === 'set' && selected) {
            onChange(clampDateToMaximum(selected, dateMaximum));
          }
        },
      });
      return;
    }
    setIosDraft(value);
  };

  const closeIos = (commit: boolean) => {
    if (commit && iosDraft) {
      onChange(clampDateToMaximum(iosDraft, dateMaximum));
    }
    setIosDraft(null);
    onOpenChange?.(false);
  };

  return (
    <>
      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: displayValue }}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, expanded: iosDraft !== null }}
        style={({ pressed }) => [
          styles.trigger,
          hasError && styles.error,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={iconSizes.md}
          color={theme.colors.primary}
        />
        <AppText variant='body' tone={isEmpty ? 'muted' : 'primary'} numberOfLines={1} style={styles.value}>
          {displayValue}
        </AppText>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosDraft !== null} transparent animationType='slide' onRequestClose={() => closeIos(false)}>
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.backdrop}
              onPress={() => closeIos(false)}
              accessibilityRole='button'
              accessibilityLabel='Cancel'
            />
            <View style={[styles.sheet, { paddingBottom: spacing.xxl + insets.bottom }]}>
              <View style={styles.toolbar}>
                <TextButton label='Cancel' tone='secondary' onPress={() => closeIos(false)} />
                <AppText variant='subheading' accessibilityRole='header'>
                  {accessibilityLabel}
                </AppText>
                <TextButton label='Done' onPress={() => closeIos(true)} />
              </View>
              {iosDraft ? (
                <DateTimePicker
                  value={iosDraft}
                  mode={mode}
                  display={mode === 'date' ? 'inline' : 'spinner'}
                  maximumDate={dateMaximum}
                  themeVariant={theme.scheme}
                  accentColor={theme.colors.primary}
                  textColor={theme.colors.textPrimary}
                  onChange={(_event, selected) => {
                    if (selected) {
                      setIosDraft(selected);
                    }
                  }}
                  style={styles.iosPicker}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    trigger: {
      minHeight: componentSizes.control,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: radii.md,
      borderWidth: borderWidths.thin,
      borderColor: theme.colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    error: {
      borderColor: theme.colors.danger,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    disabled: {
      opacity: opacity.disabled,
    },
    value: {
      flex: 1,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: touchTargets.comfortable,
    },
    iosPicker: {
      alignSelf: 'center',
    },
  });
