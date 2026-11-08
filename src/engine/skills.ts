export interface SkillDef {
  id: string;
  subject: 'math' | 'reading';
  name: string;
  emoji: string;
  prereqs: string[];
  /** Human-readable label for each level, low to high. */
  levels: string[];
}

export const SKILLS: SkillDef[] = [
  {
    id: 'count',
    subject: 'math',
    name: 'Feed the Monster',
    emoji: '🍪',
    prereqs: [],
    levels: ['up to 3', 'up to 5', 'up to 7', 'up to 10', 'up to 15', 'up to 20'],
  },
  {
    id: 'phonics',
    subject: 'reading',
    name: 'Phonics Pop',
    emoji: '🎈',
    prereqs: [],
    levels: ['s a t p', '+ i n', '+ m d g o', '+ c k e u r', '+ h b f l j', '+ v w y z q', 'look-alikes'],
  },
];

export const COUNT_MAX_BY_LEVEL = [3, 5, 7, 10, 15, 20];

export function getSkill(id: string): SkillDef {
  const s = SKILLS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown skill ${id}`);
  return s;
}
