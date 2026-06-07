export function getNextExpandedParentId(currentExpandedParentId, clickedParentId) {
  return currentExpandedParentId === clickedParentId ? null : clickedParentId;
}

export function getVisibleCategoryIds(categories, expandedParentId) {
  const ids = [];
  for (const parent of categories.filter((category) => !category.parentId)) {
    ids.push(parent.id);
    if (parent.id === expandedParentId) {
      ids.push(...categories.filter((category) => category.parentId === parent.id).map((category) => category.id));
    }
  }
  return ids;
}
