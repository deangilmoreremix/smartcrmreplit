/** @type {import('tailwindcss').Config} */
export default {
  // Keep your current dark mode behavior
  darkMode: 'class',

  // The broad glob already covers the new module,
  // but we include explicit paths for clarity/safety.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',

    // Optional explicit globs (redundant if the line above exists,
    // but useful if you later move files around or split packages)
    './src/components/contacts/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/hooks/**/*.{js,ts,jsx,tsx}',
    './src/store/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
    './src/services/**/*.{js,ts,jsx,tsx}',
    './src/contexts/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // Keep ALL of your existing extensions
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },

  // Keep whatever plugins you already had; leave empty if none
  plugins: [
    // e.g., require('@tailwindcss/forms'),
    // e.g., require('@tailwindcss/typography'),
  ],
}
