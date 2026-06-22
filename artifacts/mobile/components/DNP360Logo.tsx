import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const SIZES = { sm: 56, md: 80, lg: 112 };

export function DNP360Logo({ size = 'md' }: Props) {
  const dim = SIZES[size];
  return (
    <View style={[styles.wrap, { width: dim, height: dim }]}>
      <Image
        source={require('@/assets/images/dnp360-logo.png')}
        style={{ width: dim, height: dim }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
});
