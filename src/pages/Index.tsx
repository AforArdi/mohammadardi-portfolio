import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import FloatingSidebar from '@/components/FloatingSidebar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import SkillsSection from '@/components/SkillsSection';
import ProjectsSection from '@/components/ProjectsSection';
import AchievementsSection from '@/components/AchievementsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Ardi - Full Stack Developer | Portfolio</title>
        <meta 
          name="description" 
          content="Md Miftahul Islam Ardi - Full Stack Developer specializing in React, Next.js, Node.js, and MongoDB. Building modern, scalable web applications." 
        />
        <meta name="keywords" content="full stack developer, react developer, nextjs, nodejs, mongodb, web developer, portfolio" />
        <meta property="og:title" content="Ardi - Full Stack Developer" />
        <meta property="og:description" content="Full Stack Developer specializing in modern web technologies. Let's build something amazing together." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://ardi.dev" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <FloatingSidebar />
        
        <main>
          <HeroSection />
          <AboutSection />
          <SkillsSection />
          <ProjectsSection />
          <AchievementsSection />
          <ContactSection />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
