CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS content_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_management_key
  ON content_management(key);

CREATE OR REPLACE FUNCTION update_content_management_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_management_updated_at ON content_management;
CREATE TRIGGER trg_content_management_updated_at
  BEFORE UPDATE ON content_management
  FOR EACH ROW
  EXECUTE FUNCTION update_content_management_updated_at();

ALTER TABLE content_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read content management" ON content_management;
CREATE POLICY "Anyone can read content management"
  ON content_management
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage content management" ON content_management;
CREATE POLICY "Service role can manage content management"
  ON content_management
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO content_management (key, title, content)
VALUES
  ('contact_us', 'Contact Us', $html$
    <p>We are here to help you succeed. Send us a message and our support team will respond as soon as possible.</p>
    <h2>Before You Contact Us</h2>
    <ul>
      <li>Include your account details if your inquiry is related to an existing profile.</li>
      <li>Describe the issue clearly and include any relevant screenshots or error messages.</li>
      <li>For partnership or consultation requests, share your preferred contact time.</li>
    </ul>
  $html$),
  ('about_us', 'About Us', $html$
    <h2>About HTG Infotech</h2>
    <p>HTG Infotech connects learners, tutors, job seekers, and job providers through one platform built for growth, opportunity, and practical skill development.</p>
    <h3>Our Mission</h3>
    <p>We help people learn, teach, build careers, and create opportunities with transparent digital tools and accessible support.</p>
    <h3>Our Values</h3>
    <ul>
      <li>Transparency in how the platform works.</li>
      <li>Integrity in our relationships with users and partners.</li>
      <li>Community-focused growth for learners, tutors, and employers.</li>
      <li>Continuous improvement through technology and feedback.</li>
    </ul>
  $html$),
  ('faq', 'FAQ', $html$
    <h2>Frequently Asked Questions</h2>
    <h3>What is HTG Infotech?</h3>
    <p>HTG Infotech is a platform for learning, teaching, job seeking, and hiring. It brings education and opportunity tools into one place.</p>
    <h3>How do I create an account?</h3>
    <p>Choose the registration option that matches your role, complete the form, verify your details, and sign in to your dashboard.</p>
    <h3>What payment methods are supported?</h3>
    <p>Supported payment options may vary by service. Available options are shown during checkout.</p>
    <h3>How can I contact support?</h3>
    <p>Use the Contact Us page with your name, email address, subject, and message.</p>
  $html$),
  ('privacy_policy', 'Privacy Policy', $html$
    <h2>Privacy Policy</h2>
    <p>This policy explains how HTG Infotech collects, uses, and protects information when users access our platform.</p>
    <h3>Information We Collect</h3>
    <ul>
      <li>Account information such as name, email address, and phone number.</li>
      <li>Profile, learning, teaching, job, or business information submitted by users.</li>
      <li>Usage, device, and session information used to maintain security and improve services.</li>
    </ul>
    <h3>How We Use Information</h3>
    <p>We use information to provide services, manage accounts, process transactions, improve the platform, communicate with users, and comply with legal obligations.</p>
  $html$),
  ('terms_of_service', 'Terms of Service', $html$
    <h2>Terms of Service</h2>
    <p>By accessing or using HTG Infotech, you agree to follow these terms and all applicable laws.</p>
    <h3>User Accounts</h3>
    <ul>
      <li>Provide accurate and complete information during registration.</li>
      <li>Keep your login credentials secure.</li>
      <li>Notify us immediately if you suspect unauthorized account access.</li>
    </ul>
    <h3>Prohibited Activities</h3>
    <p>Users must not misuse the platform, create fraudulent accounts, submit misleading information, spam other users, or violate applicable laws.</p>
  $html$),
  ('security_policy', 'Security Policy', $html$
    <h2>Security Policy</h2>
    <p>We are committed to protecting user data and maintaining a secure platform experience.</p>
    <h3>Security Measures</h3>
    <ul>
      <li>Encrypted transmission for sensitive data.</li>
      <li>Access controls for administrative tools and private user information.</li>
      <li>Monitoring and review of suspicious activity.</li>
    </ul>
    <h3>User Best Practices</h3>
    <p>Use strong passwords, keep your contact information current, and report suspicious activity promptly.</p>
  $html$),
  ('refund_policy', 'Refund Policy', $html$
    <h2>Refund Policy</h2>
    <p>Refund eligibility depends on the purchased service, usage, payment status, and applicable terms at the time of purchase.</p>
    <h3>Refund Requests</h3>
    <ul>
      <li>Submit refund requests through support with your order or account details.</li>
      <li>Approved refunds are processed to the original payment method where possible.</li>
      <li>Processing times may vary by payment provider.</li>
    </ul>
  $html$),
  ('compliance', 'Compliance', $html$
    <h2>Compliance</h2>
    <p>HTG Infotech works to operate responsibly and comply with applicable platform, privacy, payment, and consumer protection obligations.</p>
    <h3>Reporting Issues</h3>
    <p>If you become aware of a potential policy, security, or compliance concern, contact our support team so it can be reviewed.</p>
  $html$),
  ('copyright_text', 'Footer Copyright Text', '(c) {{year}} {{site_name}}. All rights reserved.')
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    content = COALESCE(content_management.content, EXCLUDED.content);
