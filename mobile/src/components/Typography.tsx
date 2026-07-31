import { ElementRef, forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  TextInputProps,
  TextProps,
} from 'react-native';

function fontFor(style: TextProps['style']) {
  const weight = String(StyleSheet.flatten(style)?.fontWeight || '400');
  if (weight === '800' || weight === '900') return 'LatoBlack';
  if (weight === '600' || weight === '700' || weight === 'bold') return 'LatoBold';
  return 'Lato';
}

function typographyFor(style: TextProps['style']) {
  const flattened = StyleSheet.flatten(style);
  return {
    fontFamily: fontFor(style),
    fontSize: Math.max(Number(flattened?.fontSize || 14) - 2, 9),
  };
}

export const Text = forwardRef<ElementRef<typeof NativeText>, TextProps>(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[style, typographyFor(style)]} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef<ElementRef<typeof NativeTextInput>, TextInputProps>(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[style, typographyFor(style)]} />
));
TextInput.displayName = 'TextInput';
