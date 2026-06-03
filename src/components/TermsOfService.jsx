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
          <span style={{ color: '#555', fontSize: 11 }}>Last updated: 31 May 2026</span>
        </div>

        <div style={S.body}>
          <p style={S.p}>
            Welcome to <strong style={{ color: '#fff' }}>A* Battle Plan</strong> ("the App"), an A-Level and GCSE
            revision tracking tool. By creating an account, you agree to these Terms of Service and Privacy Policy.
            Please read them carefully.
          </p>

          <div style={{ background:'rgba(255,165,0,0.08)', border:'1px solid rgba(255,165,0,0.25)',
            borderRadius:6, padding:'10px 14px', margin:'8px 0 16px', fontSize:12, color:'#fbbf24', lineHeight:1.6 }}>
            <strong>Important notice:</strong> Information on this App — including exam dates, grade boundaries, and predicted grades — is provided for guidance only and may not be accurate or up to date. Always verify exam dates with your school and the official exam board. A* Battle Plan is not responsible for decisions made based on this information. Do your own due diligence.
          </div>

          <h2 style={S.h2}>1. Who We Are</h2>
          <p style={S.p}>
            A* Battle Plan is an independent revision tracking application built for UK A-Level and GCSE students.
            For questions or data requests, contact: <strong style={{ color: '#ddd' }}>51r4h100@gmail.com</strong>.
            Physical correspondence address available on request.
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
            • <strong style={{ color: '#ddd' }}>Email address</strong> — provided via Google OAuth or email sign-up, used to identify your account and send transactional emails<br />
            • <strong style={{ color: '#ddd' }}>Display name</strong> — from your Google profile or set by you, shown on leaderboards<br />
            • <strong style={{ color: '#ddd' }}>Account creation timestamp</strong><br />
            • <strong style={{ color: '#ddd' }}>Last seen timestamp</strong> — updated each time you open the app, used for retention analytics<br />
            • <strong style={{ color: '#ddd' }}>ToS agreement timestamp</strong> — recorded when you accept these Terms<br />
            • <strong style={{ color: '#ddd' }}>Exam level</strong> — whether you are an A-Level or GCSE student<br />
            • <strong style={{ color: '#ddd' }}>Year group</strong> — e.g. Y12 or Y11, used to personalise your countdown and plan<br />
            • <strong style={{ color: '#ddd' }}>Selected subjects, exam boards, and option modules</strong><br />
            • <strong style={{ color: '#ddd' }}>Referral code</strong> — a short unique code generated for your account<br />
            • <strong style={{ color: '#ddd' }}>Pro waitlist status</strong> — if you join the Pro waitlist, your email and sign-up timestamp are recorded
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
            • <strong style={{ color: '#ddd' }}>Supabase</strong> — database and authentication (including email/password sign-up). Your data is stored on Supabase's EU/US infrastructure. See supabase.com/privacy.<br />
            • <strong style={{ color: '#ddd' }}>Google OAuth</strong> — optional sign-in method. We receive your email and display name only. We do not access Google Drive, Gmail, or any other Google service.<br />
            • <strong style={{ color: '#ddd' }}>Google Gemini API</strong> — powers the AI companion chat feature. Messages you send to the companion are sent to Google's Gemini API for processing. Do not include personal or sensitive information in chat messages. Google's AI data usage policies apply. Chat messages are not stored by A* Battle Plan beyond the current session.<br />
            • <strong style={{ color: '#ddd' }}>Resend</strong> — used to send transactional emails (account confirmation, schedule summaries, Pro waitlist notifications). See resend.com/privacy.<br />
            • <strong style={{ color: '#ddd' }}>Stripe</strong> — used to process Pro subscription payments (not yet live). Stripe stores your payment details; we store only your Stripe customer ID and subscription status. See stripe.com/privacy.<br />
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

          <h2 style={S.h2}>14. Copyright &amp; User-Uploaded Content</h2>
          <p style={S.p}>
            You must not upload, share, or reproduce copyrighted exam materials (including past papers, mark schemes,
            or examiner reports) through this App in a way that infringes the rights of exam boards (AQA, Edexcel,
            OCR, WJEC, CAIE, or others). The App is for personal revision tracking — paper scores and notes you
            log are your own data.
          </p>
          <p style={S.p}>
            If you believe content on this platform infringes your copyright, please contact
            <strong style={{ color: '#ddd' }}> 51r4h100@gmail.com</strong> with: (1) a description of the work,
            (2) where the infringing material appears, and (3) your contact details. We will investigate and
            remove infringing content within 14 days of a valid notice.
          </p>

          <h2 style={S.h2}>15. AI Companion Disclaimer</h2>
          <p style={S.p}>
            The AI companion chat (powered by Google Gemini) can make mistakes. Responses are generated by an AI
            and are not verified by education professionals. Do not rely solely on AI responses for exam preparation,
            grade predictions, or academic decisions. Always cross-check with your teachers, official mark schemes,
            and exam board guidance.
          </p>
          <p style={S.p}>
            Do not share personal information, exam centre numbers, passwords, or other sensitive data in the chat.
            Chat messages are sent to Google's servers for processing.
          </p>

          <h2 style={S.h2}>16. Email Communications</h2>
          <p style={S.p}>
            By creating an account, you may receive transactional emails (account confirmation, password reset,
            exam schedule summaries if you request them). If you join the Pro waitlist, you consent to receiving
            one notification email when Pro launches.
          </p>
          <p style={S.p}>
            To unsubscribe from non-essential emails, email <strong style={{ color: '#ddd' }}>51r4h100@gmail.com</strong> with
            "Unsubscribe" in the subject line, or use the unsubscribe link included in every email we send.
            Transactional emails (e.g. account confirmation) cannot be opted out of while your account is active.
          </p>

          <h2 style={S.h2}>17. Information Accuracy Disclaimer</h2>
          <p style={S.p}>
            Exam dates, grade boundaries, and grade predictions shown in this App are based on publicly available
            historical data and are provided for guidance only. They may be out of date, incomplete, or incorrect.
            A* Battle Plan makes no guarantee of accuracy. Always verify exam dates with your school and the official
            exam board. Predicted grades are estimates only and should not be relied upon for university applications
            or other decisions.
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
