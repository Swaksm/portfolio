// Détection de langue partagée par les pages non générées (404, mentions légales).
// Même règle que _build/head.html : choix mémorisé, sinon langue du navigateur.
window.swaksLang = function () {
  let lang = '';
  try { lang = localStorage.getItem('swaks-lang') || ''; } catch (e) {}
  if (!lang) lang = /^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'fr' : 'en';
  return lang;
};
