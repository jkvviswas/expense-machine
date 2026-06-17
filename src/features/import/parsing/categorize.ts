import type { Category } from '../types';

/**
 * ============================================================================
 *  CATEGORIZATION ENGINE  (presentation-layer, additive)
 * ============================================================================
 *
 * Shared by every real parser (CSV today, XLSX next, PDF later). Given a
 * merchant string + free-text description, it returns a best-guess Category
 * and a confidence score (0–1). It is deliberately rule-based and transparent
 * — no model call, no network — so import stays instant and deterministic.
 *
 * It NEVER touches locked calculations. It only assigns the `category` and
 * `confidence` fields on a freshly-parsed transaction, exactly like the curated
 * mock data already carries. Downstream math is unchanged.
 *
 * Design notes:
 *  - India-first: rules cover UPI handles (@ybl, @okhdfcbank, @paytm…) and the
 *    real Indian merchants the product is built around.
 *  - Income is detected separately (salary/NEFT credit/refund) and also implied
 *    by a positive amount.
 *  - Confidence reflects how specific the match was: an exact known-merchant
 *    hit scores high; a broad keyword scores medium; no match → Uncategorized
 *    at low confidence so the Review screen surfaces it.
 */

interface Rule {
  category: Category;
  /** Lower-cased substrings; any hit matches. */
  keywords: string[];
  /** Confidence to assign on a hit. */
  confidence: number;
}

/**
 * Rules are ordered most-specific → most-generic. The first matching rule wins,
 * so brand names (high confidence) precede broad keywords (medium confidence).
 */
const RULES: Rule[] = [
  // ---- Income (explicit credit language) ----
  {
    category: 'Income',
    keywords: ['salary', 'payroll', 'neft cr', 'imps cr', 'credit interest', 'refund', 'reversal', 'cashback', 'invoice', 'reimburse'],
    confidence: 0.9,
  },

  // ---- Education ----
  {
    category: 'Education',
    keywords: ['udemy', 'coursera', 'unacademy', 'byju', "byju's", 'vedantu', 'school', 'college', 'university', 'tuition', 'exam fee', 'course', 'upgrad', 'great learning', 'vit', 'iitm', 'nptel', 'khan academy', 'skillshare'],
    confidence: 0.85,
  },

  // ---- Investments ----
  {
    category: 'Investments',
    keywords: ['zerodha', 'groww', 'upstox', 'kuvera', 'coin', 'sip', 'mutual fund', 'mf ', 'nps', 'ppf', 'rd ', 'fixed deposit', 'fd ', 'angel one', 'icici direct', 'paytm money', 'smallcase'],
    confidence: 0.95,
  },

  // ---- Food & dining / groceries ----
  {
    category: 'Food',
    keywords: ['swiggy', 'zomato', 'bigbasket', 'blinkit', 'dunzo', 'zepto', 'instamart', 'starbucks', 'dominos', "domino's", 'mcdonald', 'kfc', 'reliance fresh', 'dmart', 'd-mart', 'more retail', 'nature basket', 'cafe', 'restaurant', 'bakery', 'biryani', 'eat', 'food', 'dining', 'grocery', 'kirana'],
    confidence: 0.88,
  },

  // ---- Transport / fuel / mobility ----
  {
    category: 'Transport',
    keywords: ['uber', 'ola', 'rapido', 'irctc', 'indian oil', 'iocl', 'bharat petroleum', 'bpcl', 'hp petrol', 'hpcl', 'shell', 'fuel', 'petrol', 'diesel', 'metro', 'redbus', 'makemytrip', 'goibibo', 'cleartrip', 'fastag', 'parking', 'cab', 'taxi', 'railway', 'indigo', 'air india', 'vistara', 'spicejet'],
    confidence: 0.86,
  },

  // ---- Utilities / bills / telecom ----
  {
    category: 'Utilities',
    keywords: ['tata power', 'bescom', 'mseb', 'adani electricity', 'electricity', 'water bill', 'gas bill', 'airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'broadband', 'fiber', 'fibre', 'postpaid', 'prepaid recharge', 'dth', 'tata sky', 'tata play', 'dish tv', 'rent', 'maintenance', 'society', 'bill', 'recharge', 'utility'],
    confidence: 0.85,
  },

  // ---- Healthcare / pharmacy / fitness ----
  {
    category: 'Healthcare',
    keywords: ['apollo', 'pharmeasy', 'netmeds', '1mg', 'medplus', 'med plus', 'pharmacy', 'pharma', 'chemist', 'hospital', 'clinic', 'diagnostic', 'lab', 'practo', 'cult.fit', 'cultfit', 'gym', 'fitness', 'medical', 'medicals', 'doctor', 'dental', 'saravana medical', 'saravana', 'health', 'wellness', 'dispensary', 'nursing'],
    confidence: 0.84,
  },

  // ---- Entertainment / subscriptions / leisure ----
  {
    category: 'Entertainment',
    keywords: ['netflix', 'spotify', 'prime video', 'hotstar', 'disney', 'sony liv', 'sonyliv', 'zee5', 'jiocinema', 'bookmyshow', 'pvr', 'inox', 'youtube premium', 'apple music', 'gaana', 'wynk', 'audible', 'kindle', 'steam', 'playstation', 'xbox', 'subscription', 'cinema', 'movie', 'concert', 'gaming'],
    confidence: 0.87,
  },

  // ---- Insurance ----
  {
    category: 'Insurance',
    keywords: ['lic premium', 'lic india', 'licindia', 'hdfc life', 'icici prudential', 'icici lombard', 'sbi life', 'max life', 'max bupa', 'bajaj allianz', 'tata aig', 'star health', 'care health', 'niva bupa', 'policybazaar', 'go digit', 'digit insurance', 'acko', 'insurance premium', 'insurance', 'premium payment', 'mediclaim'],
    confidence: 0.88,
  },

  // ---- Bills: loan EMIs and credit card bill payments ----
  {
    category: 'Bills',
    keywords: ['emi', 'loan repayment', 'loan emi', 'auto debit emi', 'nach', 'ecs', 'credit card payment', 'cc payment', 'card bill', 'card bill payment', 'billdesk', 'cred club', 'cred ', 'payzapp cc', 'amex payment', 'rupay cc', 'bajaj finserv', 'bajaj finance', 'home credit', 'tata capital', 'hdfc loan', 'hdb financial', 'idfc loan', 'moneyview', 'kreditbee', 'fullerton', 'piramal finance'],
    confidence: 0.86,
  },


  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'tata cliq', 'reliance digital', 'croma', 'decathlon', 'ikea', 'lifestyle', 'shoppers stop', 'westside', 'pantaloons', 'zara', 'h&m', 'uniqlo', 'snapdeal', 'pos purchase', 'retail', 'store', 'mart', 'shopping'],
    confidence: 0.78,
  },
];

/**
 * Extract a plausible UPI VPA "handle" hint from a description, e.g.
 * "UPI/swiggy@axisbank" → "swiggy". Used to strengthen merchant matching.
 */
function upiHandleHint(text: string): string | null {
  const m = text.match(/([a-z0-9._-]+)@[a-z]+/i);
  return m ? m[1].toLowerCase() : null;
}

export interface CategoryGuess {
  category: Category;
  confidence: number;
}

/**
 * Assign a category + confidence from merchant + description.
 * `amountSign` (+1 inflow / -1 outflow) is a weak prior: a positive amount that
 * matches no expense rule is most likely Income.
 */
export function categorize(
  merchant: string,
  description: string,
  amountSign: number,
): CategoryGuess {
  const hay = `${merchant} ${description}`.toLowerCase();
  const handle = upiHandleHint(description) ?? upiHandleHint(merchant);
  const handleHay = handle ? `${hay} ${handle}` : hay;

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (handleHay.includes(kw)) {
        // A multi-word / brand keyword is more specific → small confidence bump.
        const specific = kw.includes(' ') || kw.length >= 6;
        const confidence = Math.min(
          0.98,
          rule.confidence + (specific ? 0.04 : 0),
        );
        // Guard: never classify a credit as a spend category if the text also
        // clearly reads as income; the income rule already runs first, so here
        // we only protect the inverse — a positive amount with a weak expense
        // hit stays as the matched category but with reduced confidence.
        if (amountSign > 0 && rule.category !== 'Income' && rule.category !== 'Investments') {
          return { category: rule.category, confidence: Math.min(confidence, 0.6) };
        }
        return { category: rule.category, confidence };
      }
    }
  }

  // No rule matched. Positive amount → most likely Income (medium confidence);
  // otherwise Uncategorized (low confidence) so Review surfaces it.
  if (amountSign > 0) {
    return { category: 'Income', confidence: 0.55 };
  }
  return { category: 'Uncategorized', confidence: 0.3 };
}
