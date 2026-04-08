-- Seed initial owner profile
-- Note: This assumes the owner user is already created in auth.users
-- Replace 'owner-user-id' with the actual UUID from auth.users after signup

INSERT INTO profiles (id, role, full_name, username, phone) VALUES
('34c0c63d-68d5-4fa0-9d7e-ad8c7a3f9448', 'owner', 'AJ33 Owner', 'aj33_owner', '08111111111111');

-- Seed initial settings (sales target)
INSERT INTO settings (key, value) VALUES
('sales_target_daily', '14000000');

-- Note: For actual seeding, run this after creating the owner user via Supabase Auth API or dashboard.