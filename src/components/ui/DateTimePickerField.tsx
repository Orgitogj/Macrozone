import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DateTimePickerFieldProps } from '@/components/ui/dateTimePickerFieldTypes';
import { TextButton } from '@/components/ui/TextButton';
import { colors, MIN_TOUCH_TARGET } from '@/styles/global';
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
          size={20}
          color={colors.primary}
        />
        <Text style={[styles.value, isEmpty && styles.placeholder]} numberOfLines={1}>
          {displayValue}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={iosDraft !== null}
          transparent
          animationType='slide'
          onRequestClose={() => closeIos(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.backdrop}
              onPress={() => closeIos(false)}
              accessibilityRole='button'
              accessibilityLabel='Cancel'
            />
            <View style={styles.sheet}>
              <View style={styles.toolbar}>
                <TextButton label='Cancel' onPress={() => closeIos(false)} />
                <Text style={styles.sheetTitle} accessibilityRole='header'>
                  {accessibilityLabel}
                </Text>
                <TextButton label='Done' onPress={() => closeIos(true)} />
              </View>
              {iosDraft ? (
                <DateTimePicker
                  value={iosDraft}
                  mode={mode}
                  display={mode === 'date' ? 'inline' : 'spinner'}
                  maximumDate={dateMaximum}
                  themeVariant='dark'
                  accentColor={colors.primary}
                  textColor={colors.text}
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

const styles = StyleSheet.create({
  trigger: {
    minHeight: MIN_TOUCH_TARGET + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  error: {
    borderColor: colors.alert,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  sheet: {
    backgroundColor: colors.header,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET + 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
