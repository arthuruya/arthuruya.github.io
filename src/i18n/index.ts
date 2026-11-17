import type { Lang } from '../components/types.ts';
import { en } from './en.ts';
import { id } from './id.ts';
import type { Dictionary } from './shape.ts';

export const dictionaries: Record<Lang, Dictionary> = { en, id };

export const t = (lang: Lang): Dictionary => dictionaries[lang];
