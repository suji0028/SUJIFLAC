import React from 'react';
import { Text as NativeText } from 'react-native';
import { FONT_FAMILY } from '../theme';

export default function AppText({ variant, style, ...props }) {
  const fontFamily = variant === 'songTitle'
    ? 'BlackMustang'
    : variant === 'metadata' ? 'BlackPink' : FONT_FAMILY;

  return <NativeText {...props} style={[{ fontFamily }, style]} />;
}
