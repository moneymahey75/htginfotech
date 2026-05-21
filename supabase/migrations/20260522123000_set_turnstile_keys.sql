INSERT INTO tbl_system_settings (tss_setting_key, tss_setting_value, tss_description)
VALUES
  ('cloudflare_turnstile_site_key', '"0x4AAAAAADT6bDikZAeGgu1T"', 'Cloudflare Turnstile site key'),
  ('cloudflare_turnstile_secret_key', '"0x4AAAAAADT6bNpgU2My1CdKFaVzr0wYG_Q"', 'Cloudflare Turnstile secret key')
ON CONFLICT (tss_setting_key) DO UPDATE
SET
  tss_setting_value = EXCLUDED.tss_setting_value,
  tss_description = EXCLUDED.tss_description,
  tss_updated_at = now();
