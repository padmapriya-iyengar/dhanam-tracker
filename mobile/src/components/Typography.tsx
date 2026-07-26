import { forwardRef } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  TextInputProps,
  TextProps,
} from 'react-native';
import { typography } from '../theme';

export const Text = forwardRef<NativeText, TextProps>(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[{ fontFamily: typography.fontFamily }, style]} />
));

Text.displayName = 'DhanamText';

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[{ fontFamily: typography.fontFamily }, style]} />
));

TextInput.displayName = 'DhanamTextInput';
