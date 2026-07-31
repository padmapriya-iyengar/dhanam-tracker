import { ElementRef, forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  TextInputProps,
  TextProps,
} from 'react-native';

const FONT_SCALE = 0.92;

function fontFor(style: TextProps['style']) {
  const weight = String(StyleSheet.flatten(style)?.fontWeight || '400');
  if (weight === '600' || weight === '700' || weight === '800' || weight === '900' || weight === 'bold') return 'CarlitoBold';
  return 'Carlito';
}

function typographyFor(style: TextProps['style']) {
  const flattened = StyleSheet.flatten(style);
  const declaredSize = Number(flattened?.fontSize || 14);
  const bold = fontFor(style) === 'CarlitoBold';
  return {
    fontFamily: fontFor(style),
    fontWeight: '400' as const,
    fontSize: Math.max(declaredSize * FONT_SCALE, 9),
    letterSpacing: flattened?.letterSpacing ?? (bold ? -0.1 : -0.15),
    ...(!flattened?.lineHeight ? { lineHeight: declaredSize * FONT_SCALE * 1.34 } : {}),
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
