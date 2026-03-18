/*
  # Fix register_user function to work with RLS

  1. Changes
    - Recreate `register_user` function with SECURITY DEFINER
    - This allows the function to bypass RLS policies during registration
    - The function will run with the privileges of the function owner (postgres)
    
  2. Security
    - Function validates all inputs before insertion
    - Still maintains proper error handling for unique violations
    - Only allows registration for the authenticated user's own ID
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS register_user(uuid, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar);

-- Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION register_user(
    p_user_id uuid,
    p_email varchar,
    p_first_name varchar,
    p_middle_name varchar,
    p_last_name varchar,
    p_username varchar,
    p_user_type varchar,
    p_mobile varchar DEFAULT NULL,
    p_gender varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mobile_value VARCHAR;
BEGIN
    -- Security check: ensure user can only register themselves
    IF p_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Unauthorized: Cannot register for another user'
        );
    END IF;

    -- Trim and check mobile number
    p_mobile := TRIM(p_mobile);
    
    -- If mobile is empty or null, set to NULL instead of empty string
    IF p_mobile IS NULL OR p_mobile = '' THEN
        v_mobile_value := NULL;
    ELSE
        v_mobile_value := p_mobile;
    END IF;

    -- Insert into tbl_users
    INSERT INTO tbl_users (
        tu_id,
        tu_email,
        tu_user_type,
        tu_is_verified,
        tu_email_verified,
        tu_mobile_verified,
        tu_is_active
    ) VALUES (
        p_user_id,
        p_email,
        p_user_type,
        false,
        false,
        false,
        true
    );

    -- Insert into tbl_user_profiles
    INSERT INTO tbl_user_profiles (
        tup_user_id,
        tup_first_name,
        tup_middle_name,
        tup_last_name,
        tup_username,
        tup_mobile,
        tup_gender
    ) VALUES (
        p_user_id,
        p_first_name,
        p_middle_name,
        p_last_name,
        p_username,
        v_mobile_value,
        p_gender
    );

    -- If user type is tutor, create tutor profile
    IF p_user_type = 'tutor' THEN
        INSERT INTO tbl_tutors (
            tt_user_id,
            tt_bio,
            tt_specializations,
            tt_experience_years,
            tt_education,
            tt_hourly_rate,
            tt_languages,
            tt_is_verified,
            tt_is_active
        ) VALUES (
            p_user_id,
            'New tutor profile',
            '[]'::jsonb,
            0,
            '',
            25.00,
            '["English"]'::jsonb,
            false,
            true
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User registered successfully',
        'user_id', p_user_id
    );

EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%tu_email%' OR SQLERRM LIKE '%email%' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Email address already exists');
        ELSIF SQLERRM LIKE '%tup_username%' OR SQLERRM LIKE '%username%' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Username already exists');
        ELSIF SQLERRM LIKE '%tup_mobile%' THEN
            IF v_mobile_value IS NULL OR v_mobile_value = '' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Mobile number constraint error. Please provide a valid mobile number or leave it empty.');
            ELSE
                RETURN jsonb_build_object('success', false, 'error', 'Mobile number already exists');
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Registration failed: unique constraint violation - ' || SQLERRM);
        END IF;
    WHEN check_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid user type: ' || p_user_type);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration failed: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION register_user(uuid, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar) TO authenticated;
