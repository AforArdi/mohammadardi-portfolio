import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import SkillsSection from "@/components/SkillsSection";
import ProjectsSection from "@/components/ProjectsSection";
import AchievementsSection from "@/components/AchievementsSection";
import ContactSection from "@/components/ContactSection";

export default function HomePage() {
  return <main id="main-content" tabIndex={-1}><HeroSection /><AboutSection /><SkillsSection /><ProjectsSection /><AchievementsSection /><ContactSection /></main>;
}
