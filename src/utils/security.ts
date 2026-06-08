// Utilitaires de sécurité : XSS, rate limiting, CSRF, validation

// ── 1. Protection XSS ───────────────────────────────────

// Nettoyer tout texte entré par l'utilisateur avant affichage
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Nettoyer avant envoi à l'IA (Gemini)
export function sanitizeForAI(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')          // Supprimer balises HTML
    .replace(/javascript:/gi, '')      // Supprimer JS inline
    .replace(/on\w+\s*=/gi, '')        // Supprimer events HTML
    .replace(/\$\{.*?\}/g, '')         // Supprimer template literals
    .replace(/`/g, '')
    .trim()
    .substring(0, 2000);               // Limiter la longueur
}

// Valider email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Valider prénom (lettres seulement)
export function isValidName(name: string): boolean {
  const nameRegex = /^[\p{L}\s\-'.]{1,100}$/u;
  return nameRegex.test(name.trim());
}

// ── 2. Rate limiting (limiter les appels répétés) ───────

const callTimestamps: Record<string, number[]> = {};

export function checkRateLimit(
  key: string,
  maxCalls: number = 5,
  windowMs: number = 60000 // 5 appels par minute par défaut
): boolean {
  const now = Date.now();
  const timestamps = callTimestamps[key] || [];

  // Filtrer les appels anciens
  const recentCalls = timestamps.filter(t => now - t < windowMs);

  if (recentCalls.length >= maxCalls) {
    return false; // Limite dépassée
  }

  callTimestamps[key] = [...recentCalls, now];
  return true;
}

// ── 3. Protection CSRF ──────────────────────────────────

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function setCSRFToken(): string {
  const token = generateCSRFToken();
  sessionStorage.setItem('csrf_token', token);
  return token;
}

export function getCSRFToken(): string | null {
  return sessionStorage.getItem('csrf_token');
}

// ── 4. Validation des entrées formulaires ──────────────

export function validateFormInputs(inputs: Record<string, string>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  Object.entries(inputs).forEach(([key, value]) => {
    if (!value || !value.trim()) {
      errors[key] = 'Ce champ est requis.';
      return;
    }

    if (value.trim().length < 2) {
      errors[key] = 'Minimum 2 caractères.';
      return;
    }

    if (value.length > 500) {
      errors[key] = 'Maximum 500 caractères.';
      return;
    }

    const suspectPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /SELECT.*FROM/i,
      /DROP TABLE/i,
      /INSERT INTO/i,
      /DELETE FROM/i,
      /UNION SELECT/i,
      /eval\(/i,
      /document\.cookie/i,
      /window\.location/i,
    ];

    const hasSuspect = suspectPatterns.some(pattern => pattern.test(value));

    if (hasSuspect) {
      errors[key] = 'Contenu invalide détecté.';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ── 8. Sécurité des mots de passe ───────────────────────

export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Minimum 8 caractères requis.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Au moins une majuscule requise.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Au moins un chiffre requis.' };
  }
  return { isValid: true, message: 'Mot de passe valide.' };
}

export function getPasswordStrength(pwd: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { level: 1, label: 'Faible', color: '#e53935' };
  if (score <= 3) return { level: 2, label: 'Moyen', color: '#ff9800' };
  return { level: 3, label: 'Fort', color: '#4caf50' };
}
