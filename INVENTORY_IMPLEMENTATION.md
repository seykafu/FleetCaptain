# Inventory Spreadsheet Implementation

## Overview

A spreadsheet-like inventory management interface built with TanStack Table, Supabase, and React. This provides mechanics with an intuitive, Excel-like experience for managing parts inventory.

## Database Schema

The existing `inventory_items` table is used with the following structure:

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  part_number TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note:** The schema uses `garage_id` (UUID reference) rather than a text field, which maintains referential integrity. Garage names are fetched and displayed via joins.

## Files Created/Updated

### 1. `lib/supabaseClient.ts`
- Client-side Supabase client for browser usage
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Typed with the Database interface

### 2. `components/inventory/EditableCell.tsx`
- Reusable editable cell component
- Supports `text`, `number`, and `select` types
- Features:
  - Click to edit
  - Enter to save, Escape to cancel
  - Validation (non-negative numbers, non-empty text)
  - Optimistic UI with error handling
  - Loading states

### 3. `components/inventory/InventoryTable.tsx`
- Main table component using TanStack Table
- Features:
  - Inline editing for all editable fields
  - Add new rows with "+ Add Part" button
  - Delete rows with confirmation
  - Real-time updates via Supabase subscriptions
  - Optimistic updates with error rollback
  - Visual indicators for low stock (red background)
  - Auto-focus and scroll to new rows

### 4. `app/inventory/page.tsx`
- Main inventory page
- Features:
  - Garage filter dropdown
  - Search input with 300ms debounce
  - Integrated with AppShell layout
  - Card wrapper with title and subtitle

## Key Features

### Inline Editing
- **Part Name**: Text input
- **Part Number**: Text input
- **Quantity**: Number input (≥ 0)
- **Reorder Threshold**: Number input (≥ 0)
- **Garage**: Select dropdown (North/South)

### Add/Delete
- **Add**: Creates new row with defaults, scrolls into view, focuses first cell
- **Delete**: Confirmation dialog, optimistic delete with rollback on error

### Real-time Updates
- Supabase channel subscription listens for INSERT/UPDATE/DELETE
- Automatically refreshes table when changes occur
- Works across multiple browser tabs/users

### Validation
- Numbers must be ≥ 0
- Text fields cannot be empty
- Inline error messages on validation failure

### UX Enhancements
- Hover states on editable cells
- Loading indicators during saves
- Error messages with rollback
- Low stock highlighting (red background)
- Responsive design (works on laptop and tablet)

## Styling

- Background: `#F7FAFD` (very light blue)
- Card: White with `rounded-xl`, `border-borderLight`, `shadow-sm`
- Table header: `bg-[#F9FBFF]` (light tint)
- Hover: `hover:bg-slate-50` on rows
- Editable cells: Blue border on focus, hover background

## Dependencies

- `@tanstack/react-table`: Table library
- `@supabase/supabase-js`: Database client
- `@heroicons/react`: Icons (TrashIcon)

## Usage

1. Navigate to `/inventory`
2. Use filters to narrow down items
3. Click any editable cell to edit
4. Press Enter to save or Escape to cancel
5. Click "+ Add Part" to create new items
6. Click trash icon to delete items

## Assumptions Made

1. **Schema**: Used existing `inventory_items` table with `garage_id` (UUID) rather than text field
2. **Garages**: Fetches garages separately and maps them to items for display
3. **Real-time**: Uses Supabase subscriptions for multi-user sync
4. **Optimistic Updates**: All mutations use optimistic UI with error rollback
5. **Validation**: Client-side validation before saving
6. **Error Handling**: Non-intrusive error messages with automatic rollback

## Future Enhancements

- Bulk operations (select multiple rows)
- Export to CSV
- Sortable columns
- Pagination for large datasets
- Undo/redo functionality
- Keyboard shortcuts (e.g., Tab to next cell)

