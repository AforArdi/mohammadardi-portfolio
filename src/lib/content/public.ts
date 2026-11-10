import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { achievements, profile, projects, skills, socialLinks, youtubeVideos } from "@/db/schema";
import { resolveVideoTitle } from "@/lib/youtube/display";

export const getPublicPortfolio = unstable_cache(async () => {
  const db = getDb();
  const [owner] = await db.select({
    greeting: profile.greeting,
    displayName: profile.displayName,
    fullName: profile.fullName,
    tagline: profile.tagline,
    aboutHeading: profile.aboutHeading,
    aboutBio: profile.aboutBio,
    availabilityText: profile.availabilityText,
    contactEmail: profile.contactEmail,
    avatarMediaId: profile.avatarMediaId,
    resumeMediaId: profile.resumeMediaId,
  }).from(profile).where(eq(profile.id, 1));

  if (!owner) throw new Error("Portfolio content has not been seeded.");

  const [skillRows, projectRows, achievementRows, socials, videoRows] = await Promise.all([
    db.select({ id: skills.id, name: skills.name, iconKey: skills.iconKey, customMediaId: skills.customMediaId, color: skills.accentColor }).from(skills).where(and(eq(skills.isPublished, true), isNull(skills.deletedAt))).orderBy(asc(skills.displayOrder), asc(skills.id)),
    db.select({ id: projects.id, name: projects.title, about: projects.description, github: projects.githubUrl, githubServer: projects.githubServerUrl, live: projects.liveUrl }).from(projects).where(and(eq(projects.isPublished, true), isNull(projects.deletedAt))).orderBy(asc(projects.displayOrder), asc(projects.id)),
    db.select({ id: achievements.id, title: achievements.title, subtitle: achievements.certificateType, description: achievements.description, verifyUrl: achievements.verifyUrl }).from(achievements).where(and(eq(achievements.isPublished, true), isNull(achievements.deletedAt))).orderBy(asc(achievements.displayOrder), asc(achievements.id)),
    db.select({ id: socialLinks.id, href: socialLinks.url, label: socialLinks.label, iconKey: socialLinks.iconKey }).from(socialLinks).where(and(eq(socialLinks.isPublished, true), isNull(socialLinks.deletedAt))).orderBy(asc(socialLinks.displayOrder), asc(socialLinks.id)),
    db.select({
      id: youtubeVideos.id,
      url: youtubeVideos.url,
      videoId: youtubeVideos.videoId,
      fetchedTitle: youtubeVideos.fetchedTitle,
      titleOverride: youtubeVideos.titleOverride,
      description: youtubeVideos.description,
      thumbnailUrl: youtubeVideos.thumbnailUrl,
      channelTitle: youtubeVideos.channelTitle,
    }).from(youtubeVideos).where(and(eq(youtubeVideos.isPublished, true), isNull(youtubeVideos.deletedAt))).orderBy(asc(youtubeVideos.displayOrder), asc(youtubeVideos.id)),
  ]);

  const { avatarMediaId, resumeMediaId, ...publicProfile } = owner;
  return {
    profile: { ...publicProfile, avatarUrl: avatarMediaId ? "/api/media/avatar/1" : null, hasResume: Boolean(resumeMediaId) },
    skills: skillRows.map(({ customMediaId, ...skill }) => ({ ...skill, customIconUrl: customMediaId ? `/api/media/skill/${skill.id}` : null })),
    projects: projectRows.map(project => ({ ...project, image: `/api/media/project/${project.id}` })),
    achievements: achievementRows.map(achievement => ({ ...achievement, imageUrl: `/api/media/achievement/${achievement.id}` })),
    socials,
    videos: videoRows.map(video => ({
      id: video.id,
      url: video.url,
      videoId: video.videoId,
      title: resolveVideoTitle(video.titleOverride, video.fetchedTitle),
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      channelTitle: video.channelTitle,
    })),
  };
}, ["public-portfolio-v2"], { tags: ["portfolio-content"], revalidate: 3600 });

export type PublicPortfolio = Awaited<ReturnType<typeof getPublicPortfolio>>;
