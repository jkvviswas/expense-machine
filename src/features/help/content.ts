/**
 * Help Center content (presentation data). Kept as a typed dataset so the Help
 * page can search across titles, summaries, bodies and keywords. India-first,
 * matching the product's real features (Safe to Spend, Import, Budgets, etc.).
 */

export interface HelpArticle {
  id: string;
  category: 'Getting started' | 'Importing' | 'Budgets' | 'Reports' | 'Account';
  title: string;
  summary: string;
  body: string[];
  keywords: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export const helpArticles: HelpArticle[] = [
  {
    id: 'safe-to-spend',
    category: 'Getting started',
    title: 'Understanding Safe to Spend',
    summary: 'The one forward-looking number on your dashboard, and how it is calculated.',
    body: [
      'Safe to Spend is the hero metric of Expense Machine. Rather than telling you what already happened, it answers the question that matters: what can I safely spend right now?',
      'It starts from the money you have in this month (income minus spending so far), subtracts what is already committed to upcoming obligations, and holds back a small safety buffer so you are never encouraged to spend to zero.',
      'Because it reads from the same ledger as everything else, it stays in sync with your transactions and budgets automatically.',
    ],
    keywords: ['safe', 'spend', 'dashboard', 'buffer', 'income', 'clarity'],
  },
  {
    id: 'first-import',
    category: 'Importing',
    title: 'Importing your first statement',
    summary: 'Bring a CSV, XLSX or PDF bank statement into your ledger in minutes.',
    body: [
      'Open the Import Center and drop in a bank statement. Expense Machine reads CSV and Excel exports directly, and extracts transactions from most text-based PDF statements.',
      'It detects the columns automatically — date, description, debit and credit — across the formats Indian banks use, then suggests a category for each transaction with a confidence score.',
      'Nothing is saved until you review it. On the review screen you can re-categorise, skip duplicates, and confirm only what you want to keep.',
    ],
    keywords: ['import', 'csv', 'xlsx', 'pdf', 'statement', 'upload', 'bank'],
  },
  {
    id: 'categories',
    category: 'Importing',
    title: 'How automatic categorisation works',
    summary: 'Why a transaction got its category, and how to correct it.',
    body: [
      'Each imported transaction is matched against a library of Indian merchants and UPI handles — Swiggy and Zomato map to Food, Uber and Rapido to Transport, Zerodha and Groww to Investments, and so on.',
      'A confidence score reflects how sure the match is. Anything below the threshold is flagged for review so you can confirm it.',
      'You can change any category on the review screen or later from the transaction detail drawer. Your edits are remembered.',
    ],
    keywords: ['category', 'categorise', 'merchant', 'upi', 'confidence', 'review'],
  },
  {
    id: 'duplicates',
    category: 'Importing',
    title: 'Skipping duplicate transactions',
    summary: 'How re-imported or overlapping statements are kept clean.',
    body: [
      'When you import a statement that overlaps one already in your ledger, Expense Machine flags likely duplicates by matching merchant, amount and date.',
      'A genuinely recurring charge — like a monthly subscription a month apart — is not treated as a duplicate. Only near-identical transactions within a day or two are flagged.',
      'You decide what to skip before committing, either one at a time or all at once.',
    ],
    keywords: ['duplicate', 'duplicates', 'reimport', 'overlap', 'skip'],
  },
  {
    id: 'setting-budgets',
    category: 'Budgets',
    title: 'Setting and tracking budgets',
    summary: 'Create monthly category caps and watch your pace.',
    body: [
      'Budgets gives every spending category a monthly cap. As transactions land, each category shows how much is spent, how much remains, and whether you are on track, approaching the limit, or over.',
      'Your budget caps are the single source of truth — the dashboard and your alerts read from the same numbers, so a change in one place is reflected everywhere.',
      'A budget health score summarises your overall discipline at a glance.',
    ],
    keywords: ['budget', 'cap', 'limit', 'category', 'health', 'track'],
  },
  {
    id: 'budget-alerts',
    category: 'Budgets',
    title: 'Budget alerts and notifications',
    summary: 'Get told before and when a budget is breached.',
    body: [
      'When a category approaches its cap you get a watch alert; when it goes over, an alert. Large individual expenses are flagged too.',
      'All alerts gather in the Notifications Center. You can mark them read, dismiss them, or clear everything.',
      'Alerts are derived from your live ledger and budgets, so they always reflect your current position.',
    ],
    keywords: ['alert', 'notification', 'budget', 'warning', 'over', 'watch'],
  },
  {
    id: 'reports-export',
    category: 'Reports',
    title: 'Exporting reports (Excel & PDF)',
    summary: 'Hand over a polished workbook or a branded PDF.',
    body: [
      'Reports composes your month into an executive summary. From the Export Center you can download a five-sheet Excel workbook — summary, transactions, category analysis, budget analysis and insights — formatted in rupees.',
      'You can also generate a multi-page branded PDF with charts and rankings, suitable for sharing or filing.',
      'Both exports read the same numbers as the rest of the app, so they always reconcile.',
    ],
    keywords: ['report', 'export', 'excel', 'xlsx', 'pdf', 'download', 'workbook'],
  },
  {
    id: 'backup-restore',
    category: 'Account',
    title: 'Backing up and restoring your data',
    summary: 'Export everything to a file and bring it back later.',
    body: [
      'From Settings → Data management you can export a full JSON backup of your settings, budgets, transactions and import history.',
      'To restore, choose Restore and select a previously exported backup file. Expense Machine validates the file and replaces your current data with it.',
      'Because all data lives on your device in this version, a backup is the way to move between browsers or keep a safe copy.',
    ],
    keywords: ['backup', 'restore', 'export', 'json', 'data', 'transfer'],
  },
];

export const faqs: FaqItem[] = [
  {
    id: 'faq-data-where',
    question: 'Where is my financial data stored?',
    answer:
      'In this version, everything stays on your device in your browser. Nothing is sent to a server. Use Export in Settings to keep a backup or move to another browser.',
    keywords: ['storage', 'privacy', 'device', 'server', 'local'],
  },
  {
    id: 'faq-pdf',
    question: 'Why didn’t my PDF statement import fully?',
    answer:
      'Text-based PDF statements are read directly. Scanned or image-only PDFs have no text layer to extract, so they fall back to a sample for now — exporting a CSV or XLSX from your bank gives the most reliable import.',
    keywords: ['pdf', 'scan', 'ocr', 'import', 'statement'],
  },
  {
    id: 'faq-currency',
    question: 'Does Expense Machine support currencies other than rupees?',
    answer:
      'The product is India-first and uses ₹ with the Indian lakh/crore grouping throughout. Other currencies are not supported in this version.',
    keywords: ['currency', 'rupee', 'inr', 'dollar', 'international'],
  },
  {
    id: 'faq-buffer',
    question: 'Can I change the Safe to Spend buffer?',
    answer:
      'The buffer preference is captured in Settings → Finance preferences. Wiring it into the live calculation is on the roadmap; today the dashboard uses a 10% income buffer.',
    keywords: ['buffer', 'safe', 'spend', 'settings', 'finance'],
  },
  {
    id: 'faq-reset',
    question: 'How do I start over with a clean slate?',
    answer:
      'Settings → Data management → Clear all data removes your transactions, budgets, history and preferences and returns the app to its defaults. This cannot be undone, so export a backup first if you might want your data back.',
    keywords: ['reset', 'clear', 'delete', 'start over', 'wipe'],
  },
];
