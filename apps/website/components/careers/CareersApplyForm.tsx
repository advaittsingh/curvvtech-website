"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CareerTeam } from "@/lib/careers-data";

type Props = {
  roleTitle: string;
  roleSlug: string;
  team?: CareerTeam;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  message: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  message: "",
};

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 1024;

function careersApiBase(): string {
  const env = String(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "",
  ).replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://127.0.0.1:4000";
  }
  return "https://api.curvvtech.in";
}

function isAllowedResume(file: File): boolean {
  const type = file.type.toLowerCase();
  if (["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(type)) return true;
  return /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
}

export default function CareersApplyForm({ roleTitle, roleSlug, team }: Props) {
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [resume, setResume] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accentBar = team === "Growth" ? "bg-purple/20" : "bg-blue/20";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setResumeFile = (file: File | null) => {
    if (!file) {
      setResume(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("CV must be 8 MB or smaller.");
      return;
    }
    if (file.size < MIN_BYTES) {
      setError("That file looks empty. Please upload your original CV.");
      return;
    }
    if (!isAllowedResume(file)) {
      setError("Upload a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    setError(null);
    setResume(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume) {
      setError("Please upload your CV as a PDF or image.");
      return;
    }
    setLoader(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("role_slug", roleSlug);
      body.append("role", roleTitle);
      body.append("team", team ?? "");
      body.append("name", formData.name);
      body.append("email", formData.email);
      body.append("phone", formData.phone);
      body.append("linkedin", formData.linkedin);
      body.append("message", formData.message);
      body.append("resume", resume);

      const response = await fetch(`${careersApiBase()}/api/public/careers/apply`, {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Submission failed");
      }
      setSubmitted(true);
      setFormData(emptyForm);
      setResume(null);
    } catch (err) {
      setError(
        err instanceof Error && err.message && err.message !== "Submission failed"
          ? err.message
          : "Something went wrong. Please try again or email info@curvvtech.com.",
      );
    } finally {
      setLoader(false);
    }
  };

  if (submitted) {
    return (
      <div className="overflow-hidden rounded-3xl border border-dark_black/10 bg-green/20 dark:border-white/10">
        <div className="h-2 w-full bg-green/40" />
        <div className="flex flex-col gap-5 p-7 md:p-8">
          <div className="flex items-start gap-3">
            <Icon icon="ix:success-filled" width={28} height={28} style={{ color: "#79D45E" }} />
            <div>
              <h3 className="text-xl font-medium text-dark_black dark:text-white">
                Application sent
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-dark_black/70 dark:text-white/70">
                Thanks for applying for {roleTitle}. We&apos;ll review your profile and get back
                to you soon.
              </p>
            </div>
          </div>
          <Link
            href="/careers"
            className="group inline-flex w-fit items-center justify-between gap-3 rounded-full border border-purple_blue bg-purple_blue py-2 pl-5 pr-2 font-medium text-white transition-all duration-200 hover:bg-transparent hover:text-purple_blue"
          >
            <span>Back to careers</span>
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform duration-200 group-hover:rotate-45"
            >
              <rect
                width="32"
                height="32"
                rx="16"
                className="fill-white transition-colors group-hover:fill-purple_blue"
              />
              <path
                d="M11.832 11.3334H20.1654M20.1654 11.3334V19.6668M20.1654 11.3334L11.832 19.6668"
                stroke="#1B1D1E"
                strokeWidth="1.42857"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-dark_black transition-colors group-hover:stroke-white"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full mt-2 rounded-full border border-dark_black/10 bg-dark_black/3 px-5 py-3 outline-hidden transition focus:border-purple_blue/40 dark:border-white/15 dark:bg-black/40 dark:focus:border-purple_blue/50";

  return (
    <form
      onSubmit={handleSubmit}
      id="apply"
      className="overflow-hidden rounded-3xl border border-dark_black/10 bg-white shadow-[0_24px_60px_-36px_rgba(73,40,253,0.35)] dark:border-white/10 dark:bg-dark_black"
    >
      <div className={`h-2 w-full ${accentBar}`} />
      <div className="flex flex-col gap-6 p-7 md:p-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-purple_blue">
            Apply now
          </p>
          <h3 className="mt-1 text-2xl font-medium text-dark_black dark:text-white">
            {roleTitle}
          </h3>
          <p className="mt-2 text-sm text-dark_black/55 dark:text-white/55">
            Takes about 2 minutes. Upload your CV as a PDF or image.
          </p>
        </div>

        <div className="rounded-2xl bg-dark_black/5 px-4 py-3 text-sm dark:bg-white/5">
          <span className="text-dark_black/50 dark:text-white/50">Applying for </span>
          <span className="font-medium text-dark_black dark:text-white">{roleTitle}</span>
        </div>

        <div className="flex flex-col gap-5">
          <div className="w-full">
            <label htmlFor="name" className="text-sm font-medium">
              Full name
            </label>
            <input
              className={inputClass}
              id="name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
            />
          </div>
          <div className="w-full">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              className={inputClass}
              id="email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>
          <div className="w-full">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone
            </label>
            <input
              className={inputClass}
              id="phone"
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 …"
            />
          </div>
          <div className="w-full">
            <label htmlFor="linkedin" className="text-sm font-medium">
              LinkedIn / portfolio
            </label>
            <input
              className={inputClass}
              id="linkedin"
              type="url"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleChange}
              placeholder="https://"
            />
          </div>
          <div className="w-full">
            <label htmlFor="resume" className="text-sm font-medium">
              Resume / CV
            </label>
            <input
              ref={fileRef}
              id="resume"
              type="file"
              name="resume"
              accept={ACCEPT}
              required={!resume}
              className="sr-only"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                setResumeFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-dark_black/15 bg-dark_black/3 px-5 py-6 text-center transition hover:border-purple_blue/40 dark:border-white/15 dark:bg-black/40"
            >
              <Icon icon="solar:upload-linear" width={22} height={22} />
              {resume ? (
                <span className="text-sm font-medium text-dark_black dark:text-white">
                  {resume.name}
                </span>
              ) : (
                <span className="text-sm text-dark_black/60 dark:text-white/60">
                  Drop a PDF or image here, or click to browse
                </span>
              )}
              <span className="text-xs text-dark_black/45 dark:text-white/45">
                PDF, JPG, PNG, or WEBP · max 8 MB
              </span>
            </button>
          </div>
          <div className="w-full">
            <label htmlFor="message" className="text-sm font-medium">
              Cover note
            </label>
            <textarea
              className="mt-2 w-full rounded-3xl border border-dark_black/10 bg-dark_black/3 px-5 py-3 outline-hidden transition focus:border-purple_blue/40 dark:border-white/15 dark:bg-black/40 dark:focus:border-purple_blue/50"
              id="message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us why you're a fit for this role"
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-pink" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          {!loader ? (
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-between gap-3 rounded-full border border-purple_blue bg-purple_blue py-2.5 pl-5 pr-2 font-medium text-white transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue sm:w-fit"
            >
              <span>Submit application</span>
              <svg
                width="36"
                height="36"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transform transition-transform duration-200 ease-in-out group-hover:rotate-45"
              >
                <rect
                  width="32"
                  height="32"
                  rx="16"
                  className="fill-white transition-colors duration-200 ease-in-out group-hover:fill-purple_blue"
                />
                <path
                  d="M11.832 11.3334H20.1654M20.1654 11.3334V19.6668M20.1654 11.3334L11.832 19.6668"
                  stroke="#1B1D1E"
                  strokeWidth="1.42857"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-dark_black transition-colors duration-200 ease-in-out group-hover:stroke-white"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-full bg-dark_black/10 px-7 py-3 dark:bg-white/10"
            >
              <div
                className="inline-block size-5 animate-spin rounded-full border-[3px] border-current border-t-transparent text-purple_blue"
                role="status"
                aria-label="loading"
              />
              Submitting
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
