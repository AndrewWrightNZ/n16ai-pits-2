export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pubsblue: "#2962FF",
      },
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
