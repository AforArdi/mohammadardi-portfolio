import { sql } from "drizzle-orm";
import { pgSchema, uuid, text, integer, bigint, boolean, timestamp, check, index, uniqueIndex } from "drizzle-orm/pg-core";

export const portfolio = pgSchema("portfolio");
const date = (name: string) => timestamp(name, { withTimezone: true });
const editorial = () => ({
  displayOrder: integer("display_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  deletedAt: date("deleted_at"),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const mediaAssets = portfolio.table("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketName: text("bucket_name").notNull(),
  storagePath: text("storage_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"), height: integer("height"),
  createdAt: date("created_at").notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
}, t => ({ location: uniqueIndex("media_location_unique").on(t.bucketName, t.storagePath), size: check("media_size_positive", sql`${t.fileSizeBytes} > 0`) }));

export const profile = portfolio.table("profile", {
  id: integer("id").primaryKey().default(1),
  greeting: text("greeting").notNull().default("Hi, I'm"),
  displayName: text("display_name").notNull().default("Ardi"),
  fullName: text("full_name").notNull(),
  tagline: text("tagline").notNull(),
  aboutHeading: text("about_heading").notNull().default("about-me"),
  aboutBio: text("about_bio").notNull(),
  availabilityText: text("availability_text").notNull(),
  contactEmail: text("contact_email").notNull(),
  avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
  resumeMediaId: uuid("resume_media_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
  version: integer("version").notNull().default(1),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, t => ({ singleton: check("profile_singleton", sql`${t.id} = 1`) }));

export const skills = portfolio.table("skills", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(),
  iconProvider: text("icon_provider").notNull(), iconKey: text("icon_key"),
  customMediaId: uuid("custom_media_id").references(() => mediaAssets.id, { onDelete: "restrict" }),
  accentColor: text("accent_color").notNull().default("#C084FC"), ...editorial(),
}, t => ({
  icon: check("skill_icon_exclusivity", sql`(${t.iconProvider} = 'custom' AND ${t.customMediaId} IS NOT NULL AND ${t.iconKey} IS NULL) OR (${t.iconProvider} IN ('simple-icons','lucide') AND ${t.iconKey} IS NOT NULL AND ${t.customMediaId} IS NULL)`),
  color: check("skill_color_hex", sql`${t.accentColor} ~ '^#[0-9a-fA-F]{6}$'`),
  published: index("skills_published_order").on(t.displayOrder, t.id).where(sql`${t.isPublished} = true AND ${t.deletedAt} IS NULL`),
}));

export const projects = portfolio.table("projects", {
  id: uuid("id").primaryKey().defaultRandom(), title: text("title").notNull(), description: text("description").notNull(),
  imageMediaId: uuid("image_media_id").notNull().references(() => mediaAssets.id, { onDelete: "restrict" }),
  liveUrl: text("live_url").notNull(), githubUrl: text("github_url"), githubServerUrl: text("github_server_url"), ...editorial(),
}, t => ({ published: index("projects_published_order").on(t.displayOrder, t.id).where(sql`${t.isPublished} = true AND ${t.deletedAt} IS NULL`) }));

export const achievements = portfolio.table("achievements", {
  id: uuid("id").primaryKey().defaultRandom(), title: text("title").notNull(), certificateType: text("certificate_type").notNull(), description: text("description").notNull(),
  imageMediaId: uuid("image_media_id").notNull().references(() => mediaAssets.id, { onDelete: "restrict" }), verifyUrl: text("verify_url").notNull(), ...editorial(),
}, t => ({ published: index("achievements_published_order").on(t.displayOrder, t.id).where(sql`${t.isPublished} = true AND ${t.deletedAt} IS NULL`) }));

export const socialLinks = portfolio.table("social_links", {
  id: uuid("id").primaryKey().defaultRandom(), platform: text("platform").notNull(), label: text("label").notNull(), url: text("url").notNull(), iconKey: text("icon_key").notNull(), ...editorial(),
}, t => ({ published: index("socials_published_order").on(t.displayOrder, t.id).where(sql`${t.isPublished} = true AND ${t.deletedAt} IS NULL`) }));

export const youtubeVideos = portfolio.table("youtube_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: text("video_id").notNull(),
  url: text("url").notNull(),
  fetchedTitle: text("fetched_title"),
  titleOverride: text("title_override"),
  description: text("description").notNull().default(""),
  thumbnailUrl: text("thumbnail_url"),
  channelTitle: text("channel_title"),
  metadataFetchedAt: date("metadata_fetched_at"),
  ...editorial(),
}, t => ({
  activeVideoId: uniqueIndex("youtube_videos_active_video_id").on(t.videoId).where(sql`${t.deletedAt} IS NULL`),
  published: index("youtube_videos_published_order").on(t.displayOrder, t.id).where(sql`${t.isPublished} = true AND ${t.deletedAt} IS NULL`),
}));

export const freshLoginNonces = portfolio.table("fresh_login_nonces", {
  nonce: text("nonce").primaryKey(), userId: uuid("user_id").notNull(), sessionId: uuid("session_id").notNull(),
  securityGeneration: integer("security_generation").notNull().default(0),
  failedAttempts: integer("failed_attempts").notNull().default(0), expiresAt: date("expires_at").notNull(), usedAt: date("used_at"),
}, t => ({ expiry: index("nonces_expiry").on(t.expiresAt), attempts: check("nonce_attempt_limit", sql`${t.failedAttempts} BETWEEN 0 AND 3`) }));

export const ownerSecurity = portfolio.table("owner_security", {
  userId: uuid("user_id").primaryKey(),
  generation: integer("generation").notNull().default(0),
  passwordChangeId: uuid("password_change_id"),
  passwordChangeStartedAt: date("password_change_started_at"),
});

export const adminSessions = portfolio.table("admin_sessions", {
  sessionId: uuid("session_id").primaryKey(), userId: uuid("user_id").notNull(),
  aal2VerifiedAt: date("aal2_verified_at").notNull().defaultNow(), deadlineAt: date("deadline_at").notNull(), isRevoked: boolean("is_revoked").notNull().default(false),
}, t => ({ expiry: index("sessions_expiry").on(t.deadlineAt) }));

export const rateLimitBuckets = portfolio.table("rate_limit_buckets", {
  key: text("key").primaryKey(), count: integer("count").notNull().default(0),
  bytesServed: bigint("bytes_served", { mode: "number" }).notNull().default(0), expiresAt: date("expires_at").notNull(),
}, t => ({ expiry: index("rate_limit_expiry").on(t.expiresAt) }));

export const storageCleanupQueue = portfolio.table("storage_cleanup_queue", {
  id: uuid("id").primaryKey().defaultRandom(), bucketName: text("bucket_name").notNull(), storagePath: text("storage_path").notNull(),
  retryCount: integer("retry_count").notNull().default(0), nextRetryAt: date("next_retry_at").notNull().defaultNow(),
  lockedUntil: date("locked_until"), completedAt: date("completed_at"), createdAt: date("created_at").notNull().defaultNow(),
}, t => ({ pending: index("cleanup_pending").on(t.nextRetryAt).where(sql`${t.completedAt} IS NULL`) }));
