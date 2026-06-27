import React from 'react';
import { View } from 'react-native';
import SuperAdminHouseDB from './SuperAdminHouseDB';

export default function SuperAdminHouseMain({ embedded = false }: { embedded?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <SuperAdminHouseDB />
    </View>
  );
}
