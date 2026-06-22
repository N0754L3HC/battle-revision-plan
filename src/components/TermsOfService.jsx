export default function TermsOfService({ onClose }) {
  const ACCENT = '#b5735a';
  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(20,14,8,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    box: {
      background: '#ffffff', border: '1px solid #e7ddcc',
      borderRadius: 14, width: '100%', maxWidth: 720,
      maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(40,25,10,0.25)',
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    },
    header: {
      padding: '20px 28px', borderBottom: '1px solid #efe7d8',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    },
    body: { padding: '22px 28px 8px', overflowY: 'auto', flex: 1, color: '#3a342c' },
    h1: { fontSize: 19, fontWeight: 800, color: '#2b2620', margin: 0, letterSpacing: '-0.01em' },
    h2: { fontSize: 15, fontWeight: 700, color: '#2b2620', marginTop: 28, marginBottom: 8, letterSpacing: '-0.01em' },
    p: { fontSize: 13.5, color: '#52493d', lineHeight: 1.75, margin: '8px 0' },
    li: { fontSize: 13.5, color: '#52493d', lineHeight: 1.75, margin: '6px 0', paddingLeft: 14 },
    strong: { color: '#2b2620', fontWeight: 700 },
    sub: { color: '#6f665b', fontSize: 12 },
    label: { fontSize: 13.5, color: '#2b2620', fontWeight: 700, marginTop: 14, marginBottom: 2 },
    notice: {
      background: '#f3e3da', border: '1px solid #e8cbbb',
      borderRadius: 10, padding: '12px 16px', margin: '10px 0 18px',
      fontSize: 13, color: '#8a4a32', lineHeight: 1.65,
    },
    footer: {
      padding: '16px 28px', borderTop: '1px solid #efe7d8',
      display: 'flex', justifyContent: 'flex-end',
    },
    btn: {
      background: ACCENT, color: '#fff', border: 'none',
      padding: '10px 24px', borderRadius: 9, cursor: 'pointer',
      fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
    },
  };
  const B = ({ children }) => <strong style={S.strong}>{children}</strong>;
  const Mail = () => <B>51r4h100@gmail.com</B>;

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={S.box}>
        <div style={S.header}>
          <div>
            <span style={S.h1}>Terms of Service &amp; Privacy Policy</span>
            <div style={{ ...S.sub, marginTop: 4 }}>Battle Plan · beattheexam.org</div>
          </div>
          <span style={S.sub}>Last updated: 22 June 2026</span>
        </div>

        <div style={S.body}>
          <p style={S.p}>
            Welcome to <B>Battle Plan</B> ("Battle Plan", "the App", "we", "us", or "our"), an independent UK
            GCSE and A-Level revision tracking tool available at beattheexam.org. These Terms of Service and
            Privacy Policy (together, the "Terms") form a legally binding agreement between you and the operator
            of Battle Plan. By accessing, creating an account on, or otherwise using the App, you confirm that you
            have read, understood, and agree to be bound by these Terms. <B>If you do not agree, do not use the App.</B>
          </p>

          <div style={S.notice}>
            <B>Important — please read.</B> Information on this App — including exam dates, timetables, grade
            boundaries, predicted grades, readiness scores and AI-generated guidance — is provided for general
            guidance only, may be inaccurate, incomplete or out of date, and must not be relied upon. Always verify
            exam dates and entries with your school and the official exam board. Battle Plan is not affiliated with,
            endorsed by, or connected to AQA, Edexcel/Pearson, OCR, WJEC/Eduqas, CAIE or any exam board, school, or
            examination authority. Nothing in the App is professional, educational, careers, financial or legal
            advice. You are solely responsible for decisions you make, and you use the App at your own risk.
          </div>

          <h2 style={S.h2}>1. Who We Are &amp; How to Contact Us</h2>
          <p style={S.p}>
            Battle Plan is an independent application operated by a sole individual based in the United Kingdom.
            For any questions, data requests, complaints, copyright notices or billing queries, contact us at <Mail />.
            A physical correspondence address is available to regulators and to data subjects on reasonable request.
            We are the data controller for personal data processed through the App.
          </p>

          <h2 style={S.h2}>2. Acceptance &amp; Changes to These Terms</h2>
          <p style={S.p}>
            By using the App you accept these Terms, and where prompted you may also be asked to actively confirm
            acceptance; the date and time of your acceptance may be recorded. We may update these Terms at any time
            to reflect changes to the App, the law, or our practices. When we do, we will update the "Last updated"
            date above and, for material changes, may notify you in-app or by email. Your continued use of the App
            after changes take effect constitutes acceptance of the revised Terms. If you do not agree to a change,
            you must stop using the App and may close your account.
          </p>

          <h2 style={S.h2}>3. Eligibility &amp; Age Requirements</h2>
          <p style={S.p}>
            You must be at least <B>13 years old</B> to use the App. By creating an account you confirm that you
            meet this age requirement and that all information you provide is accurate. If you are under 18, you
            confirm that a parent or guardian has reviewed and agreed to these Terms on your behalf, and (for any
            paid features) that the bill-payer has consented. We do not knowingly collect data from children under
            13; if we learn that we have, we will delete it. If you believe a child under 13 has provided us data,
            contact <Mail />.
          </p>

          <h2 style={S.h2}>4. Your Account &amp; Security</h2>
          <p style={S.p}>
            You are responsible for keeping your login credentials confidential and for all activity that occurs
            under your account. You must not share your account, use another person's account, or impersonate
            anyone. Notify us immediately at <Mail /> if you suspect unauthorised access. We may suspend, restrict,
            or terminate accounts that we reasonably believe violate these Terms, are used unlawfully, or pose a
            risk to the App or other users — where practical, with notice.
          </p>

          <h2 style={S.h2}>5. Acceptable Use</h2>
          <p style={S.p}>You agree that you will not:</p>
          <div style={S.li}>• Attempt to access, probe, or interfere with other users' accounts or data;</div>
          <div style={S.li}>• Use bots, scrapers, or automated tools to access, copy, or overload the App;</div>
          <div style={S.li}>• Upload or transmit unlawful, defamatory, harassing, offensive, or infringing content;</div>
          <div style={S.li}>• Reverse-engineer, decompile, or attempt to compromise the App's security or infrastructure;</div>
          <div style={S.li}>• Create fake accounts, manipulate leaderboards, groups, or referrals, or abuse promotional features;</div>
          <div style={S.li}>• Use the App to build a competing product or resell access without our written permission;</div>
          <div style={S.li}>• Use the App in any way that breaches applicable law or these Terms.</div>
          <p style={S.p}>
            We may remove content and suspend access for breach of this section, and report unlawful activity to
            the authorities.
          </p>

          <h2 style={S.h2}>6. Billing, Subscriptions, Cancellation &amp; Refunds</h2>
          <p style={S.p}>
            The core App is free. <B>Battle Plan Pro</B> is an optional paid subscription that unlocks additional
            features. Payments are processed by <B>Stripe</B>; we never see or store your full card details.
          </p>
          <div style={S.label}>Price &amp; billing</div>
          <div style={S.li}>• The price and billing interval are shown clearly at checkout before you pay. By subscribing you authorise that recurring charge.</div>
          <div style={S.li}>• <B>Auto-renewal:</B> subscriptions renew automatically at the end of each billing period at the then-current price for that plan, until cancelled. We email a receipt for each payment.</div>
          <div style={S.li}>• The charge appears on your statement as <B>BEATTHEEXAM.ORG</B>.</div>
          <div style={S.li}>• If a payment fails, your access may be downgraded to the free tier until payment succeeds.</div>
          <div style={S.label}>Cancelling</div>
          <div style={S.li}>• You can cancel any time from <B>Account → Manage billing</B>, which opens the Stripe customer portal.</div>
          <div style={S.li}>• When you cancel, you keep Pro access until the end of the period you have already paid for; it then does not renew. There is no cancellation fee.</div>
          <div style={S.label}>Your 14-day cancellation right &amp; refunds</div>
          <div style={S.li}>• Under the UK Consumer Contracts Regulations 2013 you normally have 14 days to cancel a new subscription for a refund.</div>
          <div style={S.li}>• Because Pro is digital content made available immediately, by subscribing you request immediate access and acknowledge that your statutory right to cancel for a refund is lost once the service has begun to be supplied — except where the law requires otherwise or we agree at our discretion.</div>
          <div style={S.li}>• If you are charged in error, charged after cancelling, or cannot access features you paid for, email <Mail /> and we will investigate and, where appropriate, refund you. We aim to respond within 5 working days.</div>
          <div style={S.li}>• We do not generally refund part-used billing periods, but we will always act fairly and in line with your statutory rights, which these Terms do not affect.</div>
          <div style={S.label}>Under-18s &amp; the cardholder</div>
          <p style={S.p}>
            If you are under 18, you must have the bill-payer's (e.g. a parent or guardian's) permission to
            subscribe, and they agree to these billing terms. The person whose payment card is used is responsible
            for the charge and may contact us about cancellation or refunds on the account's behalf. We may change
            Pro pricing or features in future; any price change will be notified in advance and will apply only from
            your next renewal, never mid-period.
          </p>

          <h2 style={S.h2}>7. Intellectual Property</h2>
          <p style={S.p}>
            The App, including its design, code, branding, logos, text, graphics, and the selection and arrangement
            of content, is owned by us or our licensors and is protected by intellectual-property laws. We grant you
            a limited, personal, non-exclusive, non-transferable, revocable licence to use the App for your own
            personal, non-commercial revision. You may not copy, modify, distribute, sell, or create derivative works
            from any part of the App except as expressly permitted by these Terms or by law.
          </p>

          <h2 style={S.h2}>8. Your Content</h2>
          <p style={S.p}>
            "Your Content" means the data you enter — paper scores, error logs, notes, targets, study sessions,
            timetables, group names, and similar. You retain ownership of Your Content. You grant us a limited
            licence to host, store, process, and display Your Content solely to operate and provide the App to you
            (for example, syncing it across your devices and computing your analytics). You are responsible for Your
            Content and confirm you have the right to submit it and that it does not infringe any third party's
            rights or any law.
          </p>

          <h2 style={S.h2}>9. Exam-Board Materials &amp; Copyright Notices</h2>
          <p style={S.p}>
            You must not upload, share, or reproduce copyrighted exam materials (including past papers, mark schemes,
            or examiner reports) through the App in a way that infringes the rights of exam boards (AQA,
            Edexcel/Pearson, OCR, WJEC/Eduqas, CAIE, or others). The App is for personal revision tracking — the
            scores and notes you log are your own data.
          </p>
          <p style={S.p}>
            If you believe content on this platform infringes your copyright, contact <Mail /> with: (1) a
            description of the work; (2) where the infringing material appears; and (3) your contact details. We will
            investigate and remove infringing content within 14 days of a valid notice.
          </p>

          <h2 style={S.h2}>10. AI Companion Disclaimer</h2>
          <p style={S.p}>
            The AI companion chat (powered by Google Gemini) can make mistakes. Responses are generated by an AI and
            are not verified by education professionals. Do not rely solely on AI responses for exam preparation,
            grade predictions, or academic decisions — always cross-check with your teachers, official mark schemes,
            and exam board guidance. Do not share personal information, exam centre numbers, passwords, or other
            sensitive data in the chat; messages are sent to Google's servers for processing.
          </p>

          <h2 style={S.h2}>11. What Data We Collect</h2>
          <p style={S.p}>
            We collect and store the following data when you use the App. Data is stored securely on Supabase
            infrastructure and synced to your account so it persists across devices.
          </p>
          <div style={S.label}>Account data (collected on sign-in):</div>
          <div style={S.li}>• <B>Email address</B> — via Google OAuth or email sign-up, to identify your account and send transactional emails</div>
          <div style={S.li}>• <B>Display name</B> — from your Google profile or set by you, shown on leaderboards</div>
          <div style={S.li}>• <B>Account creation &amp; last-seen timestamps</B> — used for sync and retention analytics</div>
          <div style={S.li}>• <B>ToS agreement timestamp</B> — recorded when you accept these Terms</div>
          <div style={S.li}>• <B>Exam level, year group, subjects, exam boards, and option modules</B> — to personalise your plan and countdown</div>
          <div style={S.li}>• <B>Referral code</B> — a short unique code generated for your account</div>
          <div style={S.li}>• <B>Pro waitlist status</B> — if you join the waitlist, your email and sign-up timestamp are recorded</div>
          <div style={S.label}>Revision data (entered voluntarily by you):</div>
          <div style={S.li}>• <B>Past paper scores, error log, RAG topic status, topic notes, target grades, study sessions, and school timetable</B></div>
          <div style={S.label}>Derived analytics (calculated from your data):</div>
          <div style={S.li}>• <B>Leaderboard score, papers count, and Battle Readiness score</B></div>
          <div style={S.label}>Optional social data (only if you use social features):</div>
          <div style={S.li}>• <B>Friends, study groups, and school name/opt-in</B> — stored as user-ID associations and only what you provide</div>
          <p style={S.p}>
            We do not collect your phone number, home address, or any payment card details. We do not use advertising
            cookies or tracking pixels. Payment data is handled solely by Stripe.
          </p>

          <h2 style={S.h2}>12. How We Use Your Data &amp; Legal Basis</h2>
          <p style={S.p}>
            We use your data to provide the App's features (tracking progress, generating analytics, powering the
            leaderboard and friend comparisons, showing your countdown), to operate and secure the service, to
            communicate with you, and to comply with our legal obligations. Under UK GDPR our lawful bases are:
            <B> performance of a contract</B> (providing the App you signed up for), <B>legitimate interests</B>
            {' '}(securing and improving the App, preventing abuse), <B>consent</B> (optional features such as the
            Pro waitlist or school opt-in, which you may withdraw), and <B>legal obligation</B> where applicable.
            We do not sell, rent, or share your personal data for third-party marketing or advertising. Aggregated,
            anonymised analytics that cannot identify you may be used to improve the App. The administrator may
            access your data only for support, security, or abuse-prevention purposes.
          </p>

          <h2 style={S.h2}>13. Third-Party Services (Sub-Processors)</h2>
          <div style={S.li}>• <B>Supabase</B> — database and authentication; stores your data on EU/US infrastructure. See supabase.com/privacy.</div>
          <div style={S.li}>• <B>Google OAuth</B> — optional sign-in; we receive your email and display name only.</div>
          <div style={S.li}>• <B>Google Gemini API</B> — powers the AI companion; messages you send are processed by Google and not stored by us beyond the session.</div>
          <div style={S.li}>• <B>Resend</B> — sends transactional and requested emails. See resend.com/legal.</div>
          <div style={S.li}>• <B>Stripe</B> — processes Pro payments; Stripe stores your payment details, we store only your Stripe customer ID and subscription status. See stripe.com/privacy.</div>
          <div style={S.li}>• <B>Vercel</B> — hosts the App and may log request metadata (IP, user agent) for infrastructure and security. See vercel.com/legal/privacy-policy.</div>

          <h2 style={S.h2}>14. Data Storage, Security &amp; Retention</h2>
          <p style={S.p}>
            Your data is stored on <B>Supabase</B> infrastructure, protected by Row Level Security policies that
            prevent any user from accessing another user's data without explicit admin privileges. Data is
            transmitted over HTTPS. A local copy may be cached in your browser's localStorage for offline access and
            is cleared when you sign out. We retain your data for as long as your account is active; if you delete
            your account, your data is permanently removed from our systems, subject to any short period needed for
            backups or legal compliance. Despite our measures, <B>no system is 100% secure</B> and you use the App at
            your own risk.
          </p>

          <h2 style={S.h2}>15. International Data Transfers</h2>
          <p style={S.p}>
            Some of our sub-processors may process data outside the UK/EEA (for example in the United States). Where
            this happens, we rely on appropriate safeguards such as the providers' standard contractual clauses or
            equivalent transfer mechanisms to protect your data in line with UK GDPR.
          </p>

          <h2 style={S.h2}>16. Cookies &amp; Local Storage</h2>
          <p style={S.p}>
            We use only essential storage required to operate the App — primarily browser localStorage to keep you
            signed in, cache your data for offline use, and remember preferences. We do not use advertising or
            cross-site tracking cookies. Clearing your browser storage or signing out removes the local copy.
          </p>

          <h2 style={S.h2}>17. Your Rights (UK GDPR)</h2>
          <p style={S.p}>If you are in the UK or EEA, you have the right to:</p>
          <div style={S.li}>• <B>Access</B> your personal data — email <Mail /> to request a full export</div>
          <div style={S.li}>• <B>Rectify</B> inaccurate data and <B>complete</B> incomplete data</div>
          <div style={S.li}>• <B>Erase</B> your account and all associated data permanently</div>
          <div style={S.li}>• <B>Port</B> your revision data via the in-app export (CSV download)</div>
          <div style={S.li}>• <B>Restrict</B> or <B>object</B> to processing, and <B>withdraw consent</B> where processing is based on consent</div>
          <p style={S.p}>
            To exercise any of these, email <Mail />. We will respond within 30 days. You also have the right to
            lodge a complaint with the UK Information Commissioner's Office (ICO) at ico.org.uk, though we'd
            appreciate the chance to resolve your concern first.
          </p>

          <h2 style={S.h2}>18. Email Communications</h2>
          <p style={S.p}>
            By creating an account you may receive transactional emails (account confirmation, password reset, and
            exam schedule summaries if you request them). If you join the Pro waitlist, you consent to one
            notification email when Pro launches. To unsubscribe from non-essential emails, use the unsubscribe link
            in any such email or email <Mail /> with "Unsubscribe" in the subject. Transactional emails necessary to
            operate your account cannot be opted out of while your account is active.
          </p>

          <h2 style={S.h2}>19. Information Accuracy Disclaimer</h2>
          <p style={S.p}>
            Exam dates, grade boundaries, and grade predictions are based on publicly available historical data and
            are provided for guidance only. They may be out of date, incomplete, or incorrect. Battle Plan makes no
            guarantee of accuracy. Always verify exam dates with your school and the official exam board. Predicted
            grades are estimates only and must not be relied upon for university applications or any other decisions.
          </p>

          <h2 style={S.h2}>20. Disclaimer of Warranties</h2>
          <p style={S.p}>
            The App is provided <B>"as is"</B> and <B>"as available"</B> without warranties of any kind, whether
            express, implied, or statutory, including any implied warranties of merchantability, fitness for a
            particular purpose, accuracy, or non-infringement, to the maximum extent permitted by law. We do not
            warrant that the App will be uninterrupted, secure, error-free, or that it will help you achieve any
            particular exam result. Revision outcomes depend on your own effort and many factors outside our control.
          </p>

          <h2 style={S.h2}>21. Limitation of Liability</h2>
          <p style={S.p}>
            Nothing in these Terms excludes or limits our liability for death or personal injury caused by our
            negligence, for fraud or fraudulent misrepresentation, or for any liability that cannot be excluded or
            limited under applicable law (including your statutory rights as a consumer). Subject to that, to the
            maximum extent permitted by law: we are not liable for any indirect, incidental, special, or
            consequential loss; for loss of data, profits, revenue, goodwill, or anticipated savings; or for loss of
            exam performance or academic outcomes. Our total aggregate liability arising out of or in connection
            with the App will not exceed the greater of (a) the total amount you paid us in the 12 months before the
            event giving rise to the claim, or (b) £50.
          </p>

          <h2 style={S.h2}>22. Indemnity</h2>
          <p style={S.p}>
            To the extent permitted by law, you agree to indemnify and hold us harmless from any claims, losses,
            liabilities, and reasonable costs (including legal fees) arising out of your misuse of the App, your
            breach of these Terms, or your infringement of any third party's rights. This does not apply to the
            extent a claim results from our own breach or negligence.
          </p>

          <h2 style={S.h2}>23. Suspension &amp; Termination</h2>
          <p style={S.p}>
            You may stop using the App and delete your account at any time. We may suspend or terminate your access,
            with or without notice, if you breach these Terms, if required by law, or to protect the App or other
            users. On termination, your licence to use the App ends; sections that by their nature should survive
            (including IP, disclaimers, limitation of liability, indemnity, and governing law) will continue to apply.
          </p>

          <h2 style={S.h2}>24. Third-Party Links &amp; Force Majeure</h2>
          <p style={S.p}>
            The App may link to third-party websites or services we do not control; we are not responsible for their
            content or practices, and your use of them is at your own risk. We are not liable for any failure or
            delay in performance caused by events beyond our reasonable control, including outages of third-party
            providers, network failures, or acts of God.
          </p>

          <h2 style={S.h2}>25. General</h2>
          <p style={S.p}>
            <B>Assignment:</B> you may not transfer your rights under these Terms; we may assign ours to a successor
            of the App. <B>Severability:</B> if any provision is found unenforceable, the rest remain in effect.
            <B> No waiver:</B> our failure to enforce a right is not a waiver of it. <B>Entire agreement:</B> these
            Terms are the entire agreement between you and us regarding the App and supersede prior understandings.
            <B> No third-party rights:</B> no one other than you and us has rights to enforce these Terms.
          </p>

          <h2 style={S.h2}>26. Governing Law &amp; Jurisdiction</h2>
          <p style={S.p}>
            These Terms and any dispute arising out of or in connection with them are governed by the laws of
            <B> England and Wales</B>. Disputes are subject to the exclusive jurisdiction of the courts of England
            and Wales, except that if you are a consumer resident elsewhere in the UK you may also bring proceedings
            in your home jurisdiction, and nothing affects your mandatory local consumer rights.
          </p>

          <p style={{ ...S.p, marginTop: 26, marginBottom: 8, color: '#6f665b' }}>
            Questions, requests, or complaints? Contact us at <Mail />.
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
