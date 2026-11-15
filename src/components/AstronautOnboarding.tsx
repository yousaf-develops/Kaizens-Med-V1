import React, { useEffect, useRef, useState } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { AstronautGender, AstronautProfile } from '../types/telemetry';

interface AstronautOnboardingProps {
  onComplete: (profile: AstronautProfile) => void;
}

export const AstronautOnboarding: React.FC<AstronautOnboardingProps> = ({ onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<AstronautGender | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Track scroll position to control smooth emergence of the registration component
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight;
      // 0 at top, 1 when scrolled down ~0.7 of a screen
      const progress = Math.min(Math.max((scrollY - 60) / (windowH * 0.55), 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setErrorMessage('Please enter your first name.');
      return;
    }
    if (!gender) {
      setErrorMessage('Please select Male or Female.');
      return;
    }

    setErrorMessage(null);
    onComplete({
      firstName: trimmedFirst,
      ...(trimmedLast ? { lastName: trimmedLast } : {}),
      gender,
      onboardedAtISO: new Date().toISOString(),
    });
  };

  const scrollToRegistration = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div ref={containerRef} className="relative min-h-[200vh] w-full bg-[#07080B] text-white">
      {/* Fixed Spaceship Corridor Background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <img
          src="/assets/aistudio/grey_spaceship_background_287c8ce6.jpg"
          alt=""
          className="h-full w-full object-cover object-center scale-105"
        />
        {/* Subtle dynamic vignette that darkens gently as you scroll */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at center, rgba(10, 12, 16, ${0.45 + scrollProgress * 0.35}) 0%, rgba(5, 6, 8, ${0.75 + scrollProgress * 0.2}) 100%)`,
          }}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          PAGE 1: HERO VIEW (Initial screen, no registration form asked)
      ═════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 h-screen w-full flex flex-col justify-between px-6 sm:px-12 py-8 overflow-hidden select-none">
        {/* Top Mini Brand Bar */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-mono text-zinc-400">
              System Ready · Orbit Station
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-400/80">Flight Ready 2.0</span>
        </div>

        {/* Hero Middle Content: Astronaut on the Left + Cute Cloud + Huge Kaizens Med Title */}
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-14 my-auto">
          {/* LEFT: Astronaut (astro.png) + Floating 2D Cute Cloud hovering above waving hand */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            {/* The Astronaut Image */}
            <div className="relative w-64 sm:w-80 md:w-96 transition-transform duration-700 hover:scale-105">
              <img
                src="/assets/aistudio/astro.png"
                alt="Astronaut"
                className="w-full h-auto object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.85)]"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* 2D Style Cute White Speech Cloud Hovering Above Hand */}
              <div
                className="absolute -top-12 -right-4 sm:-right-8 animate-bounce"
                style={{
                  animationDuration: '3.2s',
                  animationTimingFunction: 'ease-in-out',
                }}
              >
                <div className="relative group cursor-pointer filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
                  {/* Speech bubble cloud SVG */}
                  <svg
                    viewBox="0 0 160 90"
                    className="w-36 sm:w-44 h-auto overflow-visible"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Cloud Body with crisp 2D comic black border */}
                    <path
                      d="M 35 60
                         C 15 60, 10 40, 25 28
                         C 20 12, 45 5, 60 18
                         C 75 4, 105 5, 115 20
                         C 135 15, 148 32, 140 50
                         C 150 65, 132 80, 115 75
                         C 105 85, 75 84, 65 75
                         C 52 82, 35 78, 35 60 Z"
                      fill="#FFFFFF"
                      stroke="#1E232A"
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />

                    {/* Cute Speech Tail pointing directly down towards astronaut's waving right hand */}
                    <path
                      d="M 45 74 L 28 88 L 52 76 Z"
                      fill="#FFFFFF"
                      stroke="#1E232A"
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />

                    {/* Speech Text inside the cloud in cute 2D playful cartoon font */}
                    <text
                      x="82"
                      y="52"
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="24"
                      fontWeight="900"
                      fontFamily="'Comic Sans MS', 'Chalkboard SE', 'Fredoka', 'Quicksand', cursive, sans-serif"
                      letterSpacing="0.04em"
                    >
                      hello! ✨
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Greatly Enlarged "Kaizens Med" Brand + Cinematic Pitch */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-zinc-300 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Autonomous Crew Health
            </div>

            {/* Massively Increased Size for Kaizens Med */}
            <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
              Kaizens <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
                Med
              </span>
            </h1>

            <p className="text-base sm:text-xl text-zinc-300 max-w-md font-medium leading-relaxed drop-shadow">
              Simple space health helper. Track your body, organs, sleep, and cabin air in plain words.
            </p>

            {/* Prompt to Scroll */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={scrollToRegistration}
                className="btn-mono-primary px-7 py-3 rounded-full text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Setup Profile</span>
                <ChevronDown className="h-4 w-4 animate-bounce" />
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator Prompt at Bottom */}
        <div
          onClick={scrollToRegistration}
          className="w-full flex flex-col items-center justify-center gap-1.5 cursor-pointer pb-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-medium">
            Scroll down to register
          </span>
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <span className="w-1.5 h-2.5 bg-white rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          PAGE 2: REGISTRATION COMPONENT (Emerges slowly on scroll)
      ═════════════════════════════════════════════════════════════════ */}
      <section
        ref={formRef}
        className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center px-4 py-16"
      >
        {/* Dynamic Emerge Transition wrapper: controls opacity, translate-y, and blur as user scrolls */}
        <div
          className="w-full max-w-[460px] flex flex-col items-center transition-all duration-700 ease-out"
          style={{
            opacity: Math.max(0.05, scrollProgress),
            transform: `translateY(${Math.max(0, (1 - scrollProgress) * 70)}px) scale(${0.94 + scrollProgress * 0.06})`,
            filter: `blur(${Math.max(0, (1 - scrollProgress) * 8)}px)`,
          }}
        >
          {/* Header Tag */}
          <div className="mb-4 text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-300/90 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1 rounded-full">
              Step 1 of 1 · Crew Onboarding
            </span>
          </div>

          {/* Registration Card HUD with Gunmetal and Corner Accents */}
          <div className="relative w-full p-[1px] rounded-[24px] bg-gradient-to-b from-zinc-300/50 via-zinc-500/20 to-zinc-300/40 shadow-[0_32px_80px_rgba(0,0,0,0.85)]">
            {/* Corner HUD Bracket Accents */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-[1px] -left-[1px] h-7 w-7 rounded-tl-[24px] border-t-2 border-l-2 border-zinc-200/90"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-[1px] -right-[1px] h-7 w-7 rounded-tr-[24px] border-t-2 border-r-2 border-zinc-200/90"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-7 w-7 rounded-bl-[24px] border-b-2 border-l-2 border-zinc-200/90"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-7 w-7 rounded-br-[24px] border-b-2 border-r-2 border-zinc-200/90"
            />

            <form
              onSubmit={handleSubmit}
              noValidate
              className="w-full rounded-[23px] bg-[#16181C]/95 backdrop-blur-xl px-6 sm:px-8 py-8 sm:py-9 space-y-6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              {/* Card Title & Subtitle */}
              <div className="space-y-1.5">
                <h2 className="font-display text-[26px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                  Crew Profile Setup
                </h2>
                <p className="text-sm text-zinc-400">
                  Enter your name and details to access your health dashboard.
                </p>
              </div>

              {/* First Name & Last Name Inputs */}
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="astronaut-first-name" className="sr-only">
                    First Name
                  </label>
                  <div className="relative flex items-center">
                    <User
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-zinc-400"
                    />
                    <input
                      id="astronaut-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="First Name"
                      className="w-full h-12 rounded-xl border border-zinc-500/40 bg-[#21242A]/95 pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-[#262A31] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="astronaut-last-name" className="sr-only">
                    Last Name (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <User
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-zinc-400"
                    />
                    <input
                      id="astronaut-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name (Optional)"
                      className="w-full h-12 rounded-xl border border-zinc-500/40 bg-[#21242A]/95 pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-400 focus:border-cyan-400 focus:bg-[#262A31] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Select Gender with Apple-style smooth interactive states */}
              <div className="space-y-2.5">
                <div className="text-sm font-medium text-zinc-200">
                  Select Gender
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Male Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setGender('male');
                      if (errorMessage) setErrorMessage(null);
                    }}
                    aria-pressed={gender === 'male'}
                    className={`group flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B8D8] apple-hover ${
                      gender === 'male'
                        ? 'border-[#52B8D8] bg-gradient-to-b from-[#52B8D8]/20 to-[#1B2329]/95 shadow-[0_0_24px_rgba(82,184,216,0.28),inset_0_1px_0_rgba(186,230,253,0.3)]'
                        : 'border-zinc-500/35 bg-[#1E2126]/90 hover:border-zinc-300/60 hover:bg-[#25282F]'
                    }`}
                  >
                    <svg
                      viewBox="0 0 36 36"
                      className={`h-8 w-8 transition-transform duration-200 group-hover:scale-110 ${
                        gender === 'male'
                          ? 'text-[#67CBEB] drop-shadow-[0_0_8px_rgba(82,184,216,0.65)]'
                          : 'text-zinc-300'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="14.5" cy="21.5" r="7.5" />
                      <path d="M20 16L29 7" />
                      <path d="M22.5 7H29V13.5" />
                    </svg>
                    <span
                      className={`text-sm font-medium ${
                        gender === 'male' ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      Male
                    </span>
                  </button>

                  {/* Female Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setGender('female');
                      if (errorMessage) setErrorMessage(null);
                    }}
                    aria-pressed={gender === 'female'}
                    className={`group flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5984F] apple-hover ${
                      gender === 'female'
                        ? 'border-[#E5984F] bg-gradient-to-b from-[#E5984F]/20 to-[#26211C]/95 shadow-[0_0_24px_rgba(229,152,79,0.28),inset_0_1px_0_rgba(254,215,170,0.3)]'
                        : 'border-zinc-500/35 bg-[#1E2126]/90 hover:border-zinc-300/60 hover:bg-[#25282F]'
                    }`}
                  >
                    <svg
                      viewBox="0 0 36 36"
                      className={`h-8 w-8 transition-transform duration-200 group-hover:scale-110 ${
                        gender === 'female'
                          ? 'text-[#F0A860] drop-shadow-[0_0_8px_rgba(229,152,79,0.65)]'
                          : 'text-zinc-300'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="18" cy="13.5" r="7.5" />
                      <path d="M18 21V31" />
                      <path d="M13.5 26.5H22.5" />
                    </svg>
                    <span
                      className={`text-sm font-medium ${
                        gender === 'female' ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      Female
                    </span>
                  </button>
                </div>
              </div>

              {/* Inline Validation Error */}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/40 bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-200"
                >
                  {errorMessage}
                </div>
              )}

              {/* Continue Button */}
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-300 text-[#111317] text-[15px] font-semibold tracking-tight shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_0_#ffffff] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Enter Health Dashboard
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
