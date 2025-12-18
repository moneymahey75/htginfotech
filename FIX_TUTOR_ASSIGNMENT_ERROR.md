# Fix: Tutor Assignment Foreign Key Constraint Error

## Problem
When admins try to change or assign tutors to enrollments, they receive the error:
> "Database configuration issue: Please check the tutor assignments table."

## Root Cause
The error occurs because the Row Level Security (RLS) policies on the `tbl_tutor_assignments` table only check for admins in the `tbl_users` table with `tu_user_type = 'admin'`. However, admins are stored in the `tbl_admin_users` table, not in `tbl_users`.

When an admin tries to insert or update a tutor assignment, the RLS policy blocks the operation because it cannot find their user ID in `tbl_users` with the admin user type.

## Solution
Run the SQL script in `fix_tutor_assignment_rls.sql` to update the RLS policies. This script:

1. Creates a helper function `is_admin_user()` that checks both tables:
   - `tbl_users` (for regular admin users)
   - `tbl_admin_users` (for admin panel users)

2. Updates all RLS policies to use this helper function

3. Adds proper policies for all operations (SELECT, INSERT, UPDATE, DELETE)

## How to Apply the Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Click "New Query"

### Step 2: Run the SQL Script
1. Open the file `fix_tutor_assignment_rls.sql`
2. Copy all the contents
3. Paste into the Supabase SQL Editor
4. Click "Run"

### Step 3: Verify the Fix
1. Log in to your admin panel
2. Go to Enrollment Management
3. Try to assign or change a tutor
4. The operation should now work without errors

## What Changed in the Code

### EnrollmentManagement Component
- Added detailed console logging for debugging
- Set `tta_assigned_by` to `null` (since admin tracking is optional)
- Improved error messages to show the actual database error
- Added change detection to show appropriate modal title

## Testing
After applying the fix, test the following scenarios:
1. ✅ Assign a tutor to a new enrollment
2. ✅ Change an assigned tutor to a different tutor
3. ✅ Remove an assigned tutor
4. ✅ View tutor names with their specializations in the dropdown

## Notes
- The fix maintains security by still checking admin status
- Both regular admins and admin panel users can now manage assignments
- The `tta_assigned_by` field is now nullable, so it can be NULL if admin tracking is not needed
