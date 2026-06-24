UPDATE public.tbl_course_enrollments
SET tce_is_active = true
WHERE tce_is_active IS NULL;

ALTER TABLE public.tbl_course_enrollments
ALTER COLUMN tce_is_active SET DEFAULT true;
