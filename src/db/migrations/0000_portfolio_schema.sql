-- The administrator creates and assigns only this schema during db:bootstrap.
SELECT 1 FROM pg_namespace WHERE nspname = 'portfolio';
--> statement-breakpoint
CREATE TABLE "portfolio"."achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"certificate_type" text NOT NULL,
	"description" text NOT NULL,
	"image_media_id" uuid NOT NULL,
	"verify_url" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."admin_sessions" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"aal2_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."fresh_login_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "nonce_attempt_limit" CHECK ("portfolio"."fresh_login_nonces"."failed_attempts" BETWEEN 0 AND 3)
);
--> statement-breakpoint
CREATE TABLE "portfolio"."media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "media_size_positive" CHECK ("portfolio"."media_assets"."file_size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "portfolio"."profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"greeting" text DEFAULT 'Hi, I''m' NOT NULL,
	"display_name" text DEFAULT 'Ardi' NOT NULL,
	"full_name" text NOT NULL,
	"tagline" text NOT NULL,
	"about_heading" text DEFAULT 'about-me' NOT NULL,
	"about_bio" text NOT NULL,
	"availability_text" text NOT NULL,
	"contact_email" text NOT NULL,
	"avatar_media_id" uuid,
	"resume_media_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_singleton" CHECK ("portfolio"."profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "portfolio"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_media_id" uuid NOT NULL,
	"live_url" text NOT NULL,
	"github_url" text,
	"github_server_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"bytes_served" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon_provider" text NOT NULL,
	"icon_key" text,
	"custom_media_id" uuid,
	"accent_color" text DEFAULT '#C084FC' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "skill_icon_exclusivity" CHECK (("portfolio"."skills"."icon_provider" = 'custom' AND "portfolio"."skills"."custom_media_id" IS NOT NULL AND "portfolio"."skills"."icon_key" IS NULL) OR ("portfolio"."skills"."icon_provider" IN ('simple-icons','lucide') AND "portfolio"."skills"."icon_key" IS NOT NULL AND "portfolio"."skills"."custom_media_id" IS NULL)),
	CONSTRAINT "skill_color_hex" CHECK ("portfolio"."skills"."accent_color" ~ '^#[0-9a-fA-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "portfolio"."social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"icon_key" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."storage_cleanup_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio"."achievements" ADD CONSTRAINT "achievements_image_media_id_media_assets_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "portfolio"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."profile" ADD CONSTRAINT "profile_avatar_media_id_media_assets_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "portfolio"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."profile" ADD CONSTRAINT "profile_resume_media_id_media_assets_id_fk" FOREIGN KEY ("resume_media_id") REFERENCES "portfolio"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."projects" ADD CONSTRAINT "projects_image_media_id_media_assets_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "portfolio"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."skills" ADD CONSTRAINT "skills_custom_media_id_media_assets_id_fk" FOREIGN KEY ("custom_media_id") REFERENCES "portfolio"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_published_order" ON "portfolio"."achievements" USING btree ("display_order","id") WHERE "portfolio"."achievements"."is_published" = true AND "portfolio"."achievements"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "sessions_expiry" ON "portfolio"."admin_sessions" USING btree ("deadline_at");--> statement-breakpoint
CREATE INDEX "nonces_expiry" ON "portfolio"."fresh_login_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_location_unique" ON "portfolio"."media_assets" USING btree ("bucket_name","storage_path");--> statement-breakpoint
CREATE INDEX "projects_published_order" ON "portfolio"."projects" USING btree ("display_order","id") WHERE "portfolio"."projects"."is_published" = true AND "portfolio"."projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "rate_limit_expiry" ON "portfolio"."rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "skills_published_order" ON "portfolio"."skills" USING btree ("display_order","id") WHERE "portfolio"."skills"."is_published" = true AND "portfolio"."skills"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "socials_published_order" ON "portfolio"."social_links" USING btree ("display_order","id") WHERE "portfolio"."social_links"."is_published" = true AND "portfolio"."social_links"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "cleanup_pending" ON "portfolio"."storage_cleanup_queue" USING btree ("next_retry_at") WHERE "portfolio"."storage_cleanup_queue"."completed_at" IS NULL;
