import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // KvizArena rebrand palette - overrides these specific slate/amber
      // shades (rather than adding new token names) since every dark
      // surface in the app already routes through exactly these three
      // slate shades and amber is the app-wide accent - this recolors the
      // whole app (including every modal) with no per-component migration.
      colors: {
        slate: { 950: '#01071b', 900: '#0d1526', 800: '#1c2740' },
        amber: { 300: '#f6cf82', 400: '#f2b84c', 500: '#e3a53a' },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
  // Without this, mobile browsers apply :hover on tap and don't clear it
  // until another element is tapped - combined with answer buttons reusing
  // the same DOM node (key={idx}) across question transitions, that stuck
  // hover state visually "carries over" a previous tap onto the next
  // question's button in the same slot.
  future: {
    hoverOnlyWhenSupported: true,
  },
}