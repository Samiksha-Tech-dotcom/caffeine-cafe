// Local pe (npm run dev) backend ka address localhost hai.
// Deploy ke baad ye khaali ("") rehta hai, aur Vercel khud request ko backend tak bhej deta hai.
export const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:5000" : "");