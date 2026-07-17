export const cleanSkillDisplayName = (value: string) => {
  return value.trim().replace(/\s+/g, " ");
};

export const normalizeSkillName = (value: string) => {
  return cleanSkillDisplayName(value).toLowerCase();
};
