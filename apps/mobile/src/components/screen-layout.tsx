import React from 'react';
import { useColorScheme, ViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export interface ScreenLayoutProps extends ViewProps {
  children: React.ReactNode;
  /**
   * Safe area edges to respect.
   * Defaults to all edges: ['top', 'bottom', 'left', 'right'].
   * For screens inside bottom tabs, pass ['top', 'left', 'right'].
   */
  edges?: readonly Edge[];
  /**
   * Optional custom background color override (defaults to theme background).
   */
  backgroundColor?: string;
  /**
   * Tailwind CSS classes for styling.
   */
  className?: string;
}

/**
 * Reusable ScreenLayout / AppLayout component providing global Safe Area handling
 * for Android and iOS across all app screens.
 */
export function ScreenLayout({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor,
  className = 'flex-1',
  style,
  ...rest
}: ScreenLayoutProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const bg = backgroundColor || colors.bg;

  return (
    <SafeAreaView
      edges={edges}
      className={className}
      style={[{ backgroundColor: bg }, style]}
      {...rest}>
      {children}
    </SafeAreaView>
  );
}

export const AppLayout = ScreenLayout;
export default ScreenLayout;
