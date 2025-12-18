# Admin Panel Database Fixes

This document explains the three critical database issues affecting the admin panel and their solutions.

## Issues Summary

1. **Tutor Assignment Error**: Admins cannot assign or change tutors for enrollments
2. **Gender Constraint Error**: Admins cannot save profiles without selecting a gender
3. **Mobile Unique Constraint Error**: Admins cannot save profiles with empty mobile numbers

## Quick Fix Guide

### Step 1: Fix Tutor Assignment RLS Policies
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `fix_tutor_assignment_rls.sql`
3. Paste and run in SQL Editor

### Step 2: Fix Gender Field Constraint
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `fix_gender_constraint.sql`
3. Paste and run in SQL Editor

### Step 3: Fix Mobile Unique Constraint
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `fix_mobile_unique_constraint.sql`
3. Paste and run in SQL Editor

### Step 4: Test Everything
1. Assign a tutor to an enrollment
2. Update a learner profile without selecting gender or mobile
3. Update a tutor profile without selecting gender or mobile
4. All operations should work without errors

## Detailed Information

### Issue 1: Tutor Assignment Error

**Error Message:**
```
Database configuration issue: Please check the tutor assignments table.
```

**Cause:** RLS policies only check `tbl_users` for admins, but admins are in `tbl_admin_users`.

**Solution:** Created `is_admin_user()` function that checks both tables.

**Details:** See `FIX_TUTOR_ASSIGNMENT_ERROR.md`

---

### Issue 2: Gender Constraint Error

**Error Message:**
```
new row for relation "tbl_user_profiles" violates check constraint "tbl_user_profiles_tup_gender_check"
```

**Cause:** Database constraint doesn't allow NULL or empty strings for gender field.

**Solution:** Updated constraint to allow NULL values and modified code to send NULL instead of empty string.

**Details:** See `FIX_GENDER_CONSTRAINT_ERROR.md`

---

### Issue 3: Mobile Unique Constraint Error

**Error Message:**
```
duplicate key value violates unique constraint "unique_tup_mobile"
Key (tup_mobile)=() already exists.
```

**Cause:** Database has a unique constraint on `tup_mobile` that doesn't allow multiple empty strings or NULL values.

**Solution:** Created a partial unique index that only enforces uniqueness on non-NULL, non-empty mobile numbers. Modified code to send NULL instead of empty string when mobile is not provided.

---

## Files Modified

### Database Scripts (Run These)
- `fix_tutor_assignment_rls.sql` - Updates RLS policies for tutor assignments
- `fix_gender_constraint.sql` - Updates gender field constraint
- `fix_mobile_unique_constraint.sql` - Updates mobile field unique constraint

### Code Changes (Already Applied)
- `src/components/admin/EnrollmentManagement.tsx` - Fixed assignment logic and error handling
- `src/components/admin/TutorManagement.tsx` - Fixed gender and mobile handling in updates/inserts
- `src/components/admin/LearnerManagement.tsx` - Fixed gender and mobile handling in updates/inserts
- `src/components/admin/CustomerManagement.tsx` - Fixed gender and mobile handling in updates

## Verification Checklist

After running all three SQL scripts, verify these work:

- [ ] Assign tutor to enrollment
- [ ] Change assigned tutor
- [ ] Remove assigned tutor
- [ ] Update learner profile (with and without gender)
- [ ] Update learner profile (with and without mobile)
- [ ] Update tutor profile (with and without gender)
- [ ] Update tutor profile (with and without mobile)
- [ ] Update customer profile (with and without gender)
- [ ] Update customer profile (with and without mobile)
- [ ] Create new learner profile
- [ ] Create new tutor profile

## Important Notes

1. **All three SQL scripts must be run** - They are independent but all are needed
2. **No data loss** - These changes only update constraints and policies
3. **Backwards compatible** - Existing data is not affected
4. **Security maintained** - RLS policies still check admin status properly
5. **Optional fields work** - Gender and mobile can now be left empty when saving profiles

## Support

If you encounter any issues after applying these fixes:
1. Check browser console for detailed error messages
2. Verify both SQL scripts ran successfully
3. Refresh the admin panel page
4. Check that you're logged in as an admin user
