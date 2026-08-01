import { Globe, Trophy, History, BookOpen, Music, Brain, Sparkles, Atom } from 'lucide-react';

// Single source of truth for category display metadata (label + icon),
// keyed by the real pack keys from questionsLoader.js's categoryPacks.
// Consumed by App.jsx (lobby buttons, quiz header) and StatsModal.jsx
// (per-category accuracy breakdown).
export const CATEGORY_META = {
  geografija: { label: 'Geografija', icon: Globe },
  povijest: { label: 'Povijest', icon: History },
  glazba: { label: 'Glazba', icon: Music },
  sport: { label: 'Sport', icon: Trophy },
  znanost: { label: 'Znanost i Tehnologija', icon: Atom },
  opca_znanje: { label: 'Opće znanje', icon: Brain },
  pop_kultura: { label: 'Pop kultura', icon: Sparkles },
  knjizevnost: { label: 'Književnost i Umjetnost', icon: BookOpen },
};
