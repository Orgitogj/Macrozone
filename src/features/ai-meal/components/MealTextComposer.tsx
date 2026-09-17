import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { AI_LIMITS, AI_TEXT_EXAMPLES } from '@/features/ai-meal/constants';
import { componentSizes } from '@/theme';

type MealTextComposerProps = {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  disabled?: boolean;
};

export function MealTextComposer({ value, onChange, error, disabled = false }: MealTextComposerProps) {
  const length = value.length;

  return (
    <FormField
      label='Describe your meal'
      error={error ?? undefined}
      hint={`Include foods and amounts when you can, for example “${AI_TEXT_EXAMPLES[0]}”.`}
    >
      <AppTextInput
        value={value}
        onChangeText={onChange}
        multiline
        maxLength={AI_LIMITS.maxTextLength}
        editable={!disabled}
        hasError={Boolean(error)}
        placeholder={AI_TEXT_EXAMPLES[1]}
        accessibilityLabel='Meal description'
        accessibilityHint={`Up to ${AI_LIMITS.maxTextLength} characters. Nothing is sent until you tap Analyze.`}
        autoCapitalize='sentences'
        style={styles.input}
      />
      <View style={styles.counter}>
        <AppText
          variant='caption'
          tone={length >= AI_LIMITS.maxTextLength ? 'warning' : 'muted'}
          accessibilityLabel={`${length} of ${AI_LIMITS.maxTextLength} characters used`}
        >
          {`${length}/${AI_LIMITS.maxTextLength}`}
        </AppText>
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: componentSizes.control * 2,
    textAlignVertical: 'top',
  },
  counter: {
    alignItems: 'flex-end',
  },
});
