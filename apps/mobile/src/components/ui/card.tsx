import React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false, style, ...props }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      className={`rounded-[16px] border ${noPadding ? 'p-0' : 'p-3.5'} ${className}`}
      style={[
        {
          backgroundColor: colors.surf,
          borderColor: colors.bd,
          shadowColor: '#0E2748',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          elevation: 2,
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}
