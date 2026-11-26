// #28 Snack Party (grouping track): snacks put on plates in equal groups, and friends who share them.
// Icon names are Fluent Emoji names (bundled in public/icons, listed in icons/contentIcons.ts).

export interface Snack {
  icon: string;
  one: string;
  many: string;
}

export const GROUP_SNACKS: Snack[] = [
  { icon: 'cookie', one: 'cookie', many: 'cookies' },
  { icon: 'red-apple', one: 'apple', many: 'apples' },
  { icon: 'mango', one: 'mango', many: 'mangoes' },
  { icon: 'strawberry', one: 'strawberry', many: 'strawberries' },
  { icon: 'banana', one: 'banana', many: 'bananas' },
  { icon: 'cupcake', one: 'cupcake', many: 'cupcakes' },
  { icon: 'tangerine', one: 'orange', many: 'oranges' },
  { icon: 'lollipop', one: 'lollipop', many: 'lollipops' },
  { icon: 'doughnut', one: 'doughnut', many: 'doughnuts' },
  { icon: 'dumpling', one: 'momo', many: 'momos' },
];

/** Friends who share the snacks (faces, so a row of them stays small). */
export const GROUP_FRIENDS: string[] = ['panda', 'rabbit-face', 'bear', 'fox', 'cat-face', 'dog-face', 'tiger-face', 'monkey-face'];
