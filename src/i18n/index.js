// The app's own text in the user's language (Settings: English or Hindi). Strings missing from a
// language fall back to English, so a partial translation never shows a key. Values from the API
// (rejection reasons, notes, accuracy notes) stay in English for now.
import { useAuth } from "@/auth-context";
import en from "./en";
import hi from "./hi";

const TABLES = { en, hi };

export function languageOf(user) {
  return user?.settings?.language === "hi" ? "hi" : "en";
}

export function translate(lang, key, vars = {}) {
  const text = TABLES[lang]?.[key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

export function useLanguage() {
  return languageOf(useAuth()?.user);
}

/** t(key, vars): the text for `key` in the user's language. */
export function useT() {
  const lang = useLanguage();
  return (key, vars) => translate(lang, key, vars);
}
