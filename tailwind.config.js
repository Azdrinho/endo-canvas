/** @type {import('tailwindcss').Config} */
// Ported verbatim from the `tailwind.config = { ... }` block that used to sit
// inline in index.html next to the play-CDN script. Nothing here is new: the
// same darkMode strategy, fonts and color overrides, so every existing class
// keeps the meaning it had.
export default {
  // Everything that can contribute a class name. services/emailTemplate.ts is
  // included because the card generators emit `class="akira-font"` and friends
  // into the HTML they build.
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],

  // App.tsx hardcodes a `dark` class on the root element and never toggles it.
  // Tailwind's default strategy would instead activate `dark:` variants from
  // the OS's prefers-color-scheme, so on any machine set to light every `dark:`
  // utility was skipped and its light fallback showed through — the washed-out
  // background coworkers reported. 'class' makes the class the sole source of
  // truth, so the app is dark everywhere.
  darkMode: 'class',

  theme: {
    extend: {
      fontFamily: {
        sans: ['"Orkney"', 'Inter', 'sans-serif'],
        orkney: ['"Orkney"', 'sans-serif'],
      },
      colors: {
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        purple: {
          500: '#a855f7',
          600: '#9333ea',
        },
      },
    },
  },

  plugins: [],
};
