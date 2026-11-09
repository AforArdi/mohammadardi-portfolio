export const initialProfile = {
  greeting: "Hi, I'm", displayName: "Ardi", fullName: "Md Miftahul Islam Ardi",
  tagline: "Building | Debugging | Improving", aboutHeading: "about-me",
  aboutBio: "An entry-level web developer passionate about building modern full-stack applications. Skilled at solving technical challenges with quick research, AI-supported debugging, and hands-on project work, all while eagerly improving both frontend and backend abilities.",
  availabilityText: "Open for new opportunities", contactEmail: "miftahulislam9037@gmail.com",
};
export const initialSkills = [
  ["HTML", "simple-icons:html5", "#E34F26"], ["CSS", "simple-icons:css", "#1572B6"],
  ["Tailwind CSS", "simple-icons:tailwindcss", "#38BDF8"], ["JavaScript (ES6+)", "simple-icons:javascript", "#F7DF1E"],
  ["React", "simple-icons:react", "#61DAFB"], ["Next.js", "simple-icons:nextdotjs", "#FFFFFF"],
  ["Express.js", "simple-icons:express", "#FFFFFF"], ["REST APIs", "lucide:network", "#A78BFA"],
  ["MongoDB", "simple-icons:mongodb", "#47A248"], ["BetterAuth", "lucide:shield-check", "#C084FC"],
  ["JWT Security", "simple-icons:jsonwebtokens", "#D946EF"],
] as const;
export const initialProjects = [
  { title: "Qurbani Hat", description: "An online platform for booking qurbani animals with an intuitive interface for browsing, comparing, and booking animals for Eid celebrations.", image: "https://i.postimg.cc/bJVXx1c3/qurbani-hat.png", githubUrl: "https://github.com/AforArdi/qurbani-hat-a8", githubServerUrl: null, liveUrl: "https://qurbani-hat-a8.vercel.app" },
  { title: "Dragon News", description: "A modern, responsive news portal application built with Next.js and React 19. Browse news articles by category, authenticate users securely, and enjoy a seamless reading experience.", image: "https://i.postimg.cc/DZpVr1kg/dragon-news.png", githubUrl: "https://github.com/AforArdi/dragon-news-nextjs", githubServerUrl: null, liveUrl: "https://dragon-news-nextjs-navy.vercel.app/" },
  { title: "HeroRide", description: "Hey there! Welcome to HeroRide. I built this full-stack web application as a major milestone in my 180-day MERN stack learning journey. I'm super excited to share it because building this platform really pushed my skills to the next level in connecting a Next.js frontend with a secure Express backend!", image: "src/assets/heroride.png", githubUrl: "https://github.com/AforArdi/heroride", githubServerUrl: "https://github.com/AforArdi/heroride-server", liveUrl: "https://heroride.vercel.app" },
];
export const initialAchievements = [
  { title: "CS50's Introduction to Computer Science", certificateType: "Certificate of Completion", description: "Harvard's CS50 is a beginner-friendly introduction to computer science that prioritizes problem-solving and computational thinking over just learning syntax. Designed for students with no prior experience, the course starts with C to teach low-level fundamentals (like memory management) before transitioning to Python, SQL, and web technologies (HTML, CSS, JavaScript). The curriculum focuses on teaching you how to learn new languages effectively and culminates in a final project.", image: "https://certificates.cs50.io/009a021f-dd2c-40fc-8f4c-77b9e511e992.png?size=A4", verifyUrl: "https://cs50.harvard.edu/certificates/009a021f-dd2c-40fc-8f4c-77b9e511e992" },
  { title: "Workshop on Computer Programming & Robotics", certificateType: "Certificate of Participation", description: "Experts from a well-known engineering university collaborated with American Corner Khulna to provide a hands-on experience in robotics and computer programming. The workshop focused on understanding how robotics systems work at a low level and how the C programming language can directly manipulate hardware components.", image: "https://raw.githubusercontent.com/AforArdi/mohammadardi/refs/heads/main/images/ROBOTICS.png", verifyUrl: "https://raw.githubusercontent.com/AforArdi/mohammadardi/refs/heads/main/images/ROBOTICS.png" },
];
export const initialSocials = [
  { platform: "instagram", label: "Instagram", iconKey: "lucide:instagram", url: "https://www.instagram.com/0mohammadardi0/" },
  { platform: "facebook", label: "Facebook", iconKey: "lucide:facebook", url: "https://www.facebook.com/miftahulislamardi" },
  { platform: "x", label: "X", iconKey: "brand:x", url: "https://x.com/AforArdi" },
  { platform: "linkedin", label: "LinkedIn", iconKey: "lucide:linkedin", url: "https://www.linkedin.com/in/mohammad-ardi/" },
  { platform: "github", label: "GitHub", iconKey: "lucide:github", url: "https://github.com/AforArdi" },
];
export const seedId = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
