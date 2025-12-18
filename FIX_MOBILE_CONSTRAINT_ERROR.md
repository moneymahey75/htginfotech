# Fix: Mobile Field Unique Constraint Error

## Problem
When admins try to update learner, tutor, or customer profiles without entering a mobile number, they receive the error:
```
duplicate key value violates unique constraint "unique_tup_mobile"
Key (tup_mobile)=() already exists.
```

## Root Cause
The database has a unique constraint on the `tup_mobile` field. This constraint was designed to ensure each mobile number is unique across all users. However, the constraint doesn't properly handle empty or NULL values:

- When a mobile field is left empty, the code sends an empty string (`''`)
- Multiple empty strings (`''`) violate the unique constraint
- The database thinks you're trying to use the same "mobile number" (empty string) for multiple users

## Why This Matters
In SQL databases:
- **NULL values don't violate unique constraints** - Multiple rows can have NULL in a unique column
- **Empty strings DO violate unique constraints** - Empty string is treated as a value, not as "no value"

This is why we need to:
1. Send NULL instead of empty strings from the code
2. Use a partial unique index that only applies to actual mobile numbers

## Solution

### Part 1: Update Database Constraint (Required)
Run the SQL script in `fix_mobile_unique_constraint.sql` to update the unique constraint.

**Steps:**
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file `fix_mobile_unique_constraint.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click "Run"

This will:
- Drop the old unique constraint on `tup_mobile`
- Create a new partial unique index that only applies when `tup_mobile IS NOT NULL AND tup_mobile != ''`
- Allow multiple users to have NULL or empty mobile numbers
- Still ensure that actual mobile numbers remain unique

### Part 2: Code Changes (Already Applied)
Updated all admin management components to send `NULL` instead of empty strings when mobile is not provided:

#### Files Updated:
1. **TutorManagement.tsx**
   - Line 679: `tup_mobile: editData.mobile || null` (update operation)
   - Line 695: `tup_mobile: editData.mobile || null` (insert operation)

2. **LearnerManagement.tsx**
   - Line 561: `tup_mobile: editData.mobile || null` (insert operation)
   - Line 577: `tup_mobile: editData.mobile || null` (update operation)

3. **CustomerManagement.tsx**
   - Line 537: `tup_mobile: editData.mobile || null` (update operation)

## How It Works

### The Code Fix
The fix uses JavaScript's logical OR operator (`||`):
```javascript
tup_mobile: editData.mobile || null
```

- If `editData.mobile` has a value (e.g., "1234567890"), it sends that value
- If `editData.mobile` is empty (`''`) or falsy, it sends `null` instead

### The Database Fix
The partial unique index:
```sql
CREATE UNIQUE INDEX tbl_user_profiles_tup_mobile_unique_idx
ON tbl_user_profiles (tup_mobile)
WHERE tup_mobile IS NOT NULL AND tup_mobile != '';
```

This means:
- The unique constraint only applies when mobile is NOT NULL and NOT empty
- Multiple users can have NULL mobile numbers
- Multiple users can have empty mobile numbers
- But if two users try to use the same actual mobile number (e.g., "1234567890"), the second one will be rejected

## Testing
After applying the SQL fix, test these scenarios:

### 1. Update Learner Profile Without Mobile
   - Go to Admin Dashboard → Learner Management
   - Edit a learner
   - Leave mobile field empty
   - Click Save
   - ✅ Should save successfully without errors

### 2. Update Tutor Profile Without Mobile
   - Go to Admin Dashboard → Tutor Management
   - Edit a tutor
   - Leave mobile field empty
   - Click Save
   - ✅ Should save successfully without errors

### 3. Multiple Users Without Mobile
   - Update 3 different users, leaving mobile empty for all
   - ✅ All should save successfully

### 4. Duplicate Mobile Number (Should Fail)
   - Update user A with mobile "1234567890"
   - Try to update user B with the same mobile "1234567890"
   - ❌ Should show an error (this is correct - prevents duplicate mobile numbers)

### 5. Same User Can Keep Their Mobile
   - Update user A with mobile "1234567890"
   - Update user A again (changing other fields but keeping mobile)
   - ✅ Should save successfully

## Related Fixes
This fix works together with:
- `fix_tutor_assignment_rls.sql` - Fixes tutor assignment error
- `fix_gender_constraint.sql` - Fixes gender field error

All three SQL scripts should be run to resolve all admin panel issues.

## Technical Details

### Old Approach (Problematic)
**Constraint Type:** UNIQUE constraint on entire column
```sql
ALTER TABLE tbl_user_profiles ADD CONSTRAINT unique_tup_mobile UNIQUE (tup_mobile);
```

**Problem:**
- Empty strings are treated as values
- Multiple empty strings violate uniqueness
- NULL might or might not be allowed depending on implementation

### New Approach (Fixed)
**Constraint Type:** Partial unique index with condition
```sql
CREATE UNIQUE INDEX tbl_user_profiles_tup_mobile_unique_idx
ON tbl_user_profiles (tup_mobile)
WHERE tup_mobile IS NOT NULL AND tup_mobile != '';
```

**Benefits:**
- Only enforces uniqueness on actual mobile numbers
- Allows unlimited NULL values
- Allows unlimited empty strings (though code now sends NULL instead)
- More flexible and follows database best practices

## Common Questions

### Q: Why not just remove the unique constraint entirely?
**A:** Mobile numbers should be unique when provided. This ensures data integrity and prevents issues like:
- Two users accidentally using the same mobile for 2FA
- Confusion when searching users by mobile
- SMS being sent to the wrong person

### Q: What if I want to prevent empty strings too?
**A:** The code now sends `NULL` instead of empty strings, so this shouldn't happen. But if needed, you could add a CHECK constraint:
```sql
ALTER TABLE tbl_user_profiles ADD CONSTRAINT check_mobile_not_empty
CHECK (tup_mobile IS NULL OR tup_mobile != '');
```

### Q: Will this affect existing data?
**A:** No. The fix only changes how new and updated records are handled. Existing records remain unchanged.

## Summary
The mobile field can now be left empty when saving profiles. The database properly handles NULL values while still ensuring that actual mobile numbers remain unique across all users.
