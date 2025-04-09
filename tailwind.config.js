export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      animationDuration: {
        "5s": "5s",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
