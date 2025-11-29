# Slot Design Update - Implementation Guide

## Summary
The slot design for Solo mode tournaments needs to be updated to show large numbered slots in a grid layout, while keeping the original compact design for Duo and Squad modes.

## Current Status
✅ **Home Page Tournament Display** - COMPLETED
- Tournaments now fetch from Firebase and display correctly
- Tournaments appear in correct status tabs (Upcoming, Ongoing, Past)
- Full tournament cards with all details (Entry Fee, Mode, Category, Participants, Date & Time)
- "Browse Tournaments" heading made larger and bolder

## Pending Task
❌ **Slot Design for Solo Mode** - NOT COMPLETED
- The slot design update keeps failing due to file corruption during edits
- Need to implement conditional rendering for tournament slots

## Required Changes

### File: `app/tournaments/[id]/page.tsx`
**Location**: Around line 424-467 (in the participants tab section)

### What Needs to Change:
Replace the current single grid with conditional rendering:

**For Solo Mode (`tournament.mode === "solo"`):**
- Grid: `grid-cols-4 sm:grid-cols-6 md:grid-cols-8`
- Slot button: Large square `h-16 w-16`
- Text: Large number only `text-2xl font-bold`
- Background: Darker `bg-[#1a1a1a]` for empty, `bg-[#2a2a2a]` for taken
- Border: Thicker `border-2`
- Hover effect: `hover:scale-105`
- User indicator: Small avatar badge in top-right corner with Users icon
- No "Slot X" label or username text - just the number

**For Other Modes (Duo/Squad):**
- Keep existing compact design
- Grid: `grid-cols-2 sm:grid-cols-4 md:grid-cols-6`
- Shows "Slot X" label and username/status

### Visual Design Reference
Solo mode slots should look like:
```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  1  │ │  2  │ │  3  │ │  4  │
└─────┘ └─────┘ └─────┘ └─────┘
```

With user indicator:
```
┌─────┐
│  5 ●│  <- Small badge for taken/your slot
└─────┘
```

## Why It Failed
The automated edits kept creating duplicate code or breaking JSX structure. The file needs manual editing or a very careful, small-scope replacement.

## Recommendation
Due to the complexity and repeated failures, this change should be done:
1. Manually in the code editor, OR
2. Using a very small, targeted edit focusing only on the grid div opening tag and button className

## Files Successfully Modified
1. ✅ `app/page.tsx` - Tournament fetching and display
2. ✅ `app/page.tsx` - Browse Tournaments heading size
3. ❌ `app/tournaments/[id]/page.tsx` - Slot design (needs manual fix)
