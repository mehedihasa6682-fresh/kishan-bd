
export const searchSynonyms: Record<string, string[]> = {
  'potato': ['alu', 'আলু', 'potato', 'potatoes', 'aloo', 'alo'],
  'fish': ['mach', 'maach', 'মাছ', 'fish', 'fishery'],
  'rice': ['chal', 'chaal', 'চাল', 'rice', 'ricey'],
  'egg': ['dim', 'ডিম', 'egg', 'eggs', 'anda'],
  'onion': ['peyaj', 'piyaj', 'পেঁয়াজ', 'onion', 'onions', 'payaj'],
  'oil': ['tel', 'তৈল', 'তেল', 'oil', 'oils'],
  'meat': ['mansho', 'mangsho', 'মাংস', 'meat', 'beef', 'chicken', 'mutton', 'gorur mangsho', 'khashir mangsho'],
  'milk': ['dudh', 'দুধ', 'milk', 'dudh', 'cow milk'],
  'honey': ['modhu', 'মধু', 'honey', 'pure honey'],
  'tomato': ['tomato', 'টমেটো', 'tamato'],
  'carrot': ['gajor', 'গাজর', 'carrot', 'carrots'],
  'cucumber': ['shosha', 'শসা', 'cucumber', 'shosa'],
  'garlic': ['rosun', 'রসুন', 'garlic', 'rashun'],
  'ginger': ['ada', 'আদা', 'ginger', 'adda'],
  'chili': ['moriach', 'morich', 'মরিচ', 'chili', 'chilli', 'jhal'],
  'mango': ['am', 'আম', 'mango', 'mangoes'],
  'banana': ['kola', 'কলা', 'banana', 'sagol kola'],
  'lemon': ['lebu', 'লেবু', 'lemon', 'lime'],
};

export function normalizeSearch(query: string): string[] {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length > 0);
  
  const expanded: string[] = [...words];
  
  // Find synonym match for each word
  for (const word of words) {
    for (const [key, synonyms] of Object.entries(searchSynonyms)) {
      if (synonyms.some(s => word.includes(s.toLowerCase()) || s.toLowerCase().includes(word))) {
        if (!expanded.includes(key)) expanded.push(key);
      }
    }
  }
  
  return expanded;
}

export function matchProduct(product: any, query: string): boolean {
  if (!query) return true;
  const normalizedWords = normalizeSearch(query);
  
  const fields = [
    product.name?.toLowerCase(),
    product.nameEn?.toLowerCase(),
    product.nameBn?.toLowerCase(),
    product.description?.toLowerCase(),
    product.descriptionEn?.toLowerCase(),
    product.category?.toLowerCase(),
    product.subCategory?.toLowerCase(),
    ...(product.tags || []).map((t: string) => t.toLowerCase()),
    ...(product.searchKeywords || []).map((k: string) => k.toLowerCase())
  ].filter(Boolean);
  
  // A match happens if ANY of the normalized search words are found in ANY of the product fields
  return normalizedWords.some(word => 
    fields.some(f => f.includes(word))
  );
}
