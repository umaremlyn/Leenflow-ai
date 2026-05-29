// Extract name / email / phone from a free-form customer message.
//
// Used by the chat route to auto-capture leads when the customer shares
// contact info conversationally ("my name is Umar, my number is …") rather
// than via separate form fields. Conservative on purpose — we'd rather miss
// a lead than create a junk row from a random message.

const NAME_STOPWORDS = new Set([
  "and","but","my","i","the","a","is","are","was","were","to","for","with",
  "from","in","on","at","of","or","by","you","he","she","they","we",
]);

const NAME_TRIGGERS: RegExp[] = [
  /\bmy name is\s+(.+)/i,
  /\bi['']?m\s+(.+)/i,
  /\bi am\s+(.+)/i,
  /\bthis is\s+(.+)/i,
  /\bcall me\s+(.+)/i,
  /\bname['s]?\s*[:\-]\s*(.+)/i,
];

function extractName(message: string): string | undefined {
  for (const trigger of NAME_TRIGGERS) {
    const m = message.match(trigger);
    if (!m) continue;
    const words: string[] = [];
    for (const raw of m[1].split(/[\s,]+/)) {
      const word = raw.replace(/[^\w'\-]/g, "");
      if (!word) break;
      if (NAME_STOPWORDS.has(word.toLowerCase())) break;
      if (/\d/.test(word)) break;
      words.push(word);
      if (words.length >= 3) break;
    }
    if (words.length > 0) {
      return words.map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    }
  }
  return undefined;
}

function extractEmail(message: string): string | undefined {
  const m = message.match(/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/);
  return m ? m[0] : undefined;
}

function extractPhone(message: string): string | undefined {
  // Nigerian mobile: +234 / 234 / 0 followed by 7/8/9 and nine more digits.
  // This is the primary case for the platform's NGN audience.
  const ng = message.match(/(?:\+?234|0)[789]\d{9}\b/);
  if (ng) return ng[0];
  // International fallback: + then 8–15 digits.
  const intl = message.match(/\+\d{8,15}\b/);
  return intl ? intl[0] : undefined;
}

export function extractContact(message: string): {
  name?:  string;
  email?: string;
  phone?: string;
} {
  return {
    name:  extractName(message),
    email: extractEmail(message),
    phone: extractPhone(message),
  };
}
