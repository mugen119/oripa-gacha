import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/oripa-gacha/',  // GitHubリポジトリ名に置き換える
  plugins: [react()],
});
