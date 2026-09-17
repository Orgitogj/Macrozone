import { Image, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { FormField } from '@/components/ui/FormField';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { TextButton } from '@/components/ui/TextButton';
import type { PhotoSource } from '@/features/ai-meal/adapters/photoAdapter';
import { AI_PHOTO_CAVEAT } from '@/features/ai-meal/constants';
import type { PhotoNotice } from '@/features/ai-meal/hooks/useAiMealFlow';
import type { PreparedPhoto } from '@/features/ai-meal/types';
import { componentSizes, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type MealPhotoPickerProps = {
  photo: PreparedPhoto | null;
  notice: PhotoNotice;
  isPicking: boolean;
  isCameraAvailable: boolean;
  disabled?: boolean;
  onPick: (source: PhotoSource) => void;
  onRemove: () => void;
  onOpenSettings: () => void;
};

export function MealPhotoPicker({
  photo,
  notice,
  isPicking,
  isCameraAvailable,
  disabled = false,
  onPick,
  onRemove,
  onOpenSettings,
}: MealPhotoPickerProps) {
  const styles = useThemedStyles(createStyles);
  const isBusy = disabled || isPicking;

  return (
    <FormField label='Meal photo'>
      {photo ? (
        <Image
          source={{ uri: photo.uri }}
          style={[styles.preview, { aspectRatio: photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 1 }]}
          resizeMode='contain'
          accessible
          accessibilityRole='image'
          accessibilityLabel='Selected meal photo'
        />
      ) : (
        <AppCard style={styles.placeholder}>
          <AppText variant='body' tone='muted' align='center'>
            {isPicking ? 'Preparing your photo…' : 'No photo selected'}
          </AppText>
        </AppCard>
      )}

      {isPicking ? <AppLoader accessibilityLabel='Preparing photo' style={styles.loader} /> : null}

      <View style={styles.actions}>
        {isCameraAvailable ? (
          <AppButton
            label={photo ? 'Retake Photo' : 'Take Photo'}
            variant='secondary'
            onPress={() => onPick('camera')}
            disabled={isBusy}
            accessibilityHint='Opens the camera. Camera access is requested only when needed.'
            style={styles.action}
          />
        ) : null}
        <AppButton
          label={photo ? 'Choose Another' : 'Choose Photo'}
          variant='secondary'
          onPress={() => onPick('library')}
          disabled={isBusy}
          accessibilityHint='Opens your photo library'
          style={styles.action}
        />
      </View>
      {photo ? (
        <TextButton
          label='Remove Photo'
          tone='danger'
          icon='trash-outline'
          onPress={onRemove}
          disabled={isBusy}
          accessibilityHint='Removes this photo from the estimate'
        />
      ) : null}

      <AppText variant='caption' tone='secondary'>
        {AI_PHOTO_CAVEAT}
      </AppText>

      {notice?.kind === 'permission' ? (
        <NoticeCard
          tone='warning'
          title='Camera access is off'
          message={
            notice.canAskAgain
              ? 'MacroZone needs camera access to take a meal photo. You can also choose a photo from your library.'
              : 'Allow camera access for MacroZone in Settings to take a meal photo, or choose a photo from your library.'
          }
        >
          {notice.canAskAgain ? null : <TextButton label='Open Settings' size='small' onPress={onOpenSettings} />}
        </NoticeCard>
      ) : null}
      {notice?.kind === 'error' ? <NoticeCard tone='danger' message={notice.message} /> : null}
    </FormField>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    preview: {
      width: '100%',
      maxHeight: componentSizes.control * 6,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    placeholder: {
      minHeight: componentSizes.control * 2,
      justifyContent: 'center',
    },
    loader: {
      paddingVertical: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    action: {
      flexGrow: 1,
      flexBasis: componentSizes.control * 3,
    },
  });
