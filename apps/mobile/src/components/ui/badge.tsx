import React from 'react';
import { View, Text } from 'react-native';
import { StatusColors, PriorityColors, TaskTypeMap } from '@/constants/theme';

interface StatusBadgeProps {
  status: keyof typeof StatusColors | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedKey = status
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) as keyof typeof StatusColors;
  const config = StatusColors[normalizedKey] || { c: '#64748B', bg: 'rgba(100,116,139,.15)' };

  return (
    <View
      className="px-[9px] py-[4px] rounded-full flex-row items-center"
      style={{ backgroundColor: config.bg }}>
      <Text
        className="text-[10px] font-extrabold tracking-[0.3px]"
        style={{ color: config.c }}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

interface PriorityBadgeProps {
  priority: keyof typeof PriorityColors | string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const normalizedKey = priority
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) as keyof typeof PriorityColors;
  const config = PriorityColors[normalizedKey] || { c: '#64748B', bg: 'rgba(100,116,139,.14)' };

  return (
    <View
      className="px-[9px] py-[4px] rounded-full flex-row items-center"
      style={{ backgroundColor: config.bg }}>
      <Text
        className="text-[10px] font-extrabold tracking-[0.3px]"
        style={{ color: config.c }}>
        {priority.toUpperCase()}
      </Text>
    </View>
  );
}

interface TypeGlyphBadgeProps {
  type: string;
  size?: number;
}

export function TypeGlyphBadge({ type, size = 40 }: TypeGlyphBadgeProps) {
  const config = TaskTypeMap[type] || { g: 'TK', c: '#3F6FA8', bg: 'rgba(63,111,168,.12)' };

  return (
    <View
      className="rounded-[12px] items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: config.bg,
      }}>
      <Text
        className="font-extrabold text-[15px]"
        style={{ color: config.c }}>
        {config.g}
      </Text>
    </View>
  );
}
