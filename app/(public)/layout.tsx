import Navbar from "@/components/Navbar";
import FloatingSidebar from "@/components/FloatingSidebar";
import Footer from "@/components/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <><Navbar /><FloatingSidebar /><div className="public-content">{children}<Footer /></div></>;
}
