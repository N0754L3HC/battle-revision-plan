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
      padding: '18px 26px', borderBottom: '1px solid #efe7d8',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    },
    body: { padding: '18px 26px 6px', overflowY: 'auto', flex: 1, color: '#5a5247' },
    h1: { fontSize: 15, fontWeight: 700, color: '#2b2620', margin: 0, letterSpacing: '0' },
    h2: { fontSize: 11.5, fontWeight: 700, color: '#3a342c', marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' },
    p: { fontSize: 10.5, color: '#6a6155', lineHeight: 1.55, margin: '5px 0', textAlign: 'justify' },
    sub: { color: '#9a9082', fontSize: 10 },
    strong: { color: '#3a342c', fontWeight: 600 },
    footer: {
      padding: '14px 26px', borderTop: '1px solid #efe7d8',
      display: 'flex', justifyContent: 'flex-end',
    },
    btn: {
      background: ACCENT, color: '#fff', border: 'none',
      padding: '9px 22px', borderRadius: 9, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    },
  };
  const B = ({ children }) => <strong style={S.strong}>{children}</strong>;

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={S.box}>
        <div style={S.header}>
          <div>
            <span style={S.h1}>Terms of Service and Privacy Policy</span>
            <div style={{ ...S.sub, marginTop: 3 }}>Battle Plan · beattheexam.org</div>
          </div>
          <span style={S.sub}>Effective and last revised: 22 June 2026</span>
        </div>

        <div style={S.body}>
          <p style={{ ...S.p, fontSize: 10, color: '#7a7064', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            PLEASE READ THESE TERMS OF SERVICE AND PRIVACY POLICY (TOGETHER WITH ALL DOCUMENTS REFERRED TO HEREIN OR
            INCORPORATED HEREIN BY REFERENCE, COLLECTIVELY, THESE "TERMS") CAREFULLY AND IN THEIR ENTIRETY BEFORE
            ACCESSING OR USING THE SERVICE (AS DEFINED BELOW). THESE TERMS CONSTITUTE A LEGALLY BINDING AGREEMENT.
            BY ACCESSING, BROWSING, REGISTERING FOR, OR OTHERWISE UTILISING THE SERVICE IN ANY MANNER WHATSOEVER, YOU
            ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND IRREVOCABLY AGREE TO BE BOUND BY THESE TERMS AND BY ALL
            APPLICABLE LAWS AND REGULATIONS GOVERNING THE SAME. IF YOU DO NOT AGREE WITH ANY PORTION OF THESE TERMS,
            YOU ARE NOT AUTHORISED TO ACCESS OR USE THE SERVICE AND MUST DISCONTINUE ALL USE IMMEDIATELY.
          </p>

          <h2 style={S.h2}>1. Definitions, Construction and Interpretation</h2>
          <p style={S.p}>
            1.1. In these Terms, unless the context otherwise requires or unless otherwise expressly provided herein,
            the following terms shall bear the meanings ascribed to them: "Service" means, collectively and
            individually, the Battle Plan software application, website, application programming interfaces, content,
            features, and functionality made available at beattheexam.org and any associated subdomains, properties,
            or successor properties, in each case as the same may be modified, updated, supplemented, or discontinued
            from time to time; "we", "us", "our", and "the Operator" mean the natural person operating the Service
            within the United Kingdom; "you", "your", and "the User" mean the individual accessing or using the
            Service; and "Personal Data", "Processing", "Controller", and "Processor" shall bear the respective
            meanings given to them under Applicable Data Protection Law.
          </p>
          <p style={S.p}>
            1.2. The headings and sub-headings contained herein are inserted for convenience of reference only and
            shall not affect, limit, expand, or otherwise be relevant to the construction or interpretation of these
            Terms. Words importing the singular include the plural and vice versa; words importing any gender include
            every gender; references to "including", "include", or "in particular" shall be construed as being by way
            of illustration or emphasis only and shall not be construed as, nor shall they take effect as, limiting
            the generality of any preceding words; and the words "herein", "hereof", and "hereunder" refer to these
            Terms as a whole and not to any particular provision hereof.
          </p>
          <p style={S.p}>
            1.3. For the avoidance of doubt, and notwithstanding anything to the contrary herein, no rule of
            construction to the effect that ambiguities are to be resolved against the drafting party shall be applied
            in the interpretation of these Terms.
          </p>

          <h2 style={S.h2}>2. Acceptance, Variation and Continuing Effect</h2>
          <p style={S.p}>
            2.1. Your access to and use of the Service is conditioned upon your unconditional and ongoing acceptance
            of, and continuing compliance with, these Terms. Where you are prompted to indicate acceptance through any
            affirmative mechanism, the date, time, and fact of such acceptance may be recorded and retained for
            evidentiary and compliance purposes.
          </p>
          <p style={S.p}>
            2.2. We reserve the right, at our sole, absolute, and unfettered discretion, at any time and from time to
            time, with or without prior notice, to modify, amend, vary, supplement, restate, or otherwise alter these
            Terms in whole or in part, including but not limited to the addition or removal of provisions. Any such
            modification shall become effective upon the posting of the revised Terms or upon such other date as we
            may designate. Your continued access to or use of the Service following the effectiveness of any such
            modification shall constitute your conclusive acceptance thereof. It is your sole responsibility to review
            these Terms periodically to apprise yourself of any modifications.
          </p>

          <h2 style={S.h2}>3. Eligibility, Capacity and Minors</h2>
          <p style={S.p}>
            3.1. You represent, warrant, and covenant that you are not less than thirteen (13) years of age and that
            you possess the legal capacity to enter into a binding agreement. Where you are below the age of eighteen
            (18) years, you further represent and warrant that a parent, guardian, or other holder of parental
            responsibility has reviewed, understood, and consented to these Terms on your behalf and, in respect of
            any paid component of the Service, that the relevant bill-payer has provided their informed authorisation.
          </p>
          <p style={S.p}>
            3.2. The Service is not directed to, intended for, or designed to attract individuals below the age of
            thirteen (13). We do not knowingly Process the Personal Data of any such individual. In the event we
            become aware that Personal Data has been collected from a person below such age otherwise than in
            accordance with Applicable Data Protection Law, we shall take commercially reasonable steps to effect the
            deletion thereof.
          </p>

          <h2 style={S.h2}>4. Account Registration, Credentials and Security</h2>
          <p style={S.p}>
            4.1. You are solely and exclusively responsible for maintaining the confidentiality, integrity, and
            security of any authentication credentials associated with your account and for any and all activities,
            actions, or omissions occurring thereunder, whether or not authorised by you. You agree not to disclose,
            transfer, share, or otherwise make available your credentials to or with any third party, and not to
            access or attempt to access the account of any other User.
          </p>
          <p style={S.p}>
            4.2. We reserve the right, exercisable in our sole discretion and without liability to you, to suspend,
            restrict, disable, or terminate any account where we reasonably determine, whether correctly or
            otherwise, that a breach of these Terms has occurred or may occur, that continued access poses a risk to
            the Service or to other Users, or that such action is necessary or expedient to comply with any
            Applicable Law or the direction of any competent authority.
          </p>

          <h2 style={S.h2}>5. Acceptable Use Restrictions</h2>
          <p style={S.p}>
            5.1. You shall not, and shall not permit, enable, authorise, or facilitate any other person to: (a) access
            or attempt to access any account, data, or system component to which you have not been expressly granted
            access; (b) employ any automated means, including without limitation robots, spiders, crawlers, or
            scraping utilities, to access, index, harvest, or replicate any portion of the Service; (c) transmit,
            upload, or disseminate any unlawful, infringing, defamatory, obscene, harassing, or otherwise
            objectionable material; (d) decompile, disassemble, reverse-engineer, or otherwise attempt to derive the
            source code, structure, or underlying ideas of the Service; (e) circumvent, disable, or interfere with
            any security-related, rate-limiting, or access-control feature; (f) create or operate spurious accounts
            or manipulate any leaderboard, group, referral, or promotional mechanism; or (g) use the Service in any
            manner that contravenes any Applicable Law or these Terms.
          </p>

          <h2 style={S.h2}>6. Fees, Subscriptions, Renewal, Cancellation and Refunds</h2>
          <p style={S.p}>
            6.1. The core functionality of the Service is presently made available at no charge. Certain enhanced
            features ("Battle Plan Pro") may be made available on a recurring subscription basis. The applicable fees,
            billing frequency, and billing interval shall be displayed at the point of purchase prior to the
            completion of any transaction, and by completing such transaction you authorise the recurring charge on
            the terms so displayed. All payment processing is performed by a third-party payment processing service
            provider; we neither receive, store, nor retain your full payment card credentials.
          </p>
          <p style={S.p}>
            6.2. Unless and until cancelled in accordance with this Clause 6, subscriptions shall renew automatically
            at the conclusion of each billing period at the then-prevailing rate applicable to the relevant plan. A
            charge corresponding to each successful payment shall, where reasonably practicable, be evidenced by a
            receipt transmitted to you, and shall be denoted upon your payment instrument statement by the descriptor
            "BEATTHEEXAM.ORG". In the event any payment instrument is declined or any charge otherwise fails, access
            to enhanced features may be downgraded, suspended, or revoked pending successful settlement.
          </p>
          <p style={S.p}>
            6.3. You may cancel a subscription at any time through the billing-management facility accessible within
            the Service, the operation of which is administered by our third-party payment processing service
            provider. Upon cancellation, access to enhanced features shall ordinarily continue until the expiry of the
            then-current paid period, following which no further renewal shall occur. No cancellation charge shall be
            levied.
          </p>
          <p style={S.p}>
            6.4. Where you are a consumer, you may, pursuant to the Consumer Contracts (Information, Cancellation and
            Additional Charges) Regulations 2013, ordinarily be entitled to a period of fourteen (14) days within
            which to cancel a newly concluded subscription. You acknowledge and agree, however, that the enhanced
            features constitute the supply of digital content not on a tangible medium and that, by subscribing and
            requesting immediate access thereto, you expressly consent to the commencement of supply during the
            aforesaid period and acknowledge that your statutory right to cancel for a refund is thereby lost to the
            extent permitted by Applicable Law, save where we determine otherwise in our discretion. Nothing in these
            Terms operates to exclude, restrict, or otherwise derogate from any non-excludable statutory right to
            which you may be entitled. Where you consider that you have been charged in error or have not received
            features for which payment has been rendered, you should contact us at the address specified herein,
            whereupon we shall investigate and, where appropriate, effect such remediation as may be warranted.
          </p>
          <p style={S.p}>
            6.5. Where you are below the age of eighteen (18), you must have obtained the prior authorisation of the
            relevant bill-payer. The holder of the payment instrument utilised shall be responsible for the
            corresponding charges. We reserve the right to revise pricing or feature composition prospectively, any
            such revision to take effect solely from the next ensuing renewal and never during a period already paid for.
          </p>

          <h2 style={S.h2}>7. Intellectual Property Rights</h2>
          <p style={S.p}>
            7.1. The Service, together with all software, code, design, architecture, compilations, text, graphics,
            logos, marks, and the selection, coordination, and arrangement thereof, and all Intellectual Property
            Rights subsisting therein, are and shall remain the sole and exclusive property of the Operator and/or its
            licensors. Subject to your continuing compliance with these Terms, we grant to you a limited, personal,
            revocable, non-exclusive, non-transferable, non-sublicensable licence to access and use the Service solely
            for your own personal, non-commercial purposes. All rights not expressly granted herein are reserved.
          </p>

          <h2 style={S.h2}>8. User-Submitted Content</h2>
          <p style={S.p}>
            8.1. As between you and us, you retain such rights as you may hold in the content, data, and materials you
            submit to the Service ("User Content"). You hereby grant to us a worldwide, royalty-free, non-exclusive
            licence to host, store, reproduce, process, transmit, and display User Content to the extent necessary to
            operate, maintain, and provide the Service to you. You represent and warrant that you possess all rights
            necessary to submit such User Content and that the same does not infringe the rights of any third party
            nor contravene any Applicable Law.
          </p>

          <h2 style={S.h2}>9. Examination Materials and Notices of Infringement</h2>
          <p style={S.p}>
            9.1. You shall not upload, reproduce, distribute, or otherwise exploit any copyrighted examination
            materials, including without limitation question papers, mark schemes, or examiner reports, in any manner
            that would infringe the rights of any awarding organisation or other rights-holder. Where you assert that
            material accessible through the Service infringes a copyright in which you hold an interest, you may submit
            a written notification to us specifying the work concerned, the location of the allegedly infringing
            material, and your contact particulars, whereupon we shall undertake to investigate and, where a valid
            notification is substantiated, to effect removal within a reasonable period.
          </p>
          <p style={S.p}>
            9.2. The Service is an independent product. It is not affiliated with, authorised by, endorsed by,
            sponsored by, or in any way officially connected to AQA, Pearson Edexcel, OCR, WJEC/Eduqas, or any other
            awarding organisation, examination board, or qualification regulator. All examination board names, paper
            references, qualification titles, trade marks, and logos are the property of their respective owners and
            are used herein solely for the purposes of factual identification and description. Any reference to such
            names is nominative and does not imply any association or endorsement.
          </p>

          <h2 style={S.h2}>10. Artificial Intelligence Functionality</h2>
          <p style={S.p}>
            10.1. Certain functionality of the Service may incorporate or interface with automated, machine-learning,
            or generative artificial-intelligence processing capabilities supplied by a third-party processing service
            provider. Any output generated by such functionality is provided strictly on an informational,
            non-authoritative basis, may be inaccurate, incomplete, or otherwise unreliable, and is not reviewed,
            verified, or endorsed by any qualified education professional. You shall not rely upon any such output for
            any consequential decision and shall refrain from transmitting Personal Data or sensitive information
            through such functionality.
          </p>

          <h2 style={S.h2}>11. Processing of Personal Data; Categories and Purposes</h2>
          <p style={S.p}>
            11.1. In connection with your use of the Service, we may Process certain categories of Personal Data,
            including without limitation: identifying and account-related data (such as electronic mail address,
            display name, and associated account timestamps and configuration attributes); data voluntarily submitted
            by you in the ordinary course of using the Service's tracking functionality; data derived or computed from
            the foregoing for the purpose of generating analytics and comparative metrics; and, where you elect to
            utilise optional social functionality, limited relational data reflecting your associations. We do not
            Process telephone numbers, residential addresses, or full payment card credentials, the last of which are
            handled exclusively by our third-party payment processing service provider. We do not deploy advertising
            or cross-contextual behavioural tracking technologies.
          </p>
          <p style={S.p}>
            11.2. The purposes for which such Personal Data may be Processed include, without limitation: the
            provision, operation, maintenance, personalisation, and improvement of the Service; the generation of
            functionality dependent thereon; the safeguarding of the integrity and security of the Service and the
            prevention, detection, and investigation of misuse; communication with you in connection with your
            account; and compliance with our legal and regulatory obligations.
          </p>

          <h2 style={S.h2}>12. Lawful Bases for Processing</h2>
          <p style={S.p}>
            12.1. Where and to the extent that Applicable Data Protection Law so requires, our Processing of Personal
            Data is undertaken in reliance upon one or more of the following lawful bases, as contextually
            appropriate: the necessity of such Processing for the performance of the contract constituted by these
            Terms; the legitimate interests pursued by us or by a third party, save where overridden by your interests
            or fundamental rights and freedoms; your consent, where solicited in respect of optional functionality and
            which you may withdraw at any time without affecting the lawfulness of Processing carried out prior to such
            withdrawal; and compliance with a legal obligation to which we are subject.
          </p>

          <h2 style={S.h2}>13. Recipients, Service Providers and Onward Disclosure</h2>
          <p style={S.p}>
            13.1. In order to operate the Service we may engage, and disclose Personal Data to, a range of third-party
            service providers, vendors, sub-processors, contractors, and infrastructure suppliers acting on our behalf
            and under appropriate contractual arrangements, including without limitation providers of cloud computing,
            hosting, storage, database, authentication, electronic communication, payment processing, automated
            processing, and analytics services. Each such recipient is permitted to Process Personal Data only to the
            extent necessary to perform the relevant services and in accordance with our instructions and Applicable
            Data Protection Law. We may further disclose Personal Data where required or permitted to do so by law,
            regulation, legal process, or the request of a competent authority, or in connection with any actual or
            prospective reorganisation, merger, assignment, or transfer of our undertaking or assets in whole or in
            part. We do not sell Personal Data, nor do we disclose it to third parties for the purpose of their
            independent direct-marketing activities.
          </p>

          <h2 style={S.h2}>14. Data Storage, Security and Retention</h2>
          <p style={S.p}>
            14.1. We implement technical and organisational measures intended to protect Personal Data against
            unauthorised or unlawful Processing and against accidental loss, destruction, or damage, including the
            segregation of User data by appropriate access-control mechanisms and the transmission of data over
            encrypted channels. A local cache of certain data may be retained within your browser environment to
            facilitate continuity of use and may be cleared upon termination of your session. You acknowledge that no
            method of transmission or storage is wholly secure and that your use of the Service is at your own risk.
            Personal Data shall be retained for such period as your account remains active and thereafter for such
            limited period as may be necessary for backup, archival, or legal-compliance purposes, following which it
            shall be deleted or irreversibly anonymised.
          </p>

          <h2 style={S.h2}>15. International Transfers</h2>
          <p style={S.p}>
            15.1. The recipients referred to in Clause 13 may, in the course of providing services, Process Personal
            Data in jurisdictions outside the United Kingdom and the European Economic Area. Where any such transfer
            occurs, we shall rely upon an appropriate transfer mechanism recognised under Applicable Data Protection
            Law, including without limitation standard contractual clauses or an applicable adequacy determination, so
            as to afford an appropriate level of protection to the Personal Data so transferred.
          </p>

          <h2 style={S.h2}>16. Cookies and Local Storage Technologies</h2>
          <p style={S.p}>
            16.1. The Service employs only such storage technologies as are strictly necessary for its operation,
            principally browser-resident local storage utilised to maintain authenticated sessions, to cache data for
            continuity of use, and to retain configuration preferences. The Service does not employ advertising,
            profiling, or cross-site tracking technologies. The clearing of your browser storage or the termination of
            your session shall remove the locally cached copy.
          </p>

          <h2 style={S.h2}>17. Data Subject Rights</h2>
          <p style={S.p}>
            17.1. Subject to and in accordance with Applicable Data Protection Law, you may be entitled to exercise
            certain rights in respect of your Personal Data, including rights of access, rectification, erasure,
            restriction of Processing, objection to Processing, and data portability, together with the right to
            withdraw any consent previously given. Any request to exercise such rights should be directed to us using
            the contact particulars specified herein, and we shall endeavour to respond within the period prescribed
            by Applicable Data Protection Law. You are further entitled to lodge a complaint with the Information
            Commissioner's Office, being the supervisory authority of the United Kingdom, although we would invite you
            to contact us in the first instance.
          </p>

          <h2 style={S.h2}>18. Electronic Communications</h2>
          <p style={S.p}>
            18.1. By establishing an account you consent to the receipt of operational and transactional electronic
            communications reasonably necessary for the administration of your account and the provision of the
            Service. Where you have elected to receive non-essential communications, you may withdraw such election by
            the mechanism indicated within the relevant communication or by contacting us. Operational communications
            necessary to the functioning of your account may not be capable of being declined for so long as your
            account remains active.
          </p>

          <h2 style={S.h2}>19. Accuracy Disclaimer</h2>
          <p style={S.p}>
            19.1. Any examination dates, grade boundaries, predicted or projected grades, readiness indicators, or
            comparable information made available through the Service are derived from publicly available or
            historical sources, are provided on a non-authoritative, indicative basis only, and may be inaccurate,
            incomplete, superseded, or otherwise unreliable. We make no representation, warranty, or guarantee as to
            the accuracy, currency, or completeness thereof. You shall independently verify all such information with
            your educational institution and the relevant awarding organisation and shall not rely upon any such
            information for any decision of consequence.
          </p>

          <h2 style={S.h2}>20. Disclaimer of Warranties</h2>
          <p style={S.p}>
            20.1. To the fullest extent permitted by Applicable Law, the Service is provided on an "as is" and "as
            available" basis, with all faults and without warranty, condition, representation, or term of any kind,
            whether express, implied, statutory, or otherwise, all of which are hereby expressly excluded and
            disclaimed, including without limitation any implied warranties or conditions of merchantability,
            satisfactory quality, fitness for a particular purpose, accuracy, title, and non-infringement. Without
            limiting the generality of the foregoing, we do not warrant that the Service will be uninterrupted,
            timely, secure, or error-free, that any defect will be corrected, or that the Service will achieve any
            particular result or outcome.
          </p>

          <h2 style={S.h2}>21. Limitation and Exclusion of Liability</h2>
          <p style={S.p}>
            21.1. Nothing in these Terms shall operate to exclude or limit any liability that cannot lawfully be
            excluded or limited, including liability for death or personal injury resulting from negligence, for
            fraud or fraudulent misrepresentation, or any liability under the non-excludable provisions of applicable
            consumer-protection legislation.
          </p>
          <p style={S.p}>
            21.2. Subject always to Clause 21.1 and to the fullest extent permitted by Applicable Law, in no event
            shall we be liable, whether in contract, tort (including negligence), breach of statutory duty,
            restitution, or otherwise, for any indirect, incidental, special, exemplary, punitive, or consequential
            loss or damage whatsoever, nor for any loss of data, profits, revenue, business, goodwill, anticipated
            savings, or for any loss of, or failure to achieve, any educational, academic, or examination outcome,
            in each case howsoever arising and whether or not foreseeable. Subject as aforesaid, our aggregate
            liability arising out of or in connection with the Service and these Terms shall in no event exceed the
            greater of (a) the total amount actually paid by you to us in the twelve (12) months immediately
            preceding the event giving rise to the liability, and (b) fifty pounds sterling (£50).
          </p>

          <h2 style={S.h2}>22. Indemnification</h2>
          <p style={S.p}>
            22.1. To the fullest extent permitted by Applicable Law, you shall indemnify, defend, and hold harmless
            the Operator from and against any and all claims, demands, actions, proceedings, losses, liabilities,
            damages, costs, and expenses (including reasonable legal fees) arising out of or in connection with your
            use or misuse of the Service, your breach of these Terms, or your infringement of the rights of any third
            party, save to the extent the same arises directly from our own breach or negligence.
          </p>

          <h2 style={S.h2}>23. Suspension and Termination</h2>
          <p style={S.p}>
            23.1. You may cease use of the Service and request deletion of your account at any time. We may, in our
            discretion and with or without notice, suspend or terminate your access to the Service in whole or in
            part. Upon any termination, the licence granted to you hereunder shall immediately cease, and those
            provisions which by their nature are intended to survive termination, including without limitation
            Clauses 7, 8, 20, 21, 22, and 26, shall continue in full force and effect.
          </p>

          <h2 style={S.h2}>24. Third-Party Resources; Force Majeure</h2>
          <p style={S.p}>
            24.1. The Service may reference or interoperate with third-party resources not under our control, in
            respect of which we accept no responsibility and provide no warranty. We shall not be liable for any
            failure or delay in the performance of our obligations to the extent occasioned by any cause or
            circumstance beyond our reasonable control, including without limitation the failure or interruption of
            any third-party infrastructure, network, or utility, acts of God, or any act or omission of any
            governmental or regulatory authority.
          </p>

          <h2 style={S.h2}>25. General Provisions</h2>
          <p style={S.p}>
            25.1. <B>Assignment.</B> You may not assign, transfer, charge, or otherwise deal with any of your rights or
            obligations hereunder; we may freely assign or novate ours. 25.2. <B>Severability.</B> If any provision or
            part-provision of these Terms is or becomes invalid, illegal, or unenforceable, it shall be deemed
            modified to the minimum extent necessary to render it valid, or, failing which, deemed deleted, and the
            remaining provisions shall continue in full force and effect. 25.3. <B>Waiver.</B> No failure or delay in
            exercising any right shall constitute a waiver thereof. 25.4. <B>Entire Agreement.</B> These Terms
            constitute the entire agreement between the parties in respect of their subject matter and supersede all
            prior arrangements. 25.5. <B>Third Parties.</B> Save as expressly provided, a person who is not a party
            hereto shall have no rights under the Contracts (Rights of Third Parties) Act 1999 to enforce any term hereof.
          </p>

          <h2 style={S.h2}>26. Governing Law and Jurisdiction</h2>
          <p style={S.p}>
            26.1. These Terms, and any dispute or claim (including non-contractual disputes or claims) arising out of
            or in connection with them, their subject matter, or formation, shall be governed by and construed in
            accordance with the laws of England and Wales. The parties irrevocably submit to the exclusive
            jurisdiction of the courts of England and Wales, save that nothing herein shall deprive a consumer of the
            benefit of any mandatory protection afforded by the law of their place of habitual residence.
          </p>

          <h2 style={S.h2}>27. Contact</h2>
          <p style={S.p}>
            27.1. Any notice, request, enquiry, or communication in connection with these Terms may be addressed to
            the Operator by electronic mail at 51r4h100@gmail.com. A postal address for service is available to data
            subjects and competent authorities upon reasonable written request.
          </p>

          <p style={{ ...S.p, marginTop: 18, marginBottom: 6, fontSize: 9.5, color: '#9a9082' }}>
            © 2026 Battle Plan. All rights reserved. The continued availability of any feature of the Service is not
            guaranteed and is subject to change without notice.
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
