'use client';

import { UserSettingsDialog } from '../user-settings-dialog';

interface SettingsDialogWrapperProps {
  onClose: () => void;
  onKeysChange: (keys: any[]) => void;
}

export function SettingsDialogWrapper({ onClose, onKeysChange }: SettingsDialogWrapperProps) {
  return (
    <UserSettingsDialog
      open={true}
      onClose={onClose}
      onKeysChange={onKeysChange}
    />
  );
}
