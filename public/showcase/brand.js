/* ─────────────────────────────────────────────────────────────────────────────
   BRAND SETTINGS: the one file to edit to make this showcase yours.
   Everything on the page that names the business reads from here.
   (Claude: see CLAUDE.md at the repo root for the full rebrand checklist.)
   ───────────────────────────────────────────────────────────────────────────── */
window.BRAND = {
  name: "Earlibird",                       // business name, used in titles and text
  website: "https://earlibird.ai",         // main website (call-to-action button)
  websiteLabel: "earlibird.ai",

  // Logo shown top-left. Put the file in public/showcase/media/brand/. Use a light logo: the page is dark.
  // Set logo to "" to show `name` as text instead.
  logo: "media/brand/lockup-white.png",
  icon: "media/brand/icon-yellow.png",     // browser-tab icon (square PNG)

  // Your accent colour: dots, saved stars and highlights. Keep it bright enough to read on near-black.
  accent: "#F3D053",
  // true = the skin previews use your accent instead of the original yellow.
  recolorSkins: false,

  // Page text
  pageTitle: "Earlibird Shareable Video Studio",
  eyebrow: "Earlibird shareable video studio",
  heroTitle: "Pick your",
  heroItalic: "starting point",
  lede: "Every example on this page was made with Earlibird's video kits. Browse the formats, try the brand skins, scrub through the effects, then save the ones you like and copy a ready-to-fill brief.",
  ctaTitle: "Want one made for your business?",
  ctaText: "Send your brief to the Earlibird team and we'll take it from there.",
  briefTitle: "EARLIBIRD VIDEO BRIEF",
  footer: "All examples were made by Earlibird. Sample numbers, names and businesses are illustrative. Videos are shown muted unless marked \"Sound on\".",
  skinKicker: "Earlibird.ai",             // small label on the skin preview phones

  // "Make your own" box in Start here. Set downloadUrl to "" to hide it.
  repoUrl: "https://github.com/Earlibird-AI/earlibird-studio",
  downloadUrl: "https://github.com/Earlibird-AI/earlibird-studio/archive/refs/heads/main.zip",
};
