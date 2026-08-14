export function createSitePath(root: string, path = ""): string {
  const cleanRoot = root || ".";
  return path ? `${cleanRoot}/${path}` : `${cleanRoot}/`;
}

export function navigationItems(
  items: Array<{ id: string; label: string; path: string }>,
  root: string
) {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    path: item.id === "home" ? createSitePath(root) : createSitePath(root, item.path)
  }));
}
