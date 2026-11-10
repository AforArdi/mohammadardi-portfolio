CREATE TABLE "portfolio"."youtube_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" text NOT NULL,
	"url" text NOT NULL,
	"fetched_title" text,
	"title_override" text,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail_url" text,
	"channel_title" text,
	"metadata_fetched_at" timestamp with time zone,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_videos_active_video_id" ON "portfolio"."youtube_videos" USING btree ("video_id") WHERE "portfolio"."youtube_videos"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "youtube_videos_published_order" ON "portfolio"."youtube_videos" USING btree ("display_order","id") WHERE "portfolio"."youtube_videos"."is_published" = true AND "portfolio"."youtube_videos"."deleted_at" IS NULL;
--> statement-breakpoint
REVOKE ALL ON "portfolio"."youtube_videos" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER TABLE "portfolio"."youtube_videos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY runtime_access ON "portfolio"."youtube_videos" FOR ALL TO portfolio_app USING (true) WITH CHECK (true);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "portfolio"."youtube_videos" TO portfolio_app;
--> statement-breakpoint
REVOKE ALL ON "portfolio"."__drizzle_migrations" FROM portfolio_app;
