import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {},
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "src/**",
      "public/**",
      "components/**",
      "lib/**",
      "styles/**",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "next-env.d.ts",
      "postcss.config.mjs",
      "tailwind.config.js"
    ],
  }
];

export default eslintConfig;
