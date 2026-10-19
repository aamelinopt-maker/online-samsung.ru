/* Runs before the source scripts. No analytics, payments or server submissions. */
window.dataLayer = [];
window.mindbox = function () {};
window.ym = function () {};
(() => {
  const allowed = value => {
    try {
      const u = new URL(value, location.href);
      return (u.protocol === 'file:' && !u.hostname) || (u.protocol !== 'file:' && u.origin === location.origin) || /^(api-maps\.yandex\.ru|(?:[^.]+\.)*maps\.yandex\.net|yastatic\.net|(?:[^.]+\.)?yandex\.ru)$/.test(u.hostname) && !/^(mc|pay)\./.test(u.hostname);
    } catch { return false; }
  };
  const append = Node.prototype.appendChild, insert = Node.prototype.insertBefore;
  function permitted(node) {
    return node.tagName !== 'SCRIPT' || !node.src || allowed(node.src);
  }
  Node.prototype.appendChild = function (node) { return permitted(node) ? append.call(this, node) : node; };
  Node.prototype.insertBefore = function (node, ref) { return permitted(node) ? insert.call(this, node, ref) : node; };
})();
