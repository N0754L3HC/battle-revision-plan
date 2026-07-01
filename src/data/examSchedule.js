// ── Exam schedule (subjectId → boardId → exams) ────────────────────────────
// Built-in defaults. Admin-managed overrides live in Supabase app_config
// (key: exam_schedule) and are merged over these on load - see App() boot.
// IMPORTANT: dates are verified against official board timetables but students
// are always told to confirm with their own school timetable (dates can move).
export const EXAM_SCHEDULE = {
  maths: {
    edexcel: [
      { date:'2026-06-03', paper:'Paper 1: Pure Mathematics 1',     code:'9MA0/01', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Pure Mathematics 2',     code:'9MA0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Statistics & Mechanics', code:'9MA0/03', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    ],
    aqa: [
      { date:'2026-05-20', paper:'Paper 1: Pure Mathematics (7357/1)',              code:'7357/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-03', paper:'Paper 2: Pure Mathematics & Mechanics (7357/2)',  code:'7357/2', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-12', paper:'Paper 3: Pure Mathematics & Statistics (7357/3)', code:'7357/3', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
    ],
    'ocr-a': [
      { date:'2026-05-19', paper:'Paper 1: Pure Mathematics (H230/01)',                       code:'H230/01', board:'OCR A', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 2: Pure Mathematics & Statistics (H230/02)',          code:'H230/02', board:'OCR A', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-19', paper:'Paper 3: Pure Mathematics & Mechanics (H230/03)',           code:'H230/03', board:'OCR A', time:'PM', duration:'2h', maxMark:100 },
    ],
  },
  'further-maths': {
    edexcel: [
      { date:'2026-05-14', paper:'Core Pure Mathematics 1',              code:'9FM0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-05-21', paper:'Core Pure Mathematics 2',              code:'9FM0/02', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75 },
      { date:'2026-06-19', paper:'Option: Further Pure Mathematics 1',   code:'9FM0/3A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3A' },
      { date:'2026-06-05', paper:'Option: Further Mechanics 1',          code:'9FM0/3C', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3C' },
      { date:'2026-06-12', paper:'Option: Further Statistics 1',         code:'9FM0/3B', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3B' },
      { date:'2026-06-16', paper:'Option: Decision Mathematics 1',       code:'9FM0/3D', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'3D' },
      { date:'2026-06-09', paper:'Option: Further Pure Mathematics 2',   code:'9FM0/4A', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:75, option:'4A' },
      { date:'2026-06-12', paper:'Option: Further Statistics 2',         code:'9FM0/4B', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4B' },
      { date:'2026-06-05', paper:'Option: Further Mechanics 2',          code:'9FM0/4C', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4C' },
      { date:'2026-06-16', paper:'Option: Decision Mathematics 2',       code:'9FM0/4D', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:75, option:'4D' },
    ],
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Compulsory (7367/1)',  code:'7367/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-05-20', paper:'Paper 2: Optional 1 (7367/2)', code:'7367/2', board:'AQA', time:'AM', duration:'1h 30m', maxMark:75, option:'OA' },
      { date:'2026-06-10', paper:'Paper 3: Optional 2 (7367/3)', code:'7367/3', board:'AQA', time:'PM', duration:'1h 30m', maxMark:75, option:'OB' },
    ],
  },
  cs: {
    ocr: [
      { date:'2026-06-10', paper:'Paper 1: Computer Systems',         code:'H446/01', board:'OCR', time:'PM', duration:'2h 30m', maxMark:140 },
      { date:'2026-06-17', paper:'Paper 2: Algorithms & Programming', code:'H446/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:140 },
    ],
    aqa: [
      { date:'2026-06-11', paper:'Paper 1: On-screen exam (7517/1)', code:'7517/1', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
      { date:'2026-06-18', paper:'Paper 2: Written exam (7517/2)',   code:'7517/2', board:'AQA', time:'AM', duration:'2h 30m', maxMark:75 },
    ],
    edexcel: [
      { date:'2026-06-04', paper:'Paper 1: Computational Thinking (9CP0/01)',  code:'9CP0/01', board:'Edexcel', time:'PM', duration:'2h 30m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Algorithms & Programming (9CP0/02)', code:'9CP0/02', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:100 },
    ],
  },
  chemistry: {
    aqa: [
      { date:'2026-06-02', paper:'Paper 1: Inorganic & Physical Chemistry', code:'7405/1', board:'AQA', time:'AM', duration:'2h', maxMark:105 },
      { date:'2026-06-09', paper:'Paper 2: Organic & Physical Chemistry',   code:'7405/2', board:'AQA', time:'AM', duration:'2h', maxMark:105 },
      { date:'2026-06-15', paper:'Paper 3: Practical Skills',               code:'7405/3', board:'AQA', time:'AM', duration:'2h', maxMark:90  },
    ],
    edexcel: [
      { date:'2026-06-01', paper:'Paper 1: Core Inorganic & Physical Chemistry (9CH0/01)',    code:'9CH0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-08', paper:'Paper 2: Core Organic & Physical Chemistry (9CH0/02)',      code:'9CH0/02', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 3: General & Practical Principles (9CH0/03)',         code:'9CH0/03', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
    'ocr-a': [
      { date:'2026-06-03', paper:'Paper 1: Periodic Table, Elements & Physical Chemistry (H432/01)', code:'H432/01', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 2: Synthesis & Analytical Techniques (H432/02)',              code:'H432/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Unified Chemistry (H432/03)',                              code:'H432/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
  },
  physics: {
    'ocr-a': [
      { date:'2026-05-20', paper:'Component 1: Modelling Physics (H557/01)',  code:'H557/01', board:'OCR A', time:'PM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-01', paper:'Component 2: Exploring Physics (H557/02)',  code:'H557/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-08', paper:'Component 3: Unified Physics (H557/03)',    code:'H557/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
    aqa: [
      { date:'2026-05-20', paper:'Paper 1: Sections 1–5 (7408/1)',          code:'7408/1', board:'AQA', time:'PM', duration:'2h', maxMark:85 },
      { date:'2026-06-01', paper:'Paper 2: Sections 6–8 (7408/2)',          code:'7408/2', board:'AQA', time:'AM', duration:'2h', maxMark:85 },
      { date:'2026-06-08', paper:'Paper 3: Practical & Options (7408/3)',   code:'7408/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-19', paper:'Paper 1: Advanced Physics I (9PH0/01)',                   code:'9PH0/01', board:'Edexcel', time:'PM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-05', paper:'Paper 2: Advanced Physics II (9PH0/02)',                  code:'9PH0/02', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-17', paper:'Paper 3: General & Practical Principles (9PH0/03)',       code:'9PH0/03', board:'Edexcel', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
  },
  economics: {
    aqa: [
      { date:'2026-05-11', paper:'Paper 1: Markets & Market Failure (7136/1)',         code:'7136/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-05-18', paper:'Paper 2: National & International Economy (7136/2)', code:'7136/2', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 3: Economic Principles & Issues (7136/3)',     code:'7136/3', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-13', paper:'Paper 1: Markets & Business Behaviour (9EC0/01)',               code:'9EC0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-05-21', paper:'Paper 2: The Macroeconomy (9EC0/02)',                            code:'9EC0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 3: Microeconomics & Macroeconomics (9EC0/03)',             code:'9EC0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  biology: {
    aqa: [
      { date:'2026-06-04', paper:'Paper 1: Biological Processes (7402/1)',  code:'7402/1', board:'AQA', time:'PM', duration:'2h', maxMark:91 },
      { date:'2026-06-12', paper:'Paper 2: Biological Diversity (7402/2)',  code:'7402/2', board:'AQA', time:'AM', duration:'2h', maxMark:91 },
      { date:'2026-06-16', paper:'Paper 3: Essay & Data Analysis (7402/3)', code:'7402/3', board:'AQA', time:'AM', duration:'2h', maxMark:78 },
    ],
    'edexcel-a': [
      { date:'2026-05-19', paper:'Paper 1: The Natural Environment (9BI0/01)',              code:'9BI0/01', board:'Edexcel A', time:'PM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-05', paper:'Paper 2: Energy, Exercise & Co-ordination (9BI0/02)',    code:'9BI0/02', board:'Edexcel A', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 3: General & Practical Principles (9BI0/03)',      code:'9BI0/03', board:'Edexcel A', time:'AM', duration:'2h 30m', maxMark:120 },
    ],
    'ocr-a': [
      { date:'2026-06-03', paper:'Paper 1: Biological Processes (H420/01)',   code:'H420/01', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Biological Diversity (H420/02)',   code:'H420/02', board:'OCR A', time:'AM', duration:'2h 15m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 3: Unified Biology (H420/03)',        code:'H420/03', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70  },
    ],
  },
  psychology: {
    aqa: [
      { date:'2026-05-15', paper:'Paper 1: Social Influence, Memory, Attachment & Psychopathology (7182/1)', code:'7182/1', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
      { date:'2026-05-20', paper:'Paper 2: Biopsychology, Approaches & Research Methods (7182/2)',            code:'7182/2', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
      { date:'2026-06-05', paper:'Paper 3: Issues, Debates & Options (7182/3)',                               code:'7182/3', board:'AQA', time:'AM', duration:'2h', maxMark:96 },
    ],
    edexcel: [
      { date:'2026-05-18', paper:'Paper 1: Social & Cognitive Psychology (9PS0/01)',              code:'9PS0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-03', paper:'Paper 2: Biological & Learning Approaches (9PS0/02)',           code:'9PS0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-15', paper:'Paper 3: Clinical Psychology & Issues (9PS0/03)',               code:'9PS0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  sociology: {
    aqa: [
      { date:'2026-05-18', paper:'Paper 1: Education with Theory & Methods (7192/1)',            code:'7192/1', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-03', paper:'Paper 2: Topics in Sociology (7192/2)',                        code:'7192/2', board:'AQA', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-12', paper:'Paper 3: Crime & Deviance with Theory & Methods (7192/3)',     code:'7192/3', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
    ],
  },
  history: {
    aqa: [
      { date:'2026-05-19', paper:'Paper 1: Breadth Study (7042/1)', code:'7042/1', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
      { date:'2026-06-02', paper:'Paper 2: Depth Study (7042/2)',   code:'7042/2', board:'AQA', time:'PM', duration:'2h 30m', maxMark:75 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Breadth Study (9HI0/1)',                    code:'9HI0/1', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:80 },
      { date:'2026-06-02', paper:'Paper 2: Depth Study (9HI0/2)',                      code:'9HI0/2', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:64 },
      { date:'2026-06-09', paper:'Paper 3: Thematic Study & Source Skills (9HI0/3)',   code:'9HI0/3', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:64 },
    ],
  },
  geography: {
    aqa: [
      { date:'2026-05-12', paper:'Paper 1: Physical Geography (7037/1)', code:'7037/1', board:'AQA', time:'AM', duration:'2h 30m', maxMark:80 },
      { date:'2026-05-21', paper:'Paper 2: Human Geography (7037/2)',    code:'7037/2', board:'AQA', time:'PM', duration:'2h 30m', maxMark:80 },
    ],
    'edexcel-a': [
      { date:'2026-05-18', paper:'Paper 1: Dynamic Landscapes (9GE0/01)',        code:'9GE0/01', board:'Edexcel A', time:'AM', duration:'2h 15m', maxMark:94 },
      { date:'2026-06-04', paper:'Paper 2: Dynamic Places (9GE0/02)',            code:'9GE0/02', board:'Edexcel A', time:'PM', duration:'2h 15m', maxMark:94 },
      { date:'2026-06-15', paper:'Paper 3: Synoptic Investigation (9GE0/03)',    code:'9GE0/03', board:'Edexcel A', time:'AM', duration:'2h 30m', maxMark:70 },
    ],
    'ocr-a': [
      { date:'2026-05-13', paper:'Component 1: Physical Systems (H481/01)',        code:'H481/01', board:'OCR A', time:'AM', duration:'2h 30m', maxMark:66 },
      { date:'2026-05-20', paper:'Component 2: Human Interactions (H481/02)',      code:'H481/02', board:'OCR A', time:'PM', duration:'2h 30m', maxMark:66 },
      { date:'2026-06-10', paper:'Component 3: Geographical Debates (H481/03)',    code:'H481/03', board:'OCR A', time:'AM', duration:'3h',     maxMark:70 },
    ],
  },
  'english-lit': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Love Through the Ages (7712/1)',    code:'7712/1', board:'AQA', time:'AM', duration:'3h',     maxMark:75 },
      { date:'2026-06-01', paper:'Paper 2: Texts in Shared Contexts (7712/2)', code:'7712/2', board:'AQA', time:'AM', duration:'2h 30m', maxMark:50 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Drama (9ET0/01)',  code:'9ET0/01', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:60 },
      { date:'2026-05-21', paper:'Paper 2: Prose (9ET0/02)',  code:'9ET0/02', board:'Edexcel', time:'PM', duration:'1h 15m', maxMark:40 },
      { date:'2026-06-08', paper:'Paper 3: Poetry (9ET0/03)', code:'9ET0/03', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:60 },
    ],
    ocr: [
      { date:'2026-05-19', paper:'Paper 1: Drama & Poetry Pre-1900 (H472/01)',         code:'H472/01', board:'OCR', time:'AM', duration:'2h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Comparative & Contextual Study (H472/02)', code:'H472/02', board:'OCR', time:'AM', duration:'2h 30m', maxMark:80 },
    ],
  },
  business: {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Business 1 (7132/1)',              code:'7132/1', board:'AQA', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-05-19', paper:'Paper 2: Business 2 (7132/2)',              code:'7132/2', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 3: Business 3 - Case Study (7132/3)', code:'7132/3', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-12', paper:'Paper 1: Marketing, People & Global Business (9BS0/01)',                          code:'9BS0/01', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
      { date:'2026-05-20', paper:'Paper 2: Business Activities, Decisions & Strategy (9BS0/02)',                    code:'9BS0/02', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 3: Investigating Business in a Competitive Environment (9BS0/03)',          code:'9BS0/03', board:'Edexcel', time:'AM', duration:'2h', maxMark:100 },
    ],
  },

  // ── GCSE subjects ──────────────────────────────────────────────────────────
  'gcse-maths': {
    aqa: [
      { date:'2026-05-18', paper:'Paper 1: Non-Calculator (8300/1H)', code:'8300/1H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Calculator (8300/2H)',     code:'8300/2H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-08', paper:'Paper 3: Calculator (8300/3H)',     code:'8300/3H', board:'AQA', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-19', paper:'Paper 1: Non-Calculator (1MA1/1H)', code:'1MA1/1H', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Calculator (1MA1/2H)',     code:'1MA1/2H', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-09', paper:'Paper 3: Calculator (1MA1/3H)',     code:'1MA1/3H', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-21', paper:'Paper 1: Non-Calculator (J560/01)', code:'J560/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-05', paper:'Paper 2: Calculator (J560/02)',     code:'J560/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-10', paper:'Paper 3: Calculator (J560/03)',     code:'J560/03', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-english-lang': {
    aqa: [
      { date:'2026-05-21', paper:'Paper 1: Explorations in Creative Reading & Writing (8700/1)', code:'8700/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Writers\' Viewpoints & Perspectives (8700/2)',        code:'8700/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-22', paper:'Paper 1: Fiction & Imaginative Writing (1EN0/01)', code:'1EN0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-05', paper:'Paper 2: Non-Fiction & Transactional Writing (1EN0/02)', code:'1EN0/02', board:'Edexcel', time:'AM', duration:'2h 5m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-19', paper:'Component 1: Communicating Information & Ideas (J351/01)', code:'J351/01', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-03', paper:'Component 2: Exploring Effects & Impact (J351/02)',         code:'J351/02', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
    ],
  },
  'gcse-english-lit': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Shakespeare & the 19th Century Novel (8702/1)', code:'8702/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:64 },
      { date:'2026-06-10', paper:'Paper 2: Modern Texts, Poetry & Unseen (8702/2)',        code:'8702/2', board:'AQA', time:'AM', duration:'2h 15m', maxMark:96 },
    ],
    edexcel: [
      { date:'2026-05-18', paper:'Paper 1: Shakespeare & Post-1914 Literature (1ET0/01)', code:'1ET0/01', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:60 },
      { date:'2026-06-08', paper:'Paper 2: 19th Century Novel & Poetry since 1789 (1ET0/02)', code:'1ET0/02', board:'Edexcel', time:'AM', duration:'2h 15m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-20', paper:'Component 1: Shakespeare & Poetry (J352/01)', code:'J352/01', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
      { date:'2026-06-04', paper:'Component 2: Prose & Drama (J352/02)',         code:'J352/02', board:'OCR', time:'AM', duration:'2h', maxMark:80 },
    ],
  },
  'gcse-biology': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Cell Biology, Organisation, Infection, Bioenergetics (8461/1H)', code:'8461/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-11', paper:'Paper 2: Homeostasis, Inheritance, Ecology (8461/2H)',                   code:'8461/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Key Concepts in Biology (1BI0/1H)', code:'1BI0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-15', paper:'Paper 2: Application of Key Concepts (1BI0/2H)', code:'1BI0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-05-18', paper:'Paper 1: Biology B1–B4 (J257/01)', code:'J257/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-09', paper:'Paper 2: Biology B5–B7 (J257/02)', code:'J257/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-chemistry': {
    aqa: [
      { date:'2026-05-19', paper:'Paper 1: Atomic Structure, Bonding, Quantitative, Chemical Changes (8462/1H)', code:'8462/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-16', paper:'Paper 2: Rates, Organic, Analysis, Atmosphere (8462/2H)',                     code:'8462/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-05-20', paper:'Paper 1: Key Concepts in Chemistry (1CH0/1H)', code:'1CH0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-17', paper:'Paper 2: Application of Key Concepts (1CH0/2H)', code:'1CH0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-05-21', paper:'Paper 1: Chemistry C1–C4 (J258/01)', code:'J258/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-10', paper:'Paper 2: Chemistry C5–C8 (J258/02)', code:'J258/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-physics': {
    aqa: [
      { date:'2026-06-02', paper:'Paper 1: Energy, Electricity, Particle Model, Atomic Structure (8463/1H)', code:'8463/1H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-22', paper:'Paper 2: Forces, Waves, Magnetism, Space (8463/2H)',                       code:'8463/2H', board:'AQA', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-06-03', paper:'Paper 1: Key Concepts in Physics (1PH0/1H)', code:'1PH0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-23', paper:'Paper 2: Application of Key Concepts (1PH0/2H)', code:'1PH0/2H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
    'ocr-gateway': [
      { date:'2026-06-04', paper:'Paper 1: Physics P1–P4 (J259/01)', code:'J259/01', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
      { date:'2026-06-18', paper:'Paper 2: Physics P5–P8 (J259/02)', code:'J259/02', board:'OCR Gateway', time:'AM', duration:'1h 45m', maxMark:100 },
    ],
  },
  'gcse-combined-science': {
    aqa: [
      { date:'2026-05-13', paper:'Biology Paper 1 (8464/B/1H)',  code:'8464/B/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-05-19', paper:'Chemistry Paper 1 (8464/C/1H)', code:'8464/C/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-02', paper:'Physics Paper 1 (8464/P/1H)',  code:'8464/P/1H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-11', paper:'Biology Paper 2 (8464/B/2H)',  code:'8464/B/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-16', paper:'Chemistry Paper 2 (8464/C/2H)', code:'8464/C/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
      { date:'2026-06-22', paper:'Physics Paper 2 (8464/P/2H)',  code:'8464/P/2H', board:'AQA Trilogy', time:'AM', duration:'1h 15m', maxMark:70 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Biology 1 (1SC0/1BH)',   code:'1SC0/1BH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-05-20', paper:'Chemistry 1 (1SC0/1CH)', code:'1SC0/1CH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-03', paper:'Physics 1 (1SC0/1PH)',   code:'1SC0/1PH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-15', paper:'Biology 2 (1SC0/2BH)',   code:'1SC0/2BH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-17', paper:'Chemistry 2 (1SC0/2CH)', code:'1SC0/2CH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
      { date:'2026-06-23', paper:'Physics 2 (1SC0/2PH)',   code:'1SC0/2PH', board:'Edexcel Combined', time:'AM', duration:'1h 10m', maxMark:60 },
    ],
  },
  'gcse-history': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Understanding the Modern World (8145/1A or 1B)', code:'8145/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:84 },
      { date:'2026-06-09', paper:'Paper 2: Shaping the Nation (8145/2A or 2B)',             code:'8145/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:84 },
    ],
    edexcel: [
      { date:'2026-05-13', paper:'Paper 1: Thematic Study & Historic Environment (1HI0/1)', code:'1HI0/1', board:'Edexcel', time:'AM', duration:'1h 15m', maxMark:52 },
      { date:'2026-06-03', paper:'Paper 2: Period Study & British Depth Study (1HI0/2)',    code:'1HI0/2', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:64 },
      { date:'2026-06-12', paper:'Paper 3: Modern Depth Study (1HI0/3)',                    code:'1HI0/3', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:52 },
    ],
    ocr: [
      { date:'2026-05-18', paper:'Component 1: Studies in Depth (J410/01)',     code:'J410/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:60 },
      { date:'2026-06-04', paper:'Component 2: Period Studies (J410/02)',        code:'J410/02', board:'OCR', time:'AM', duration:'1h 45m', maxMark:60 },
      { date:'2026-06-15', paper:'Component 3: Historical Investigations (J410/03)', code:'J410/03', board:'OCR', time:'AM', duration:'1h 45m', maxMark:60 },
    ],
  },
  'gcse-geography': {
    aqa: [
      { date:'2026-05-12', paper:'Paper 1: Living with the Physical Environment (8035/1)', code:'8035/1', board:'AQA', time:'AM', duration:'1h 30m', maxMark:88 },
      { date:'2026-05-20', paper:'Paper 2: Challenges in the Human Environment (8035/2)',  code:'8035/2', board:'AQA', time:'AM', duration:'1h 30m', maxMark:88 },
      { date:'2026-06-11', paper:'Paper 3: Geographical Applications (8035/3)',            code:'8035/3', board:'AQA', time:'AM', duration:'1h 15m', maxMark:76 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Global Geographical Issues (1GB0/01)',                        code:'1GB0/01', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:94 },
      { date:'2026-06-04', paper:'Paper 2: UK Geographical Issues (1GB0/02)',                            code:'1GB0/02', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:94 },
      { date:'2026-06-16', paper:'Paper 3: People & Environment Issues - Making Decisions (1GB0/03)',    code:'1GB0/03', board:'Edexcel B', time:'AM', duration:'1h 30m', maxMark:64 },
    ],
    'ocr-a': [
      { date:'2026-05-15', paper:'Component 1: Our Natural World (J383/01)',   code:'J383/01', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70 },
      { date:'2026-06-05', paper:'Component 2: People and Society (J383/02)', code:'J383/02', board:'OCR A', time:'AM', duration:'1h 30m', maxMark:70 },
      { date:'2026-06-17', paper:'Component 3: Geographical Skills (J383/03)', code:'J383/03', board:'OCR A', time:'AM', duration:'1h',     maxMark:40 },
    ],
  },
  'gcse-cs': {
    aqa: [
      { date:'2026-05-20', paper:'Paper 1: Computational Thinking & Programming (8525/1)', code:'8525/1', board:'AQA', time:'PM', duration:'2h', maxMark:80 },
      { date:'2026-06-10', paper:'Paper 2: Computer Systems (8525/2)',                    code:'8525/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-21', paper:'Paper 1: Computer Systems (J277/01)',                                  code:'J277/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-11', paper:'Paper 2: Computational Thinking, Algorithms & Programming (J277/02)', code:'J277/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-05-22', paper:'Paper 1: Computational Thinking & Problem Solving (1CP2/01)', code:'1CP2/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-12', paper:'Paper 2: Applications & Implications of Computing (1CP2/02)', code:'1CP2/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-french': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Listening (8658/LH)', code:'8658/LH', board:'AQA', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-21', paper:'Paper 2: Reading (8658/RH)',   code:'8658/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-10', paper:'Paper 3: Writing (8658/WH)',   code:'8658/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Listening & Understanding (1FR0/1H)', code:'1FR0/1H', board:'Edexcel', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading & Understanding (1FR0/2H)',   code:'1FR0/2H', board:'Edexcel', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-11', paper:'Paper 3: Writing in French (1FR0/3H)',         code:'1FR0/3H', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-spanish': {
    aqa: [
      { date:'2026-05-15', paper:'Paper 1: Listening (8698/LH)', code:'8698/LH', board:'AQA', time:'AM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading (8698/RH)',   code:'8698/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-12', paper:'Paper 3: Writing (8698/WH)',   code:'8698/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Listening & Understanding (1SP0/1H)', code:'1SP0/1H', board:'Edexcel', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-22', paper:'Paper 2: Reading & Understanding (1SP0/2H)',   code:'1SP0/2H', board:'Edexcel', time:'PM', duration:'1h', maxMark:60 },
      { date:'2026-06-12', paper:'Paper 3: Writing (1SP0/3H)',                   code:'1SP0/3H', board:'Edexcel', time:'PM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-religious-studies': {
    aqa: [
      { date:'2026-05-11', paper:'Paper 1: Religion, Beliefs & Practices (8062/1A–M)', code:'8062/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:102 },
      { date:'2026-06-05', paper:'Paper 2: Thematic Studies (8062/2)',                 code:'8062/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:102 },
    ],
    edexcel: [
      { date:'2026-05-12', paper:'Paper 1: Study of Religion - Beliefs, Teachings & Practices (1RB0/1H)', code:'1RB0/1H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:118 },
      { date:'2026-06-03', paper:'Paper 2: Area of Study 2 - Christianity (1RB0/2H)',                     code:'1RB0/2H', board:'Edexcel', time:'PM', duration:'50m',    maxMark:48  },
      { date:'2026-06-10', paper:'Paper 3: Philosophical & Ethical Studies (1RB0/3H)',                    code:'1RB0/3H', board:'Edexcel', time:'AM', duration:'1h 45m', maxMark:118 },
    ],
  },
  'gcse-german': {
    aqa: [
      { date:'2026-05-13', paper:'Paper 1: Listening (8668/LH)', code:'8668/LH', board:'AQA', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-20', paper:'Paper 2: Reading (8668/RH)',   code:'8668/RH', board:'AQA', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-09', paper:'Paper 3: Writing (8668/WH)',   code:'8668/WH', board:'AQA', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
    edexcel: [
      { date:'2026-05-14', paper:'Paper 1: Listening & Understanding in German (1GN0/1H)', code:'1GN0/1H', board:'Edexcel', time:'PM', duration:'45m', maxMark:50 },
      { date:'2026-05-21', paper:'Paper 2: Reading & Understanding in German (1GN0/2H)',   code:'1GN0/2H', board:'Edexcel', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-10', paper:'Paper 3: Writing in German (1GN0/3H)',                   code:'1GN0/3H', board:'Edexcel', time:'AM', duration:'1h 20m', maxMark:60 },
    ],
  },
  'gcse-music': {
    aqa: [
      { date:'2026-06-10', paper:'Paper 1: Listening (8271/W)', code:'8271/W', board:'AQA', time:'AM', duration:'1h 30m', maxMark:68 },
    ],
    edexcel: [
      { date:'2026-06-10', paper:'Paper 1: Instrumental Music (1MU0/01)', code:'1MU0/01', board:'Edexcel', time:'PM', duration:'1h 45m', maxMark:80 },
      { date:'2026-06-17', paper:'Paper 2: Vocal Music (1MU0/02)',         code:'1MU0/02', board:'Edexcel', time:'AM', duration:'45m',    maxMark:40 },
    ],
    ocr: [
      { date:'2026-06-11', paper:'Listening & Appraising (J536/01)', code:'J536/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-drama': {
    aqa: [
      { date:'2026-06-11', paper:'Written Exam: Understanding Drama (8261/W)', code:'8261/W', board:'AQA', time:'AM', duration:'1h 45m', maxMark:80 },
    ],
    edexcel: [
      { date:'2026-06-11', paper:'Written Exam: Theatre Makers in Practice (1DR0/01)', code:'1DR0/01', board:'Edexcel', time:'PM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-06-12', paper:'Written Exam (J316/01)', code:'J316/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-business': {
    aqa: [
      { date:'2026-05-14', paper:'Paper 1: Business 1 (8132/1)', code:'8132/1', board:'AQA', time:'AM', duration:'1h 45m', maxMark:90 },
      { date:'2026-06-03', paper:'Paper 2: Business 2 (8132/2)', code:'8132/2', board:'AQA', time:'AM', duration:'1h 45m', maxMark:90 },
    ],
    edexcel: [
      { date:'2026-05-15', paper:'Paper 1: Investigating Small Business (1BS0/01)', code:'1BS0/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-04', paper:'Paper 2: Building a Business (1BS0/02)',          code:'1BS0/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
    ocr: [
      { date:'2026-05-18', paper:'Paper 1: Business 1 (J204/01)', code:'J204/01', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
      { date:'2026-06-08', paper:'Paper 2: Business 2 (J204/02)', code:'J204/02', board:'OCR', time:'AM', duration:'1h 30m', maxMark:80 },
    ],
  },
  'gcse-dt': {
    aqa: [
      { date:'2026-06-05', paper:'Written Exam: D&T in the Real World (8552/W)', code:'8552/W', board:'AQA', time:'AM', duration:'2h', maxMark:100 },
    ],
    edexcel: [
      { date:'2026-06-05', paper:'Written Exam (1DT0/01)', code:'1DT0/01', board:'Edexcel', time:'PM', duration:'2h', maxMark:100 },
    ],
    ocr: [
      { date:'2026-06-08', paper:'Written Exam (J310/01)', code:'J310/01', board:'OCR', time:'AM', duration:'2h', maxMark:100 },
    ],
  },
  'gcse-pe': {
    aqa: [
      { date:'2026-05-26', paper:'Paper 1: The Human Body and Movement in Sport (8582/1)', code:'8582/1', board:'AQA', time:'AM', duration:'1h 15m', maxMark:78 },
      { date:'2026-06-15', paper:'Paper 2: Socio-Cultural Influences & Well-being (8582/2)', code:'8582/2', board:'AQA', time:'AM', duration:'1h 15m', maxMark:78 },
    ],
    edexcel: [
      { date:'2026-05-27', paper:'Paper 1: Fitness & Body Systems (1PE0/01)', code:'1PE0/01', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:90 },
      { date:'2026-06-16', paper:'Paper 2: Health & Performance (1PE0/02)',   code:'1PE0/02', board:'Edexcel', time:'AM', duration:'1h 30m', maxMark:90 },
    ],
    ocr: [
      { date:'2026-05-28', paper:'Paper 1: Physical Factors Affecting Performance (J587/01)',     code:'J587/01', board:'OCR', time:'AM', duration:'1h', maxMark:60 },
      { date:'2026-06-17', paper:'Paper 2: Socio-Cultural Issues & Sports Psychology (J587/02)', code:'J587/02', board:'OCR', time:'AM', duration:'1h', maxMark:60 },
    ],
  },
};

// Returns the exam list for a specific subject+board; filters by options when provided
