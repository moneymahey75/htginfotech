/*
  # Enrollment Notifications and Tutor Assignment System

  ## New Tables
  
  ### 1. `tbl_notifications`
  Stores all system notifications for admins
  - `tn_id` (uuid, primary key)
  - `tn_user_id` (uuid, foreign key to tbl_users) - Admin who receives notification
  - `tn_type` (text) - Type of notification (enrollment, payment, etc)
  - `tn_title` (text) - Notification title
  - `tn_message` (text) - Notification message
  - `tn_reference_id` (uuid) - Reference to related entity (enrollment_id, payment_id, etc)
  - `tn_reference_type` (text) - Type of referenced entity (enrollment, payment, etc)
  - `tn_is_read` (boolean) - Read status
  - `tn_created_at` (timestamptz) - Creation timestamp
  - `tn_read_at` (timestamptz) - When notification was read

  ### 2. `tbl_tutor_assignments`
  Tracks tutor assignments to learners for specific courses
  - `tta_id` (uuid, primary key)
  - `tta_enrollment_id` (uuid, foreign key to tbl_course_enrollments)
  - `tta_tutor_id` (uuid, foreign key to tbl_users) - Assigned tutor
  - `tta_assigned_by` (uuid, foreign key to tbl_users) - Admin who made assignment
  - `tta_assigned_at` (timestamptz) - Assignment timestamp
  - `tta_notes` (text) - Assignment notes
  - `tta_is_active` (boolean) - Active status

  ## Changes to Existing Tables
  - Add `tce_tutor_assigned` boolean to tbl_course_enrollments
  - Add `tce_tutor_assigned_at` timestamp to tbl_course_enrollments

  ## Security
  - Enable RLS on all new tables
  - Add policies for admins to manage notifications and assignments
  - Add policies for tutors to view their assignments
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS tbl_notifications (
  tn_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tn_user_id uuid REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tn_type text NOT NULL,
  tn_title text NOT NULL,
  tn_message text NOT NULL,
  tn_reference_id uuid,
  tn_reference_type text,
  tn_is_read boolean DEFAULT false,
  tn_created_at timestamptz DEFAULT now(),
  tn_read_at timestamptz
);

-- Create tutor assignments table
CREATE TABLE IF NOT EXISTS tbl_tutor_assignments (
  tta_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tta_enrollment_id uuid REFERENCES tbl_course_enrollments(tce_id) ON DELETE CASCADE,
  tta_tutor_id uuid REFERENCES tbl_users(tu_id) ON DELETE CASCADE,
  tta_assigned_by uuid REFERENCES tbl_users(tu_id) ON DELETE SET NULL,
  tta_assigned_at timestamptz DEFAULT now(),
  tta_notes text,
  tta_is_active boolean DEFAULT true
);

-- Add tutor assignment tracking to enrollments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_course_enrollments' AND column_name = 'tce_tutor_assigned'
  ) THEN
    ALTER TABLE tbl_course_enrollments ADD COLUMN tce_tutor_assigned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tbl_course_enrollments' AND column_name = 'tce_tutor_assigned_at'
  ) THEN
    ALTER TABLE tbl_course_enrollments ADD COLUMN tce_tutor_assigned_at timestamptz;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON tbl_notifications(tn_user_id, tn_is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON tbl_notifications(tn_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_assignments_enrollment ON tbl_tutor_assignments(tta_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_tutor_assignments_tutor ON tbl_tutor_assignments(tta_tutor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tutor_assigned ON tbl_course_enrollments(tce_tutor_assigned);

-- Enable RLS
ALTER TABLE tbl_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_tutor_assignments ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Admins can view all notifications"
  ON tbl_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  );

CREATE POLICY "Users can view their own notifications"
  ON tbl_notifications FOR SELECT
  TO authenticated
  USING (tn_user_id = auth.uid());

CREATE POLICY "Service role can create notifications"
  ON tbl_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON tbl_notifications FOR UPDATE
  TO authenticated
  USING (tn_user_id = auth.uid())
  WITH CHECK (tn_user_id = auth.uid());

-- Tutor assignments policies
CREATE POLICY "Admins can view all tutor assignments"
  ON tbl_tutor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  );

CREATE POLICY "Tutors can view their assignments"
  ON tbl_tutor_assignments FOR SELECT
  TO authenticated
  USING (
    tta_tutor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  );

CREATE POLICY "Admins can create tutor assignments"
  ON tbl_tutor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update tutor assignments"
  ON tbl_tutor_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_users
      WHERE tbl_users.tu_id = auth.uid()
      AND tbl_users.tu_user_type = 'admin'
    )
  );

-- Function to create notification for all admins
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type text,
  p_title text,
  p_message text,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO tbl_notifications (tn_user_id, tn_type, tn_title, tn_message, tn_reference_id, tn_reference_type)
  SELECT tu_id, p_type, p_title, p_message, p_reference_id, p_reference_type
  FROM tbl_users
  WHERE tu_user_type = 'admin' AND tu_is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;