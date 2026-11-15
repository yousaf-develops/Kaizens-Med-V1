import React, { useState } from 'react';
import { User } from 'lucide-react';
import { AstronautGender, AstronautProfile } from '../types/telemetry';

interface AstronautOnboardingProps {
  onComplete: (profile: AstronautProfile) => void;
}

export const AstronautOnboarding: React.FC<AstronautOnboardingProps> = ({
  onComplete,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<AstronautGender | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setErrorMessage('Please enter your first name to continue.');
      return;
    }
    if (!gender) {
      setErrorMessage('Please select Male or Female to configure your personal baseline.');
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#16181C] text-white flex flex-col items-center justify-center px-4 py-10">
      {/* Exact Uploaded Grey Spaceship Corridor Background (Zero Blur) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <img
          src="/assets/aistudio/grey_spaceship_background_287c8ce6.jpg"
          alt="Spaceship interior corridor"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
        {/* Subtle edge vignette only for text contrast — preserves sharp unblurred spaceship details */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, rgba(16, 18, 22, 0.22) 0%, rgba(12, 13, 16, 0.48) 100%)',
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[460px] flex flex-col items-center">
        {/* Top Kaizens Med Wordmark */}
        <div className="mb-5 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Kaizens <span className="text-zinc-300 font-medium">Med</span>
          </span>
        </div>

        {/* Gunmetal Steel Registration HUD Card (Matches Grey Spaceship Theme, Unblurred Background) */}
        <div className="relative w-full p-[1px] rounded-[22px] bg-gradient-to-b from-zinc-300/45 via-zinc-500/20 to-zinc-300/35 shadow-[0_28px_72px_rgba(0,0,0,0.82)]">
          {/* Corner HUD Bracket Accents */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1px] -left-[1px] h-7 w-7 rounded-tl-[22px] border-t-2 border-l-2 border-zinc-200/85"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1px] -right-[1px] h-7 w-7 rounded-tr-[22px] border-t-2 border-r-2 border-zinc-200/85"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-7 w-7 rounded-bl-[22px] border-b-2 border-l-2 border-zinc-200/85"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-7 w-7 rounded-br-[22px] border-b-2 border-r-2 border-zinc-200/85"
          />

          <form
            onSubmit={handleSubmit}
            noValidate
            className="w-full rounded-[21px] bg-[#16181C]/92 px-6 sm:px-8 py-8 sm:py-9 space-y-6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
          >
            {/* Card Title & Subtitle */}
            <div className="space-y-1.5">
              <h1 className="font-display text-[26px] sm:text-[28px] font-bold tracking-tight text-white leading-tight">
                Create Your Account
              </h1>
              <p className="text-sm text-zinc-400">
                Let&apos;s get you set up for your mission.
              </p>
            </div>

            {/* First Name (Required) & Last Name (Optional) Inputs — No Email, No Role */}
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
                    autoFocus
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="First Name"
                    className="w-full h-12 rounded-xl border border-zinc-500/40 bg-[#21242A]/95 pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-400 focus:border-zinc-200 focus:bg-[#262A31] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/40 transition-colors"
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
                    className="w-full h-12 rounded-xl border border-zinc-500/40 bg-[#21242A]/95 pl-11 pr-4 text-[15px] text-white placeholder:text-zinc-400 focus:border-zinc-200 focus:bg-[#262A31] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/40 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Select Gender (Matched to Grey Spaceship Gunmetal + Bulkhead Cyan / Pillar Amber Accents) */}
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
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B8D8] ${
                    gender === 'male'
                      ? 'border-[#52B8D8] bg-gradient-to-b from-[#52B8D8]/20 to-[#1B2329]/95 shadow-[0_0_24px_rgba(82,184,216,0.24),inset_0_1px_0_rgba(186,230,253,0.28)]'
                      : 'border-zinc-500/35 bg-[#1E2126]/90 hover:border-zinc-300/60 hover:bg-[#25282F]'
                  }`}
                >
                  <svg
                    viewBox="0 0 36 36"
                    className={`h-8 w-8 transition-transform duration-150 group-hover:scale-105 ${
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
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5984F] ${
                    gender === 'female'
                      ? 'border-[#E5984F] bg-gradient-to-b from-[#E5984F]/20 to-[#26211C]/95 shadow-[0_0_24px_rgba(229,152,79,0.24),inset_0_1px_0_rgba(254,215,170,0.28)]'
                      : 'border-zinc-500/35 bg-[#1E2126]/90 hover:border-zinc-300/60 hover:bg-[#25282F]'
                  }`}
                >
                  <svg
                    viewBox="0 0 36 36"
                    className={`h-8 w-8 transition-transform duration-150 group-hover:scale-105 ${
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

            {/* Inline Validation Message */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-200"
              >
                {errorMessage}
              </div>
            )}

            {/* Brushed Metallic Titanium Continue CTA */}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-300 text-[#111317] text-[15px] font-semibold tracking-tight shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_0_#ffffff] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
