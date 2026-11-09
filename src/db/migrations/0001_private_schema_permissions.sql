REVOKE ALL ON SCHEMA portfolio FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA portfolio FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA portfolio FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA portfolio TO portfolio_app;
ALTER DEFAULT PRIVILEGES FOR ROLE portfolio_migrator IN SCHEMA portfolio REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE portfolio_migrator IN SCHEMA portfolio GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portfolio_app;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profile','skills','projects','achievements','social_links','media_assets','admin_sessions','fresh_login_nonces','rate_limit_buckets','storage_cleanup_queue']
  LOOP
    EXECUTE format('ALTER TABLE portfolio.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY runtime_access ON portfolio.%I FOR ALL TO portfolio_app USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio.%I TO portfolio_app', table_name);
  END LOOP;
END $$;
REVOKE ALL ON portfolio.__drizzle_migrations FROM portfolio_app;
