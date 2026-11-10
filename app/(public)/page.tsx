import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import SkillsSection from "@/components/SkillsSection";
import ProjectsSection from "@/components/ProjectsSection";
import AchievementsSection from "@/components/AchievementsSection";
import MyYtWeekSection from "@/components/MyYtWeekSection";
import ContactSection from "@/components/ContactSection";
import { getPublicPortfolio } from "@/lib/content/public";
import Reveal from "@/components/Reveal";

export default async function HomePage() {
  const data = await getPublicPortfolio();
  const linkedin = data.socials.find(social => social.iconKey === "lucide:linkedin")?.href;
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection profile={data.profile} />
      <AboutSection profile={data.profile} />
      <SkillsSection skills={data.skills} />
      <ProjectsSection projects={data.projects} />
      <AchievementsSection achievements={data.achievements} />
      <MyYtWeekSection videos={data.videos} />
      <Reveal>
        <ContactSection contactEmail={data.profile.contactEmail} linkedinUrl={linkedin} />
      </Reveal>
    </main>
  );
}
