const ThemeKey = 'theme';

function saveThemeToLocalStorage(value: string) {
  localStorage.setItem(ThemeKey, value);
}

function getThemeFromLocalStorage() {
  return localStorage.getItem(ThemeKey);
}

export {
  saveThemeToLocalStorage,
  getThemeFromLocalStorage,
};
