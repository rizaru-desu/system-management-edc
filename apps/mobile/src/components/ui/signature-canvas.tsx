import React, { useMemo, useState } from 'react';
import { View, Text, PanResponder, useColorScheme } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';

export interface SignatureCanvasProps {
  onSignatureChange?: (hasSignature: boolean) => void;
  placeholder?: string;
}

export function SignatureCanvas({
  onSignatureChange,
  placeholder = '✍ Sign here',
}: SignatureCanvasProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const newPoint = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrentPath(newPoint);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
          if (paths.length === 0 && !currentPath) {
            onSignatureChange?.(true);
          }
        },
        onPanResponderRelease: () => {
          if (currentPath) {
            setPaths((prev) => {
              const updated = [...prev, currentPath];
              if (updated.length > 0) onSignatureChange?.(true);
              return updated;
            });
            setCurrentPath('');
          }
        },
      }),
    [currentPath, onSignatureChange, paths.length]
  );

  const isEmpty = paths.length === 0 && !currentPath;

  return (
    <View className="relative">
      <View
        {...panResponder.panHandlers}
        className="w-full h-[130px] rounded-[13px] border-[1.5px] border-dashed overflow-hidden justify-center items-center"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.bd,
        }}>
        <Svg className="w-full h-full absolute inset-0">
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p}
              stroke={colorScheme === 'dark' ? '#cfe0f5' : '#1B3A63'}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={colorScheme === 'dark' ? '#cfe0f5' : '#1B3A63'}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>

        {isEmpty && (
          <Text className="text-[11px] font-semibold pointer-events-none" style={{ color: colors.tx3 }}>
            {placeholder}
          </Text>
        )}
      </View>
    </View>
  );
}
