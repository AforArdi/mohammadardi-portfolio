CREATE TABLE "portfolio"."owner_security" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"generation" integer DEFAULT 0 NOT NULL,
	"password_change_id" uuid,
	"password_change_started_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "portfolio"."fresh_login_nonces" ADD COLUMN "security_generation" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
REVOKE ALL ON "portfolio"."owner_security" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER TABLE "portfolio"."owner_security" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY runtime_access ON "portfolio"."owner_security" FOR ALL TO portfolio_app USING (true) WITH CHECK (true);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "portfolio"."owner_security" TO portfolio_app;
