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
          <span style={{ color: '#555', fontSize: 11 }}>Last updated: 6 May 2026</span>
        </div>

        <div style={S.body}>
          <p style={S.p}>
            Welcome to <strong style={{ color: '#fff' }}>A* Battle Plan</strong> ("the App"), an A-Level revision
            tracking tool. By creating an account, you agree to these Terms of Service. Please read them carefully.
          </p>

          <h2 style={S.h2}>1. Who We Are</h2>
          <p style={S.p}>
            A* Battle Plan is an independent revision tracking application. For questions, contact:
            <strong style={{ color: '#ddd' }}> 51r4h100@gmail.com</strong>.
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
          <p style={S.p}>We collect and store the following data when you use the App:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Email address</strong> — used to identify your account<br />
            • <strong style={{ color: '#ddd' }}>Revision data</strong> — past paper scores, error logs, topic
            checklist progress, and target grades that you voluntarily enter<br />
            • <strong style={{ color: '#ddd' }}>Usage timestamps</strong> — when data was created or updated
          </p>
          <p style={S.p}>
            We do not collect your real name, phone number, school, or any payment information. We do not use
            cookies beyond what Supabase Auth requires for session management.
          </p>

          <h2 style={S.h2}>5. How We Use Your Data</h2>
          <p style={S.p}>
            Your data is used solely to provide the App's functionality — displaying your revision progress,
            analytics, and notifications. We do not sell, rent, or share your data with third parties for
            marketing purposes.
          </p>
          <p style={S.p}>
            The App administrator may access your data for support purposes (e.g. diagnosing a bug you report)
            or to ensure the App is not being abused. This access is not used for profiling or advertising.
          </p>

          <h2 style={S.h2}>6. Data Storage &amp; Security</h2>
          <p style={S.p}>
            Your data is stored securely on <strong style={{ color: '#ddd' }}>Supabase</strong> infrastructure,
            protected by Row Level Security policies that prevent any user from accessing another user's data
            without explicit admin privileges. Data is transmitted over HTTPS.
          </p>
          <p style={S.p}>
            Despite these measures, no system is 100% secure. You use the App at your own risk.
          </p>

          <h2 style={S.h2}>7. Your Rights (UK GDPR)</h2>
          <p style={S.p}>If you are based in the UK or EEA, you have the right to:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • <strong style={{ color: '#ddd' }}>Access</strong> your personal data<br />
            • <strong style={{ color: '#ddd' }}>Correct</strong> inaccurate data<br />
            • <strong style={{ color: '#ddd' }}>Delete</strong> your account and all associated data<br />
            • <strong style={{ color: '#ddd' }}>Export</strong> your data in a readable format
          </p>
          <p style={S.p}>
            To exercise any of these rights, email <strong style={{ color: '#ddd' }}>51r4h100@gmail.com</strong>.
            We will respond within 30 days. Account deletion removes all your data from our systems permanently.
          </p>

          <h2 style={S.h2}>8. Acceptable Use</h2>
          <p style={S.p}>You agree not to:</p>
          <p style={{ ...S.p, paddingLeft: 12 }}>
            • Attempt to access other users' accounts or data<br />
            • Use automated tools to scrape or overload the App<br />
            • Upload unlawful, offensive, or infringing content<br />
            • Attempt to reverse-engineer or compromise the App's security
          </p>

          <h2 style={S.h2}>9. Disclaimer of Warranties</h2>
          <p style={S.p}>
            The App is provided <strong style={{ color: '#ddd' }}>"as is"</strong> without any warranty of any
            kind. We make no guarantees that the App will be available without interruption, error-free, or that
            it will help you achieve specific exam results. Revision outcomes depend on your own effort and many
            factors outside our control.
          </p>

          <h2 style={S.h2}>10. Limitation of Liability</h2>
          <p style={S.p}>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
            consequential damages arising from your use of the App, including but not limited to loss of data
            or exam performance.
          </p>

          <h2 style={S.h2}>11. Changes to These Terms</h2>
          <p style={S.p}>
            We may update these Terms from time to time. We will notify you by updating the "Last updated" date
            at the top. Continued use of the App after changes constitutes acceptance of the updated Terms.
          </p>

          <h2 style={S.h2}>12. Governing Law</h2>
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
