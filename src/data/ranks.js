// ── Tiers ───────────────────────────────────────────────────────────────────
// Presentation copy for the two ranks. Entitlement always comes from
// subscription_status on the backend - these names are marketing only.
export const RANKS = {
  recruit: {
    id:'recruit', name:'Recruit', price:'Free', tag:'Everyone starts here',
    blurb:"Everything you need to track papers, see how ready you are, and revise smart - free, forever.",
    perks:[
      'Track every paper, topic & grade',
      'Readiness score + weak-topic radar',
      'Exam countdown & study plan',
      'AI paper marking - a few a day',
      'Ask Caps - a few chats a day',
    ],
  },
  commander: {
    id:'commander', name:'Commander', price:'£8.99/mo', tag:'For serious revision',
    blurb:"Unlock the full arsenal - generous AI marking, unlimited Caps, and emailed battle reports.",
    perks:[
      'Everything in Recruit',
      'Generous daily AI marking',
      'Unlimited Caps companion chat',
      'Emailed schedule & weekly digest',
      'Priority access to new features',
    ],
  },
};
export const rankName = isPro => (isPro ? 'Commander' : 'Recruit');
