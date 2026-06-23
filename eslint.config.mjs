import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "convex/_generated/**",
      "legacy/**"
    ],
  },
];

export default eslintConfig;
