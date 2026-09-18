import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { BARCODE_LIMITS } from '@/features/barcode/constants';
import { describeBarcodeFailure, type BarcodeFailureReason } from '@/features/barcode/utils/gtin';
import { spacing } from '@/theme';

type ManualBarcodeFormProps = {
  value: string;
  error: BarcodeFailureReason | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ManualBarcodeForm({ value, error, disabled = false, onChange, onSubmit }: ManualBarcodeFormProps) {
  return (
    <View style={styles.container}>
      <FormField
        label='Barcode number'
        error={error === null ? undefined : describeBarcodeFailure(error)}
        hint='Type the 8, 12, 13, or 14 digits printed under the barcode.'
      >
        <AppTextInput
          value={value}
          onChangeText={onChange}
          keyboardType='number-pad'
          inputMode='numeric'
          maxLength={BARCODE_LIMITS.maxManualInputLength}
          autoCorrect={false}
          autoCapitalize='none'
          editable={!disabled}
          hasError={error !== null}
          returnKeyType='search'
          onSubmitEditing={onSubmit}
          accessibilityLabel='Barcode number'
        />
      </FormField>
      <AppButton label='Look Up Product' onPress={onSubmit} disabled={disabled} accessibilityHint='Checks saved products, then Open Food Facts' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
