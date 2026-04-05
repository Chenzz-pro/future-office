'use client';

import { UserSettingsDialog } from '../user-settings-dialog';

interface ApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

interface SettingsDialogWrapperProps {
  onClose: () => void;
  onKeysChange: (keys: ApiKey[]) => void;
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
