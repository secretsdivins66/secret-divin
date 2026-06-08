// Wrapper sécurisé pour les appels à l'API Gemini
// Ne JAMAIS exposer les clés directement : toujours passer par import.meta.env

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error('VITE_GEMINI_API_KEY manquante dans .env');
}

export function validateAPIKey(): boolean {
  if (!GEMINI_KEY || GEMINI_KEY === 'your_key_here' || GEMINI_KEY.length < 10) {
    return false;
  }
  return true;
}

export async function secureGeminiCall(model: string, body: object): Promise<unknown> {
  if (!validateAPIKey()) {
    throw new Error('Clé API non configurée');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Clé API invalide');
    }
    if (response.status === 429) {
      throw new Error('Limite de requêtes atteinte. Réessaie dans quelques instants.');
    }
    if (response.status === 500) {
      throw new Error('Erreur du serveur Gemini. Réessaie plus tard.');
    }
    throw new Error(`Erreur API: ${response.status}`);
  }

  return response.json();
}
