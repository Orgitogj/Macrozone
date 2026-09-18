import type { DeleteAccountMode } from '@/features/account/services/accountServices';

export type DeleteAccountChoice = { value: DeleteAccountMode; label: string; description: string };

export const DELETE_ACCOUNT_CHOICES: readonly DeleteAccountChoice[] = [
  {
    value: 'copy_to_guest',
    label: 'Copy my data to this device, then delete my account',
    description:
      'Your meals, foods, saved meals, recipes and goals are copied into the data MacroZone keeps without an account. The copy is checked first; if it cannot be completed, nothing is deleted.',
  },
  {
    value: 'remove',
    label: 'Delete my account and remove this device’s account data',
    description:
      'Nothing is copied. Data you logged before signing in stays exactly as it is, but everything logged inside this account is gone.',
  },
];
