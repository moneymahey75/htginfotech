INSERT INTO tbl_system_settings (tss_setting_key, tss_setting_value, tss_description)
VALUES
  ('maintenance_mode_enabled', 'false'::jsonb, 'Enable or disable frontend maintenance mode'),
  ('maintenance_notify_from_at', '""'::jsonb, 'When frontend users should start seeing upcoming maintenance notice'),
  ('maintenance_start_at', '""'::jsonb, 'When maintenance mode should begin'),
  ('maintenance_end_at', '""'::jsonb, 'When maintenance mode should automatically end'),
  ('maintenance_allowed_ips', '[]'::jsonb, 'IP addresses allowed to bypass maintenance mode')
ON CONFLICT (tss_setting_key) DO NOTHING;
