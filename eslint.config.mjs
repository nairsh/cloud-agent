import nextVitals from "eslint-config-next/core-web-vitals";

export default [
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
