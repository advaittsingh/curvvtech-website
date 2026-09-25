export type CareerTeam = "Technology" | "Growth";

export type CareerRole = {
  slug: string;
  title: string;
  team: CareerTeam;
  department: string;
  openings: number;
  duration: string;
  stipend: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
};

export const careers: CareerRole[] = [
  {
    slug: "frontend-developer-intern",
    title: "Frontend Developer Intern",
    team: "Technology",
    department: "Technology",
    openings: 2,
    duration: "3–6 months",
    stipend: "₹5,000/month",
    location: "Bangalore (Hybrid)",
    type: "Internship",
    summary:
      "You'll build and maintain interfaces across our Next.js websites, Vite admin panels, and client web apps — turning designs into production React/TypeScript UI.",
    responsibilities: [
      "Build and maintain responsive UIs in React and TypeScript for client sites and internal tools",
      "Work in our stack: Next.js (App Router), Vite + React, and Tailwind CSS",
      "Translate Figma designs into clean, reusable components",
      "Integrate REST APIs from our Express backend and debug front-end issues on live projects",
      "Participate in code reviews and apply feedback",
    ],
    requirements: [
      "Working knowledge of HTML, CSS, JavaScript/TypeScript, and React",
      "Basic understanding of responsive design and modern component patterns",
      "A portfolio, GitHub profile, or personal projects you can show us",
      "Comfortable receiving and applying code review feedback",
    ],
    niceToHave: [
      "Next.js and/or Vite experience",
      "Tailwind CSS",
      "Familiarity with Radix UI / shadcn-style components",
      "Git/GitHub",
    ],
  },
  {
    slug: "backend-developer-intern",
    title: "Backend Developer Intern",
    team: "Technology",
    department: "Technology",
    openings: 2,
    duration: "3–6 months",
    stipend: "₹7,000/month",
    location: "Bangalore (Hybrid)",
    type: "Internship",
    summary:
      "You'll build server-side logic and APIs in our Express + TypeScript + PostgreSQL stack — powering client products, admin (Curvvtech OS), and integrations.",
    responsibilities: [
      "Build and maintain REST APIs and business logic with Node.js, Express, and TypeScript",
      "Work with PostgreSQL (queries, schemas, migrations) on real client and internal projects",
      "Integrate third-party services (payments, email, storage, analytics)",
      "Support features across our API monorepo used by the website, admin panel, and client portal",
      "Write clean, reviewed code before anything ships to a client",
    ],
    requirements: [
      "Working knowledge of Node.js and JavaScript/TypeScript (Express or similar preferred)",
      "Basic understanding of SQL / relational databases (PostgreSQL ideal)",
      "Understanding of REST APIs",
      "A GitHub profile or personal projects you can show us",
    ],
    niceToHave: [
      "PostgreSQL or Neon experience",
      "AWS S3 or other cloud storage",
      "JWT auth, Socket.IO, or Redis/BullMQ exposure",
      "Zod or similar validation libraries",
    ],
  },
  {
    slug: "ui-ux-designer-intern",
    title: "UI/UX Designer Intern",
    team: "Technology",
    department: "Technology",
    openings: 1,
    duration: "3–6 months",
    stipend: "₹5,000/month",
    location: "Bangalore (Hybrid)",
    type: "Internship",
    summary:
      "You'll design interfaces our React/Next.js and Vite teams ship — client websites, apps, and admin panels — with handoff that matches how we actually build.",
    responsibilities: [
      "Design clean, modern UI for client websites, apps, and admin panels",
      "Create wireframes, mockups, and prototypes in Figma",
      "Maintain design consistency with each client's brand and our component patterns",
      "Collaborate with frontend developers shipping React, Next.js, Vite, and Tailwind",
    ],
    requirements: [
      "Proficiency in Figma or a similar design tool",
      "A portfolio showing UI/UX work — student and personal projects are welcome",
      "Basic understanding of design principles: typography, spacing, color theory",
      "Attention to detail",
    ],
    niceToHave: [
      "Designing for web apps / design systems (not only marketing pages)",
      "Basic familiarity with React or Tailwind component thinking",
      "Prototyping / motion experience",
    ],
  },
  {
    slug: "video-editor-intern",
    title: "Video Editor Intern",
    team: "Growth",
    department: "Growth",
    openings: 1,
    duration: "3–6 months",
    stipend: "₹5,000/month",
    location: "Bangalore (on-site preferred, for shoots)",
    type: "Internship",
    summary:
      "You'll be the person turning raw footage into the Reels our clients' audiences actually stop scrolling for.",
    responsibilities: [
      "Shoot and edit Reels and short-form video content for client social media accounts",
      "Edit raw footage into polished, on-brand videos (CapCut, Premiere Pro, or similar)",
      "Work closely with the Social Media Intern on content calendars and campaign themes",
      "Manage a monthly output of Reels across multiple client accounts",
    ],
    requirements: [
      "Working knowledge of video editing software (CapCut, Premiere Pro, or similar)",
      "A portfolio or sample reel of past edits — personal or client work",
      "An eye for pacing, trends, and short-form content style",
      "Ability to turn around edits quickly",
    ],
    niceToHave: ["Basic shooting/videography skills", "Motion graphics"],
  },
  {
    slug: "social-media-intern",
    title: "Social Media Intern",
    team: "Growth",
    department: "Growth",
    openings: 1,
    duration: "3–6 months",
    stipend: "₹5,000/month",
    location: "Bangalore (Hybrid)",
    type: "Internship",
    summary:
      "You'll run the day-to-day of our clients' social presence — content, community, and consistency.",
    responsibilities: [
      "Execute the monthly content calendar across client Instagram, Facebook, and LinkedIn accounts",
      "Design static posts and story graphics (Canva)",
      "Manage community engagement — respond to comments and DMs professionally and on-brand",
      "Track basic performance metrics and flag what's working",
    ],
    requirements: [
      "Comfortable with Canva or similar design tools",
      "Strong written communication and a sense for tone and voice",
      "Genuine interest in social media trends and content strategy",
      "Organized — comfortable managing a content calendar across multiple client accounts",
    ],
    niceToHave: [
      "Copywriting skills",
      "Basic knowledge of Meta Business Suite or scheduling tools",
    ],
  },
  {
    slug: "performance-marketing-intern",
    title: "Performance Marketing (Ads) Intern",
    team: "Growth",
    department: "Growth",
    openings: 1,
    duration: "3–6 months",
    stipend: "₹7,000/month",
    location: "Bangalore (Hybrid)",
    type: "Internship",
    summary:
      "You'll work directly on live Meta, Google, and LinkedIn Ads campaigns for real client budgets — under close guidance, since this role touches actual client money.",
    responsibilities: [
      "Assist in setting up, monitoring, and optimizing Meta, Google, and LinkedIn Ads campaigns for client accounts",
      "Track daily spend and performance against targets, flagging anomalies immediately",
      "Help prepare monthly ad performance reports",
      "Work under guidance on all budget and targeting decisions — this role does not have unsupervised control of live ad spend",
    ],
    requirements: [
      "Basic understanding of Meta Ads Manager and/or Google Ads (coursework, certification, or hands-on project experience)",
      "Comfortable with numbers and reading performance data",
      "Detail-oriented — this role involves real client ad spend, so accuracy matters",
      "Any past experience running ads, even a personal project or college fest, is a strong plus",
    ],
    niceToHave: [
      "Google Ads or Meta Blueprint certification",
      "Experience with ad reporting tools",
    ],
  },
];

export const CAREER_TEAMS: CareerTeam[] = ["Technology", "Growth"];

export function getAllCareers(): CareerRole[] {
  return careers;
}

export function getCareersByTeam(team: CareerTeam): CareerRole[] {
  return careers.filter((role) => role.team === team);
}

export function getCareerBySlug(slug: string): CareerRole | undefined {
  return careers.find((role) => role.slug === slug);
}

export function getAllCareerSlugs(): string[] {
  return careers.map((role) => role.slug);
}

export function openingsLabel(openings: number): string {
  return openings === 1 ? "1 opening" : `${openings} openings`;
}
