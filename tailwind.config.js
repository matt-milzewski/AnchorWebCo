module.exports = {
  content: ["./src/**/*.{html,njk,md,js,json}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        surface: "#FAFAF7",
        "surface-alt": "#FFFFFF",
        accent: "#38bdf8",
        muted: "#6B7280",
        line: "#E7E5E0",
        "anchor-navy": "#0A0A0A",
        "coast-sky": "#38bdf8",
        "sand-beige": "#FAFAF7",
        "dark-text": "#0A0A0A",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
