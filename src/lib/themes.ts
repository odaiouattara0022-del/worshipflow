export interface Theme {
  slug: string;
  label: string;
  icon: string; // Lucide icon name
  description: string;
}

export const WORSHIP_THEMES: Theme[] = [
  { slug: "adoration",      label: "Adoration",      icon: "Heart",        description: "La gloire et la grandeur de Dieu" },
  { slug: "louange",        label: "Louange",         icon: "Music2",       description: "Célébration et exaltation" },
  { slug: "saint-esprit",   label: "Saint-Esprit",    icon: "Flame",        description: "Les dons et la puissance de l'Esprit" },
  { slug: "grace",          label: "Grâce",           icon: "Sparkles",     description: "La grâce et la miséricorde de Dieu" },
  { slug: "salut",          label: "Salut",           icon: "Shield",       description: "La rédemption par Jésus-Christ" },
  { slug: "foi",            label: "Foi",             icon: "Anchor",       description: "La confiance et la foi en Dieu" },
  { slug: "esperance",      label: "Espérance",       icon: "Sunrise",      description: "Les promesses et l'espérance chrétienne" },
  { slug: "repentance",     label: "Repentance",      icon: "RefreshCw",    description: "Le pardon et la restauration" },
  { slug: "communion",      label: "Communion",       icon: "Circle",       description: "La Cène et la communion avec Dieu" },
  { slug: "priere",         label: "Prière",          icon: "Radio",        description: "L'intercession et la supplication" },
  { slug: "mission",        label: "Mission",         icon: "Globe",        description: "L'évangélisation et la mission" },
  { slug: "noel",           label: "Noël",            icon: "Star",         description: "La naissance de Jésus-Christ" },
  { slug: "paques",         label: "Pâques",          icon: "Sun",          description: "La résurrection de Jésus-Christ" },
  { slug: "sanctification", label: "Sanctification",  icon: "Leaf",         description: "La croissance spirituelle et la sainteté" },
  { slug: "famille",        label: "Famille",         icon: "Home",         description: "La famille, le mariage et les enfants" },
  { slug: "gratitude",      label: "Gratitude",       icon: "ThumbsUp",     description: "L'action de grâce et la reconnaissance" },
];

export function getTheme(slug: string): Theme | undefined {
  return WORSHIP_THEMES.find((t) => t.slug === slug);
}

/** Parse tags string into array of slugs */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

/** Serialize slugs array into tags string */
export function serializeTags(slugs: string[]): string {
  return slugs.filter(Boolean).join(",");
}
