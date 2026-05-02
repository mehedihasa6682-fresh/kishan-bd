
export const searchSynonyms: Record<string, string[]> = {
  'potato': ['alu', 'আলু', 'potato', 'potatoes', 'aloo'],
  'fish': ['mach', 'maach', 'মাছ', 'fish'],
  'rice': ['chal', 'chaal', 'চাল', 'rice'],
  'egg': ['dim', 'ডিম', 'egg', 'eggs'],
  'onion': ['peyaj', 'piyaj', 'পেঁয়াজ', 'onion'],
  'oil': ['tel', 'তৈল', 'তেল', 'oil'],
  'meat': ['mansho', 'mangsho', 'মাংস', 'meat', 'beef', 'chicken', 'mutton'],
  'milk': ['dudh', 'দুধ', 'milk'],
  'honey': ['modhu', 'মধু', 'honey'],
  'tomato': ['tomato', 'টমেটো'],
  'carrot': ['gajor', 'গাজর', 'carrot'],
  'cucumber': ['shosha', 'শসা', 'cucumber'],
  'garlic': ['rosun', 'রসুন', 'garlic'],
  'ginger': ['ada', 'আদা', 'ginger'],
  'chili': ['moriach', 'morich', 'মরিচ', 'chili', 'chilli'],
};

export function normalizeSearch(query: string): string {
  const q = query.toLowerCase().trim();
  
  // Find synonym match
  for (const [key, synonyms] of Object.entries(searchSynonyms)) {
    if (synonyms.some(s => q.includes(s.toLowerCase()))) {
      return key;
    }
  }
  
  return q;
}

export function matchProduct(product: any, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const normalized = normalizeSearch(q);
  
  const fields = [
    product.name?.toLowerCase(),
    product.nameEn?.toLowerCase(),
    product.nameBn?.toLowerCase(),
    product.description?.toLowerCase(),
    product.descriptionEn?.toLowerCase(),
    product.category?.toLowerCase(),
    product.subCategory?.toLowerCase(),
    ...(product.keywords || []).map((k: string) => k.toLowerCase())
  ];
  
  return fields.some(f => f?.includes(q) || f?.includes(normalized));
}
