import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  children?: React.ReactNode;
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'chip' | 'icon' | 'danger';
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Button({
  children,
  title,
  variant = 'primary',
  active = false,
  size = 'md',
  className = '',
  style,
  disabled,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  if (variant === 'chip') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        className={`h-8 px-[13px] rounded-full items-center justify-center border ${className}`}
        style={[
          {
            backgroundColor: active ? colors.pri : colors.surf,
            borderColor: active ? 'transparent' : colors.bd,
          },
          style,
        ]}
        {...props}>
        <Text
          className="text-[11.5px] font-bold"
          style={{ color: active ? '#FFFFFF' : colors.tx2 }}>
          {title || children}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'icon') {
    const dim = size === 'sm' ? 30 : size === 'lg' ? 52 : 40;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        className={`rounded-[13px] items-center justify-center border ${className}`}
        style={[
          {
            width: dim,
            height: dim,
            backgroundColor: colors.surf,
            borderColor: colors.bd,
          },
          style,
        ]}
        {...props}>
        {children}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        className={`h-[50px] rounded-[14px] items-center justify-center flex-row border ${className}`}
        style={[
          {
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          },
          style,
        ]}
        {...props}>
        {typeof children === 'string' || title ? (
          <Text className="text-[#EF4444] text-[13.5px] font-extrabold">{title || children}</Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary' || variant === 'outline') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        className={`h-[50px] rounded-[14px] items-center justify-center flex-row border ${className}`}
        style={[
          {
            backgroundColor: colors.surf,
            borderColor: colors.bd,
          },
          style,
        ]}
        {...props}>
        {typeof children === 'string' || title ? (
          <Text className="text-[13.5px] font-extrabold" style={{ color: colors.tx }}>
            {title || children}
          </Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }

  // Primary Gradient-styled button
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      className={`h-[52px] rounded-[14px] items-center justify-center flex-row px-4 ${className}`}
      style={[
        {
          backgroundColor: colors.pri,
          opacity: disabled ? 0.6 : 1,
          shadowColor: colors.pri,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          elevation: 4,
        },
        style,
      ]}
      {...props}>
      {typeof children === 'string' || title ? (
        <Text className="text-white text-[15px] font-extrabold tracking-[0.2px]">
          {title || children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
