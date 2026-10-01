import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

/** A native two-button confirmation, as a promise. */
export const confirm: Confirm = ({ title, message, confirmLabel, destructive = false }) =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
