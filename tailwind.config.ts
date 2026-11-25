import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { brand: "#FF5A00", ink: "#0F0F11" } } }, plugins: [] };
export default config;