// TypeScript 6 (TS2882) requires a module declaration for side-effect CSS imports.
// Next.js handles the actual CSS at build time; this only satisfies the type checker.
declare module "*.css";
