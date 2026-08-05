import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  if (!visible || !message) return null;

  return (
    <View
      className="absolute bottom-[104px] self-center z-50 px-[18px] py-[11px] rounded-full items-center justify-center shadow-lg"
      style={{
        backgroundColor: colors.navy,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 26,
        elevation: 6,
      }}>
      <Text className="text-white text-[12px] font-bold text-center">
        {message}
      </Text>
    </View>
  );
}
