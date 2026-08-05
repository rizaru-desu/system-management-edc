import React from 'react';
import { View, TextInput, TextInputProps, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  height?: number;
}

export function Input({
  leftIcon,
  rightIcon,
  containerClassName = '',
  height = 50,
  style,
  placeholderTextColor,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      className={`flex-row items-center px-3.5 rounded-[14px] border ${containerClassName}`}
      style={{
        height,
        backgroundColor: colors.surf,
        borderColor: colors.bd,
      }}>
      {leftIcon && <View className="mr-2.5">{leftIcon}</View>}
      <TextInput
        className="flex-1 font-semibold text-[14px] p-0"
        style={[
          {
            color: colors.tx,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor || colors.tx3}
        {...props}
      />
      {rightIcon && <View className="ml-2.5">{rightIcon}</View>}
    </View>
  );
}
