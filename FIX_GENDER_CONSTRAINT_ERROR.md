# Fix: Gender Field Check Constraint Error

## Problem
When admins try to update learner, tutor, or customer profiles without selecting a gender, they receive the error:
```
"new row for relation "tbl_user_profiles" violates check constraint "tbl_user_profiles_tup_gender_check"
```

## Root Cause
The database has a check constraint on the `tup_gender` field that only allows these values:
- `'male'`
- `'female'`
- `'other'`

However, it **does not allow `NULL` or empty strings**. When a profile is updated without selecting a gender, the code sends an empty string (`''`), which violates this constraint.

## Solution

### Part 1: Update Database Constraint (Required)
Run the SQL script in `fix_gender_constraint.sql` to update the check constraint.

**Steps:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file `fix_gender_constraint.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run"

This will:
- Drop the existing constraint
- Add a new constraint that allows `NULL` values: `CHECK (tup_gender IS NULL OR tup_gender IN ('male', 'female', 'other'))`

### Part 2: Code Changes (Already Applied)
Updated all admin management components to send `NULL` instead of empty strings when gender is not selected:

#### Files Updated:
1. **TutorManagement.tsx**
   - Line 680: `tup_gender: editData.gender || null` (update operation)
   - Line 696: `tup_gender: editData.gender || null` (insert operation)

2. **LearnerManagement.tsx**
   - Line 562: `tup_gender: editData.gender || null` (insert operation)
   - Line 578: `tup_gender: editData.gender || null` (update operation)

3. **CustomerManagement.tsx**
   - Line 538: `tup_gender: editData.gender || null` (update operation)

## How It Works
The fix uses JavaScript's logical OR operator (`||`):
- If `editData.gender` has a value ('male', 'female', or 'other'), it sends that value
- If `editData.gender` is empty (`''`) or falsy, it sends `null` instead
- The database now accepts `null` as a valid value

## Testing
After applying the SQL fix, test these scenarios:

1. **Update Tutor Profile**
   - Go to Admin Dashboard → Tutor Management
   - Edit a tutor
   - Leave gender field empty or select a gender
   - Click Save
   - ✅ Should save successfully without errors

2. **Update Learner Profile**
   - Go to Admin Dashboard → Learner Management
   - Edit a learner
   - Leave gender field empty or select a gender
   - Click Save
   - ✅ Should save successfully without errors

3. **Update Customer Profile**
   - Go to Admin Dashboard → Customer Management
   - Edit a customer
   - Leave gender field empty or select a gender
   - Click Save
   - ✅ Should save successfully without errors

## Related Fixes
This fix works together with the tutor assignment fix (`fix_tutor_assignment_rls.sql`). Both SQL scripts should be run to resolve all admin panel issues.

## Technical Details
**Old Constraint:**
```sql
CHECK (tup_gender IN ('male', 'female', 'other'))
```

**New Constraint:**
```sql
CHECK (tup_gender IS NULL OR tup_gender IN ('male', 'female', 'other'))
```

This allows the field to be optional while still validating values when they are provided.
