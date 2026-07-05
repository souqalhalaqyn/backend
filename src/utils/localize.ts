/**
 * Localizes an object (or array of objects) by picking the correct language version
 * of bilingual fields and exposing them under language-neutral keys.
 *
 * Example transformation:
 *   { nameEn: "Shampoo", nameAr: "شامبو", price: 10 }
 *   with lang="ar" → { name: "شامبو", price: 10 }
 *
 * Bilingual field pairs recognized:
 *   nameEn/nameAr → name
 *   descriptionEn/descriptionAr → description
 *   descriptionEn/descriptionAr → description
 *   deliveryCompanyEn/deliveryCompanyAr → deliveryCompany
 *   tagsEn/tagsAr → tags
 *   aliasesEn/aliasesAr → aliases
 *   notesEn/notesAr → notes
 */

const BILINGUAL_PAIRS = [
  ["nameEn", "nameAr"],
  ["descriptionEn", "descriptionAr"],
  ["deliveryCompanyEn", "deliveryCompanyAr"],
] as const;

const BILINGUAL_ARRAY_PAIRS = [
  ["tagsEn", "tagsAr"],
  ["aliasesEn", "aliasesAr"],
  ["notesEn", "notesAr"],
] as const;

function localizeDoc(doc: Record<string, unknown>, lang: "en" | "ar"): Record<string, unknown> {
  if (!doc || typeof doc !== "object") return doc;

  const result: Record<string, unknown> = {};

  for (const key of Object.keys(doc)) {
    const value = doc[key];

    // Check if this key matches a bilingual pair target key (e.g., "nameEn" → "name")
    const pair = BILINGUAL_PAIRS.find(([en, ar]) => key === en || key === ar);
    if (pair) {
      const [enKey, arKey] = pair;
      const target = key.replace(/En$|Ar$/, "");
      // Only set the target once (when we encounter the first key of the pair)
      if (!(target in result)) {
        result[target] = lang === "ar" ? (doc[arKey] ?? doc[enKey]) : (doc[enKey] ?? doc[arKey]);
      }
      continue;
    }

    // Check if this key matches a bilingual array pair
    const arrayPair = BILINGUAL_ARRAY_PAIRS.find(([en, ar]) => key === en || key === ar);
    if (arrayPair) {
      const [enKey, arKey] = arrayPair;
      const target = key.replace(/En$|Ar$/, "");
      if (!(target in result)) {
        result[target] = lang === "ar" ? (doc[arKey] ?? doc[enKey]) : (doc[enKey] ?? doc[arKey]);
      }
      continue;
    }

    // Recurse into plain objects (not ObjectId, Date, Buffer, etc.) and arrays of objects
    if (value && typeof value === "object" && !Array.isArray(value) && value.constructor === Object) {
      result[key] = localizeDoc(value as Record<string, unknown>, lang);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item) && item.constructor === Object
          ? localizeDoc(item as Record<string, unknown>, lang)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function localize<T extends Record<string, unknown> | Record<string, unknown>[]>(
  data: T,
  lang: "en" | "ar",
  req?: { isAdminRequest?: boolean },
): T {
  if (req?.isAdminRequest) return data;
  if (Array.isArray(data)) {
    return data.map((item) => localizeDoc(item, lang)) as T;
  }
  return localizeDoc(data, lang) as T;
}
