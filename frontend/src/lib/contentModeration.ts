// Content moderation utility for filtering inappropriate content
// Supports multiple languages: English, Russian, German, Spanish, French, etc.

// Prohibited patterns (case-insensitive)
const PROHIBITED_PATTERNS = [
  // English slurs and hate speech
  /n[i1!|]gg[e3]r/i,
  /f[a4@]gg?[o0]t/i,
  /r[e3]t[a4@]rd/i,
  /k[i1!]ke/i,
  /sp[i1!]c/i,
  /ch[i1!]nk/i,
  /g[o0]{2}k/i,
  /w[e3]tb[a4@]ck/i,
  /tr[a4@]nn[yi1!]/i,
  
  // Violence and threats
  /k[i1!]ll\s*(yo)?u?r?s[e3]lf/i,
  /d[i1!][e3]\s*b[i1!]tch/i,
  
  // Pedophilia related (various spellings)
  /p[e3]d[o0]/i,
  /ch[i1!]ld\s*p[o0]rn/i,
  /cp\s*link/i,
  /l[o0]l[i1!]/i,
  /sh[o0]t[a4@]/i,
  /j[a4@][i1!]lb[a4@][i1!]t/i,
  
  // Nazi/fascist content
  /h[e3][i1!]l\s*h[i1!]tl[e3]r/i,
  /s[i1!][e3]g\s*h[e3][i1!]l/i,
  /n[a4@]z[i1!]/i,
  /sw[a4@]st[i1!]k[a4@]/i,
  /1488/i,
  /88\s*h[e3][i1!]l/i,
  
  // Russian hate speech and slurs
  /ниг+[еэa]р/i,
  /пид[оа]р/i,
  /хач/i,
  /чурк[аи]/i,
  /жид/i,
  /черножоп/i,
  /даун/i,
  /дебил/i,
  /педофил/i,
  /педик/i,
  /педо/i,
  /лолик[оа]н/i,
  
  // German slurs
  /schw[ua]chtel/i,
  /neger/i,
  /kanake/i,
  
  // Spanish slurs
  /maric[oó]n/i,
  /sudaca/i,
  /panchito/i,
  
  // French slurs
  /n[èe]gro/i,
  /bougnoule/i,
  /pd/i,
  
  // Generic offensive patterns
  /wh[i1!]t[e3]\s*p[o0]w[e3]r/i,
  /bl[a4@]ck\s*p[o0]w[e3]r/i,
  /r[a4@]c[e3]\s*w[a4@]r/i,
  /[e3]thn[i1!]c\s*cl[e3][a4@]ns/i,
  /g[e3]n[o0]c[i1!]d[e3]/i,
  
  // ISIS/terrorism
  /[i1!]s[i1!]s/i,
  /[a4@]ll[a4@]h\s*[a4@]kb[a4@]r/i,
  /j[i1!]h[a4@]d/i,
];

// Simple banned words list (exact match, case insensitive)
const BANNED_WORDS = [
  // English
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'kike', 'spic', 'chink', 'gook', 'wetback', 'tranny',
  'cunt', 'whore', 'slut',
  
  // Russian
  'нигер', 'пидор', 'пидар', 'педик', 'хач', 'чурка', 'жид',
  'черножопый', 'даун', 'дебил', 'педофил', 'лоликон',
  'сука', 'блядь', 'шлюха',
  
  // German
  'schwuchtel', 'neger', 'kanake', 'hurensohn',
  
  // Spanish  
  'maricon', 'maricón', 'puto', 'puta',
  
  // French
  'négro', 'negro', 'bougnoule', 'salope',
];

// Check if username/text contains prohibited content
export function containsProhibitedContent(text: string): { 
  isProhibited: boolean; 
  reason?: string;
} {
  if (!text || text.trim().length === 0) {
    return { isProhibited: false };
  }

  const normalizedText = text.toLowerCase().trim();
  
  // Check regex patterns
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { 
        isProhibited: true, 
        reason: 'This name contains prohibited content' 
      };
    }
  }
  
  // Check banned words
  for (const word of BANNED_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      return { 
        isProhibited: true, 
        reason: 'This name contains prohibited content' 
      };
    }
  }
  
  // Check for suspicious character substitutions (leet speak)
  const leetNormalized = normalizedText
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');
    
  for (const word of BANNED_WORDS) {
    if (leetNormalized.includes(word.toLowerCase())) {
      return { 
        isProhibited: true, 
        reason: 'This name contains prohibited content' 
      };
    }
  }
  
  return { isProhibited: false };
}

// Validate username specifically
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (username.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (username.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  const contentCheck = containsProhibitedContent(username);
  if (contentCheck.isProhibited) {
    return { isValid: false, error: contentCheck.reason };
  }
  
  return { isValid: true };
}

// Validate email format
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  // Check if email username contains prohibited content
  const emailUsername = email.split('@')[0];
  const contentCheck = containsProhibitedContent(emailUsername);
  if (contentCheck.isProhibited) {
    return { isValid: false, error: 'Email contains prohibited content' };
  }
  
  return { isValid: true };
}

// Validate password
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  
  return { isValid: true };
}
