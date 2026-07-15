const slugify = (text: string, fallback = "nexora"): string => {
  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
};

export default slugify;
