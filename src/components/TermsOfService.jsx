export default function TermsOfService({ onClose }) {
  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    box: {
      background: '#0f0f18', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, width: '100%', maxWidth: 680,
      maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'JetBrains Mono','SF Mono',monospace",
    },
    header: {
      padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    body: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
    h1: { fontSize: 16, fontWeight: 800, color: '#FF3D00', margin: 0 },
    h2: { fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 24, marginBottom: 6 },
    p: { fontSize: 12, color: '#aaa', lineHeight: 1.7, margin: '6px 0' },
    footer: {
      padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'flex-end',
    },
    btn: {
      background: '#FF3D00', color: '#fff', border: 'none',
      padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    },
  };

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={S.box}>
        <div style={S.header}>
          <span style={S.h1}>Terms of Service &amp; Privacy Policy</span>
          <span style={{ color: '#555', fontSize: 11 }}>Last updated: 28 May 2026</span>
        </div>

        <div style={S.body}>
          <p style={S.p}>
            Welcome to <strong style={{ color: '#fff' }}>A* Battle Plan</strong> ("the App"), an A-Level and GCSE
            revision tracking tool. By creating an account, you agree to these Terms of Service and Privacy Policy.
            Please read them carefully.
          </p>

          <h2 style={S.h2}>1. Who We Are</h2>
          <p style={S.p}>
            A* Battle Plan is an independent revision tracking application built for UK A-Level and GCSE students.
            For questions or data requests, contact: <strong style={{ color: '#ddd' }}>51r4h100@gmail.com</strong>.
          </p>

          <h2 style={S.h2}>2. Eligibility</h2>
          <p style={S.p}>
            You must be at least 13 years old to use this App. By creating an account, you confirm that you meet
            this age requirement. If you are under 18, you confirm that a parent or guardian has reviewed and
            agreed to these Terms on your behalf.
          </p>

          <h2 style={S.h2}>3. Your Account</h2>
          <p style={S.p}>
            You are responsible for keeping your login credentials secure. You must not share your account with
            others or use someone else's account. We reserve the right to suspend accounts that violate these Terms.
          </p>

          <h2 style={S.h2}>4. What Data We Collect</h2>
          <p style={S.p}>
            We collect and store the following data when you use the App. All data is stored securely on Supabase
            servers and synced to your account so it persists across devices.
          </p>

          <p style={{ ...S.p, color: '#ddd', fontWeight: 700, marginTop: 12 }}>Account data (collected automatically on sign-in):</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Email address</strong> — provided via Google OAuth, used to identify your account<br />
            • <strong style={{ color: '#ddd' }}>Display name</strong> — from your Google profile, shown on leaderboards<br />
            • <strong style={{ color: '#ddd' }}>Account creation timestamp</strong><br />
            • <strong style={{ color: '#ddd' }}>Last seen timestamp</strong> — updated each time you open the app, used for retention analytics<br />
            • <strong style={{ color: '#ddd' }}>ToS agreement timestamp</strong> — recorded when you accept these Terms<br />
            • <strong style={{ color: '#ddd' }}>Exam level</strong> — whether you are an A-Level or GCSE student<br />
            • <strong style={{ color: '#ddd' }}>Selected subjects and exam boards</strong><br />
            • <strong style={{ color: '#ddd' }}>Referral code</strong> — a short unique code generated for your account
          </p>

          <p style={{ ...S.p, color: '#ddd', fontWeight: 700, marginTop: 12 }}>Revision data (entered voluntarily by you):</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Past paper scores</strong> — subject, paper name, mark obtained, percentage, and date logged<br />
            • <strong style={{ color: '#ddd' }}>Error log</strong> — topic, error type, notes, and date for each mistake you record<br />
            • <strong style={{ color: '#ddd' }}>RAG topic status</strong> — Red/Amber/Green confidence ratings for each topic<br />
            • <strong style={{ color: '#ddd' }}>Topic notes</strong> — any notes you attach to RAG topics<br />
            • <strong style={{ color: '#ddd' }}>Target grades</strong> — grade targets you set per subject<br />
            • <strong style={{ color: '#ddd' }}>Study sessions</strong> — subject, duration, and timestamp for each pomodoro or stopwatch session<br />
            • <strong style={{ color: '#ddd' }}>School timetable</strong> — lesson slots you fill in on the timetable view
          </p>

          <p style={{ ...S.p, color: '#ddd', fontWeight: 700, marginTop: 12 }}>Derived analytics (calculated from your data):</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Leaderboard score</strong> — your average paper percentage, used to rank you on the leaderboard<br />
            • <strong style={{ color: '#ddd' }}>Papers count</strong> — total number of past papers you have logged<br />
            • <strong style={{ color: '#ddd' }}>Battle Readiness score</strong> — a composite score calculated from your papers, errors, and topics
          </p>

          <p style={{ ...S.p, color: '#ddd', fontWeight: 700, marginTop: 12 }}>Optional social data (if you use social features):</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Friends</strong> — friend requests sent and received (stored as pairs of user IDs)<br />
            • <strong style={{ color: '#ddd' }}>Study groups</strong> — group names, invite codes, and membership (stored as user ID associations)<br />
            • <strong style={{ color: '#ddd' }}>School name and school opt-in</strong> — only if you voluntarily provide it in the profile section
          </p>

          <p style={S.p}>
            We do not collect your phone number, home address, or any payment card details. We do not use
            advertising cookies or tracking pixels.
          </p>

          <h2 style={S.h2}>5. How We Use Your Data</h2>
          <p style={S.p}>
            Your data is used to provide the App's features: tracking your revision progress, generating analytics,
            powering the leaderboard and friend comparisons, and showing your exam countdown. We do not sell, rent,
            or share your personal data with any third party for marketing or advertising purposes.
          </p>
          <p style={S.p}>
            Aggregated, anonymised analytics (e.g. "most popular subjects", "average papers per user") may be used
            to improve the App. These cannot be linked back to any individual user.
          </p>
          <p style={S.p}>
            The App administrator may access your data for support purposes (e.g. diagnosing a bug you report) or
            to ensure the App is not being abused. This access is logged and is not used for profiling or advertising.
          </p>

          <h2 style={S.h2}>6. Third-Party Services</h2>
          <p style={S.p}>We use the following third-party services to operate the App:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Supabase</strong> — database and authentication provider. Your data is stored on Supabase's EU/US infrastructure. See <span style={{ color: '#aaa' }}>supabase.com/privacy</span> for their privacy policy.<br />
            • <strong style={{ color: '#ddd' }}>Google OAuth</strong> — used for sign-in only. We receive your email and display name from Google. We do not access your Google Drive, Gmail, or any other Google data.<br />
            • <strong style={{ color: '#ddd' }}>Stripe</strong> — used to process Pro subscription payments. Stripe stores your payment details; we store only your Stripe customer ID and subscription status. See <span style={{ color: '#aaa' }}>stripe.com/privacy</span>.<br />
            • <strong style={{ color: '#ddd' }}>Vercel</strong> — the App is hosted on Vercel. Vercel may log request metadata (IP, user agent) for infrastructure purposes.
          </p>

          <h2 style={S.h2}>7. Data Storage &amp; Security</h2>
          <p style={S.p}>
            Your data is stored securely on <strong style={{ color: '#ddd' }}>Supabase</strong> infrastructure,
            protected by Row Level Security policies that prevent any user from accessing another user's data
            without explicit admin privileges. Data is transmitted over HTTPS. A local copy is cached in your
            browser's localStorage for offline access and is cleared when you sign out.
          </p>
          <p style={S.p}>
            Despite these measures, no system is 100% secure. You use the App at your own risk.
          </p>

          <h2 style={S.h2}>8. Your Rights (UK GDPR)</h2>
          <p style={S.p}>If you are based in the UK or EEA, you have the right to:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Access</strong> your personal data — email 51r4h100@gmail.com to request a full export<br />
            • <strong style={{ color: '#ddd' }}>Correct</strong> inaccurate data<br />
            • <strong style={{ color: '#ddd' }}>Delete</strong> your account and all associated data permanently<br />
            • <strong style={{ color: '#ddd' }}>Export</strong> your revision data via the in-app export (CSV download)<br />
            • <strong style={{ color: '#ddd' }}>Object</strong> to processing — contact us to discuss
          </p>
          <p style={S.p}>
            To exercise any of these rights, email <strong style={{ color: '#ddd' }}>51r4h100@gmail.com</strong>.
            We will respond within 30 days. Account deletion removes all your data from our systems permanently.
          </p>

          <h2 style={S.h2}>9. Acceptable Use</h2>
          <p style={S.p}>You agree not to:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • Attempt to access other users' accounts or data<br />
            • Use automated tools to scrape or overload the App<br />
            • Upload unlawful, offensive, or infringing content<br />
            • Attempt to reverse-engineer or compromise the App's security<br />
            • Create fake accounts or manipulate the leaderboard
          </p>

          <h2 style={S.h2}>10. Disclaimer of Warranties</h2>
          <p style={S.p}>
            The App is provided <strong style={{ color: '#ddd' }}>"as is"</strong> without any warranty of any
            kind. We make no guarantees that the App will be available without interruption, error-free, or that
            it will help you achieve specific exam results. Revision outcomes depend on your own effort and many
            factors outside our control.
          </p>

          <h2 style={S.h2}>11. Limitation of Liability</h2>
          <p style={S.p}>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
            consequential damages arising from your use of the App, including but not limited to loss of data
            or exam performance.
          </p>

          <h2 style={S.h2}>12. Changes to These Terms</h2>
          <p style={S.p}>
            We may update these Terms from time to time. We will notify you by updating the "Last updated" date
            at the top. Continued use of the App after changes constitutes acceptance of the updated Terms.
          </p>

          <h2 style={S.h2}>13. Governing Law</h2>
          <p style={S.p}>
            These Terms are governed by the laws of England and Wales. Any disputes will be subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>

          <p style={{ ...S.p, marginTop: 24, color: '#555' }}>
            Questions? Contact us at 51r4h100@gmail.com
          </p>
        </div>

        {onClose && (
          <div style={S.footer}>
            <button style={S.btn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
