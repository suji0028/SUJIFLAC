import React, { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import AppText from './AppText';
import { C } from '../theme';

const SIZE = 112;
const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

export default function RotaryControl({ label, value, enabled, onValueChange, onValueChangeComplete }) {
  const viewRef = useRef(null);
  const originRef = useRef({ x: 0, y: 0 });
  const valueRef = useRef(value);
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({ onValueChange, onValueChangeComplete });
  valueRef.current = value;
  enabledRef.current = enabled;
  callbacksRef.current = { onValueChange, onValueChangeComplete };

  const updateFromPoint = (pageX, pageY) => {
    const x = pageX - originRef.current.x - SIZE / 2;
    const y = pageY - originRef.current.y - SIZE / 2;
    if (Math.hypot(x, y) < 18) return;

    const rawAngle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const normalizedAngle = ((rawAngle + 180 + 360) % 360) - 180;
    const angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, normalizedAngle));
    const nextValue = Math.round(((angle - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE)) * 24 - 12);
    if (nextValue === valueRef.current) return;

    valueRef.current = nextValue;
    callbacksRef.current.onValueChange(nextValue);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabledRef.current,
    onMoveShouldSetPanResponder: () => enabledRef.current,
    onPanResponderGrant: (event) => updateFromPoint(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onPanResponderMove: (event) => updateFromPoint(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onPanResponderRelease: () => callbacksRef.current.onValueChangeComplete(valueRef.current),
    onPanResponderTerminate: () => callbacksRef.current.onValueChangeComplete(valueRef.current),
    onShouldBlockNativeResponder: () => true
  }), []);

  const rotation = `${((value + 12) / 24) * (MAX_ANGLE - MIN_ANGLE) + MIN_ANGLE}deg`;

  function handleAccessibilityAction(event) {
    const adjustment = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const nextValue = Math.max(-12, Math.min(12, valueRef.current + adjustment));
    valueRef.current = nextValue;
    onValueChange(nextValue);
    onValueChangeComplete(nextValue);
  }

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginBottom: 9 }}>{label}</AppText>
      <View
        ref={viewRef}
        onLayout={() => viewRef.current?.measureInWindow((x, y) => { originRef.current = { x, y }; })}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} level`}
        accessibilityValue={{ min: -12, max: 12, now: value, text: `${value > 0 ? '+' : ''}${value} dB` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityState={{ disabled: !enabled }}
        onAccessibilityAction={handleAccessibilityAction}
        style={{ width: SIZE, height: SIZE, opacity: enabled ? 1 : 0.45 }}
      >
        <View pointerEvents="none" style={{ flex: 1, borderRadius: SIZE / 2, borderWidth: 2, borderColor: C.line, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: SIZE - 18, height: SIZE - 18, borderRadius: (SIZE - 18) / 2, borderWidth: 1, borderColor: C.muted, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', transform: [{ rotate: rotation }] }}>
              <View style={{ width: 4, height: 22, borderRadius: 2, marginTop: 7, backgroundColor: C.redBright }} />
            </View>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.line, borderWidth: 1, borderColor: C.muted }} />
          </View>
        </View>
      </View>
      <AppText style={{ color: C.white, fontSize: 13, fontWeight: '700', marginTop: 9 }}>
        {value > 0 ? '+' : ''}{value} dB
      </AppText>
    </View>
  );
}
