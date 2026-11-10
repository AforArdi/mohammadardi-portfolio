import Navbar from "@/components/Navbar";
import FloatingSidebar from "@/components/FloatingSidebar";
import Footer from "@/components/Footer";
import PortfolioAtmosphere from "@/components/PortfolioAtmosphere";
import { getPublicPortfolio } from "@/lib/content/public";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicPortfolio();
  const sections = [
    "home",
    "about",
    ...(data.skills.length ? ["skills"] : []),
    ...(data.projects.length ? ["projects"] : []),
    ...(data.achievements.length ? ["achievements"] : []),
    ...(data.videos?.length ? ["my-yt-week"] : []),
    "contact",
  ];
  return (
    <>
      <PortfolioAtmosphere />
      <Navbar sections={sections} displayName={data.profile.displayName} />
      <FloatingSidebar />
      <div className="public-content relative z-[1]">
        {children}
        <Footer displayName={data.profile.displayName} />
      </div>
    </>
  );
}
