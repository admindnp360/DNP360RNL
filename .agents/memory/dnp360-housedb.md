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

## Cross-ward Groups (added)
- `Group.wardId` and `Group.wardNumber` are now **optional** — groups are global and can contain houses from multiple wards.
- `wardGroups` in both `SuperAdminHouseDB` and `SuperAdminGroups` is now `groups` (all), not filtered by `selectedWard.id`.
- `houseList` in HouseDB: when a group is selected, shows ALL houses in that group (any ward); when no group, filters by ward.
- `wardHouses` in SuperAdminGroups: when `selectedGroupFilter` active, shows all houses with that `groupId` (any ward).
- `assignableGroups` in SuperAdminGroups: all groups minus current filter (not ward-scoped).
- **Add Ward** button on Wards view opens a modal (wardNumber, name, area); calls `addWard` from AppContext.
- **Add Group** button on Wards view creates a cross-ward group (no wardId stored).

**Why:** Real municipal groups (mohalla/locality) often span ward boundaries. Removing the ward constraint from Group makes assignment flexible.
