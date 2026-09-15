import { StyleSheet, View } from 'react-native';

import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { TextButton } from '@/components/ui/TextButton';
import { formatNumberForInput } from '@/utils/numberInput';
import { spacing } from '@/theme';

type QuickAmount = {
  label: string;
  value: number;
  accessibilityLabel: string;
};

type AmountFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  accessibilityLabel: string;
  error?: string;
  hint?: string;
  quickAmounts?: readonly QuickAmount[];
  disabled?: boolean;
};

export function AmountField({
  label,
  value,
  onChange,
  suffix,
  accessibilityLabel,
  error,
  hint,
  quickAmounts = [],
  disabled = false,
}: AmountFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        keyboardType='decimal-pad'
        suffix={suffix}
        hasError={Boolean(error)}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={error}
        returnKeyType='done'
      />
      {quickAmounts.length > 0 ? (
        <View style={styles.quick}>
          {quickAmounts.map((quick) => (
            <TextButton
              key={quick.label}
              label={quick.label}
              size='small'
              tone='secondary'
              disabled={disabled}
              onPress={() => onChange(formatNumberForInput(quick.value))}
              accessibilityLabel={quick.accessibilityLabel}
            />
          ))}
        </View>
      ) : null}
    </FormField>
  );
}

const styles = StyleSheet.create({
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
  },
});
