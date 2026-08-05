import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui/icon';

export interface CustomBottomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomBottomTabBar({ state, descriptors, navigation }: CustomBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const tabConfig: Record<string, { label: string; icon: IconName; badge?: number }> = {
    index: { label: 'Dashboard', icon: 'home' },
    tasks: { label: 'Tasks', icon: 'task', badge: 5 },
    settlement: { label: 'Settlement', icon: 'settlement' },
    profile: { label: 'Profile', icon: 'user' },
  };

  const bottomPadding = insets.bottom > 0 ? insets.bottom + 4 : 12;

  return (
    <View
      className="flex-row items-center border-t backdrop-blur-md pt-2 px-2"
      style={{
        paddingBottom: bottomPadding,
        backgroundColor: colors.navbg,
        borderColor: colors.bd,
      }}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = tabConfig[route.name] || {
          label: options?.title || route.name,
          icon: 'home' as IconName,
        };

        const activeColor = colors.pri;
        const inactiveColor = colorScheme === 'dark' ? '#6E82A3' : '#8593A8';
        const color = isFocused ? activeColor : inactiveColor;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.7}
            onPress={onPress}
            className="flex-1 items-center justify-center py-1.5 relative">
            <Icon name={config.icon} size={20} color={color} />
            <Text
              className="text-[9.5px] font-extrabold mt-1"
              style={{ color }}>
              {config.label}
            </Text>

            {config.badge !== undefined && config.badge > 0 && (
              <View className="absolute top-[2px] right-[20px] min-w-[16px] h-[16px] rounded-full bg-[#EF4444] items-center justify-center px-1">
                <Text className="text-white text-[9px] font-extrabold">{config.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
