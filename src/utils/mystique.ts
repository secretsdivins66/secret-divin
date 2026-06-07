export const ABJAD: Record<string, number> = {
  'ا': 1,  'ب': 2,  'ج': 3,  'د': 4,
  'ه': 5,  'ة': 5,  'و': 6,  'ز': 7,
  'ح': 8,  'ط': 9,  'ي': 10, 'ك': 20,
  'ل': 30, 'م': 40, 'ن': 50, 'ص': 60,
  'ع': 70, 'ف': 80, 'ض': 90, 'ق': 100,
  'ر': 200, 'س': 300, 'ت': 400, 'ث': 500,
  'خ': 600, 'ذ': 700, 'ظ': 800, 'غ': 900,
  'ش': 1000
};

export function calculateWeight(arabicText: string): number {
  let total = 0;
  for (const char of arabicText) {
    if (ABJAD[char] !== undefined) {
      total += ABJAD[char];
    }
  }
  return total;
}

export function toArabicIndic(n: number): string {
  const d = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(n).split('').map(c => d[parseInt(c)]).join('');
}

export const GENDER_BONUS = {
  homme: 52,
  femme: 452
};

export function calculatePM(
  nameWeight: number,
  motherWeight: number,
  gender: 'homme' | 'femme'
): number {
  return nameWeight + motherWeight + GENDER_BONUS[gender];
}

export const TOOL_COSTS: Record<string, number> = {
  'poids-mystique':  0,
  'tutoriels':       0,
  'carres-magiques': 2,
  'destin':          2,
  'attraper':        2,
  'secrets':         2,
  'geomancie':       2,
  'compatibilite':   2,
  'reves':           2,
  'plantes':         2,
  'jours':           2,
  'formation':       2,
};

export const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 20,
    price: 4900,
    currency: 'FCFA',
    description: 'Pour découvrir',
    examples: ['10 générations au choix'],
  },
  {
    id: 'essentiel',
    name: 'Essentiel',
    credits: 50,
    price: 6900,
    currency: 'FCFA',
    description: 'Usage régulier',
    examples: ['25 générations au choix'],
  },
  {
    id: 'premium',
    name: 'Premium',
    credits: 70,
    price: 9900,
    currency: 'FCFA',
    popular: true,
    description: 'Meilleur rapport',
    examples: ['35 générations au choix'],
  },
  {
    id: 'expert',
    name: 'Expert',
    credits: 150,
    price: 19900,
    currency: 'FCFA',
    description: 'Pour les passionnés',
    examples: ['75 générations au choix'],
  },
  {
    id: 'unlimited',
    name: 'Illimité',
    credits: null,
    price: 49000,
    currency: 'FCFA',
    period: 'mois',
    description: 'Accès illimité',
    examples: ['Générations illimitées'],
  },
];

export const WHATSAPP_NUMBER = 'TON_NUMERO_ICI';
