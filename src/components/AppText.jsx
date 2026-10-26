import React from 'react';
import { Text as NativeText } from 'react-native';
import { FONT_FAMILY } from '../theme';

export default function AppText({ style, ...props }) {
  return <NativeText {...props} style={[{ fontFamily: FONT_FAMILY }, style]} />;
}
