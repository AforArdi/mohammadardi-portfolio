import Image from "next/image";
import { iconRegistry } from "@/lib/content/icons";

export default function PortfolioIcon({ iconKey, customIconUrl, size, color, className, fallback = "lucide:globe" }: {
  iconKey: string | null;
  customIconUrl: string | null;
  size: number;
  color?: string;
  className?: string;
  fallback?: "lucide:globe" | "lucide:code";
}) {
  if (customIconUrl) {
    return <Image src={customIconUrl} width={size} height={size} alt="" unoptimized className={`portfolio-icon-image object-contain ${className || ""}`} style={{ width: size, height: size }} />;
  }
  const Icon = iconRegistry[iconKey || ""] || iconRegistry[fallback];
  return <Icon size={size} color={color} className={className} aria-hidden />;
}
