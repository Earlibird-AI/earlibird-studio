// Site-owned chat copy for Earlibird Shareable Video Studio.
// The core owns welcome/feedback/form/out-of-hours lines (rendered verbatim from
// state.config); everything presentation-side lives here.
export const chatWidgetCopy = {
  // Launcher + teaser bubble (beside the closed launcher)
  launcherLabel: "Chat with Earlibird",
  panelHeading: "Need a video?",
  teaser: "Tell us what you're after and we'll point you at the right kit.",

  // Quick replies shown before the first message (live chat)
  quickReplies: ["See formats", "See brand skins", "See effects", "Start a brief"],

  // Inline status wording (only shown when error is null)
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  offline: "You're offline — messages will send when you're back.",
  loadOlder: "Load earlier messages",
  historyLoading: "Loading history…",
  loadingConfig: "Opening chat…",
  retry: "Try again",

  // Composer
  composerPlaceholder: "Type a message…",
  sendLabel: "Send",
  attachLabel: "Attach a file",
  uploadFailed: "Upload failed",

  // Contact form
  formSubmit: "Start chat",
  formSubmitting: "Sending…",
  formMissing: (fields: string[]) => `Please fill in: ${fields.join(", ")}`,
  consentRequired: "Please accept to continue.",

  // Feedback + ended
  feedbackThanks: "Thanks for the feedback!",
  restart: "Start a new chat",

  // Unsupported
  unsupported: "This chat type isn't supported here.",
};
