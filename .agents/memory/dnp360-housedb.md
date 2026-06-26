---
name: DNP360 House DB Module
description: Architecture decisions for the Super Admin House DB combined tab (3 inner tabs).
---

# Super Admin House DB Module

## What was built
`SuperAdminHouseMain` renders 3 inner tabs via an absolutely-positioned inner tab bar sitting at `bottom: 62` (just above the main app tab bar at height 60px):
- **House DB** (`SuperAdminHouseDB`) — Ward → Group → House drill-down with expandable rows, add/edit/delete modals
- **Import** (`SuperAdminImport`) — CSV paste, preview, validation, history
- **Groups** (`SuperAdminGroups`) — Multi-select houses, assign/remove group

## Key layout rules
- Inner tab bar: `position: absolute, bottom: 62, zIndex: 10`
- Sub-screen ScrollViews: `paddingBottom: 170` (clears both inner + main tab bars)
- FAB in HouseDB: `position: absolute, bottom: 125, right: 20`
- Sub-screens use `SafeAreaView edges={['top']}` only

## Routing
- `secondary.tsx` dispatches to `SuperAdminHouseMain` when `user.role === 'admin' && user.isSuperAdmin`
- `_layout.tsx` overrides `secondary` tab to `{ icon: 'database', label: 'House DB' }` for superAdmin

## Storage
- STORAGE_VERSION stays at `'5'` — new `groups` and `importHistory` collections seed from empty arrays, no data wipe for existing users
- `House` type extended with optional fields (`groupId`, `groupName`, `fatherOrHusband`, `propertyType`, `status`, `createdBy`, `createdAt`, `updatedAt`)

**Why:** Keeping version '5' avoids clearing existing user data. New optional fields on `House` are backward-compatible.
