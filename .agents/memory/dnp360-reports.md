---
name: DNP360 Reports & Collection tracking
description: Collection attendance reports (P/N/L) derived from HouseVisit data; Reports tab in AdminManagement.
---

## Collection status derivation
- P = HouseVisit exists for that day with collectedGarbage: true (and isLate: false/undefined)
- L = HouseVisit exists with collectedGarbage: true AND isLate: true
- N = No visit OR collectedGarbage: false
- `isLate?: boolean` added to HouseVisit type in types/index.ts

## Report generation (AdminReports.tsx)
- Monthly: full day-by-day grid (columns 1–28/29/30/31)
- Quarterly: days encoded as month*100 + day (e.g. day 15 of month 2 = key 215)
- Yearly: summary only (no per-day grid), shows P/N/L totals across the year
- Auto-generate: checks on tab open if today = last day of month AND IST time ≥ 21:00

## CSV export
- Uses expo-file-system/legacy + expo-sharing
- Columns: S.No, House Reg No, Ward No, day cols, P, N, L, %

## Tab placement
- AdminManagement.tsx Tab type extended to include 'reports'
- Reports tab key: 'reports', icon: 'bar-chart-2', color: '#FBBF24'

**Why:** Reports computed client-side from existing houseVisits context — no additional Firestore reads needed (saves credits).
