/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
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