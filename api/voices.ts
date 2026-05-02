
export const config = {
  runtime: 'nodejs',
};

// Exact voices list from your working reference project
const VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'Female' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', category: 'Character' },
];

export default async function handler(req: any, res: any) {
  res.status(200).json({ voices: VOICES });
}
