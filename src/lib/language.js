const LANGUAGE_STORAGE_KEY = 'tracey-trials-language'

export function getStoredLanguage() {
  const value = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return value === 'pt' ? 'pt' : 'en'
}

export function setStoredLanguage(language) {
  if (language === 'pt' || language === 'en') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }
}
