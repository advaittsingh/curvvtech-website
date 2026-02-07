import { NextResponse } from "next/server";

const headerData = [
    { label: 'About us', href: '/about-us' },
    { label: 'Services', href: '/services' },
    { label: 'Work', href: '/work' },
    { label: 'Contact', href: '/contact' },
];

const footerData = {
    brand: {
        name: "Curvvtech",
        tagline: "Your tech partner for software development, cloud solutions, and digital innovation. Let's build what's next.",
        socialLinks: [
            {
                icon: "/images/home/footerSocialIcon/twitter.svg",
                dark_icon: "/images/home/footerSocialIcon/twitter_dark.svg",
                link: "https://twitter.com"
            },
            {
                icon: "/images/home/footerSocialIcon/linkedin.svg",
                dark_icon: "/images/home/footerSocialIcon/linkedin_dark.svg",
                link: "https://linkedin.com/in"
            },
            {
                icon: "/images/home/footerSocialIcon/dribble.svg",
                dark_icon: "/images/home/footerSocialIcon/dribble_dark.svg",
                link: "https://dribbble.com"
            },
            {
                icon: "/images/home/footerSocialIcon/instagram.svg",
                dark_icon: "/images/home/footerSocialIcon/instagram_dark.svg",
                link: "https://instagram.com"
            }
        ]
    },
    sitemap: {
        name: "Sitemap",
        links: [
            { name: "Contact us", url: "/contact" },
            { name: "About us", url: "/about-us" },
            { name: "Work", url: "/work" },
            { name: "Services", url: "/services" }
        ]
    },
    otherPages: {
        name: "Other Pages",
        links: [
            { name: "Error 404", url: "/not-found" },
            { name: "Terms & Conditions", url: "/terms-and-conditions" },
            { name: "Privacy Policy", url: "/privacy-policy" },
            { name: "Documentation", url: "/documentation" }
        ]
    },
    contactDetails: {
        name:"Contact Details",
        address: "81 Rivington Street London EC2A 3AY",
        email: "hello@curvvtech.com",
        phone: "0105 192 3556"
    },
    copyright: "©2025 Curvvtech. All Rights Reserved"
};

export const GET = async () => {
  return NextResponse.json({
    headerData,
    footerData
  });
};