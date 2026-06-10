"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import HeaderLink from "./Navigation/HeaderLink";
import Logo from "./Logo";
import MobileHeader from "./Navigation/MobileHeader";
import { clearStoredTokens, getStoredToken } from "@/lib/auth-api";
import { headerData } from "@/lib/site-layout-data";

const Header = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuData] = useState<any[]>(headerData);
  const [sticky, setSticky] = useState(false);
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setAuthed(Boolean(getStoredToken()));
  }, [pathname]);

  const handleScroll = () => {
    setSticky(window.scrollY >= 80);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const authButtons = (
    <div className="hidden lg:flex items-center gap-2">
      {authed ? (
        <>
          <Link
            href="/chat"
            className="text-sm px-2.5 xl:px-4 py-2 rounded-full border border-dark_black dark:border-white/50 hover:bg-dark_black hover:text-white dark:hover:bg-white dark:hover:text-dark_black"
          >
            Chat
          </Link>
          <button
            type="button"
            onClick={() => {
              clearStoredTokens();
              setAuthed(false);
              window.location.href = "/";
            }}
            className="text-sm px-2.5 xl:px-4 py-2 rounded-full bg-dark_black dark:bg-white/20 text-white"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link
            href="/signin"
            className="bg-transparent border border-dark_black dark:border-white/50 text-primary px-2.5 xl:px-4 py-2 rounded-full hover:bg-dark_black hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-white px-2.5 xl:px-4 py-2 bg-dark_black dark:bg-white/20 rounded-full hover:opacity-90"
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  );

  return (
    <>
      <header className={`fixed top-0 z-50 w-full`}>
        <div className="container p-3">
          <nav
            className={`flex items-center py-3 px-4 justify-between ${
              sticky ? " rounded-full shadow-sm bg-white dark:bg-dark_black" : null
            } `}
          >
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="hidden lg:flex bg-dark_black/5 dark:bg-white/5 rounded-3xl p-3">
              <ul className="flex gap-0 2xl:gap-1.5">
                {menuData?.map((item, index) => (
                  <HeaderLink key={index} item={item} />
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-1 xl:gap-4">
              {authButtons}

              <div className="hidden max-lg:flex">
                <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeMiterlimit="10"
                      strokeWidth="1.5"
                      d="M4.5 12h15m-15 5.77h15M4.5 6.23h15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {sidebarOpen && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`lg:hidden fixed top-0 right-0 h-full w-full bg-white dark:bg-dark_black shadow-lg transform transition-transform duration-300 max-w-xs ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          } z-50`}
        >
          <div className="flex items-center justify-between p-4">
            <p className="text-lg font-bold">Menu</p>
            <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close mobile menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4">
            <ul className="flex flex-col">
              {menuData?.map((item, index) => (
                <MobileHeader key={index} item={item} />
              ))}
              <div className="flex flex-col items-center gap-3 px-2 mt-2">
                {authed ? (
                  <>
                    <Link
                      href="/chat"
                      className="w-full text-center border border-dark_black dark:border-white px-4 py-2 rounded-md"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Chat
                    </Link>
                    <button
                      type="button"
                      className="w-full px-4 py-2 rounded-md bg-dark_black dark:bg-white text-white dark:text-dark_black"
                      onClick={() => {
                        clearStoredTokens();
                        setAuthed(false);
                        setSidebarOpen(false);
                        window.location.href = "/";
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signin"
                      className="w-full border border-dark_black dark:border-white text-primary px-4 py-2 rounded-md text-center"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="w-full text-white dark:text-dark_black px-4 py-2 bg-dark_black dark:bg-white rounded-md text-center"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </ul>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
