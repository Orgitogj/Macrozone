import { AppTextInput } from '@/components/ui/AppTextInput';
import { FormField } from '@/components/ui/FormField';
import { PASSWORD_LIMITS } from '@/features/auth/validation/credentials';

type EmailFieldProps = {
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export function EmailField({ value, error, disabled = false, onChange, onSubmit }: EmailFieldProps) {
  return (
    <FormField label='Email address' error={error}>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        keyboardType='email-address'
        inputMode='email'
        textContentType='emailAddress'
        autoComplete='email'
        autoCapitalize='none'
        autoCorrect={false}
        editable={!disabled}
        hasError={error !== undefined}
        returnKeyType='next'
        onSubmitEditing={onSubmit}
        maxLength={254}
        accessibilityLabel='Email address'
      />
    </FormField>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  isNew?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export function PasswordField({
  label,
  value,
  error,
  hint,
  disabled = false,
  isNew = false,
  onChange,
  onSubmit,
}: PasswordFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint}>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        textContentType={isNew ? 'newPassword' : 'password'}
        autoComplete={isNew ? 'new-password' : 'current-password'}
        autoCapitalize='none'
        autoCorrect={false}
        editable={!disabled}
        hasError={error !== undefined}
        returnKeyType='done'
        onSubmitEditing={onSubmit}
        maxLength={PASSWORD_LIMITS.maxLength}
        accessibilityLabel={label}
      />
    </FormField>
  );
}
