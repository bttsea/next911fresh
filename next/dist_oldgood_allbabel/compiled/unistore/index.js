// node_modules/unistore/dist/unistore.js
function n(n2, t) {
  for (var r in t)
    n2[r] = t[r];
  return n2;
}
module.exports = function(t) {
  var r = [];
  function u(n2) {
    for (var t2 = [], u2 = 0; u2 < r.length; u2++)
      r[u2] === n2 ? n2 = null : t2.push(r[u2]);
    r = t2;
  }
  function e(u2, e2, o) {
    t = e2 ? u2 : n(n({}, t), u2);
    for (var i = r, f = 0; f < i.length; f++)
      i[f](t, o);
  }
  return t = t || {}, { action: function(n2) {
    function r2(t2) {
      e(t2, false, n2);
    }
    return function() {
      for (var u2 = arguments, e2 = [t], o = 0; o < arguments.length; o++)
        e2.push(u2[o]);
      var i = n2.apply(this, e2);
      if (null != i)
        return i.then ? i.then(r2) : r2(i);
    };
  }, setState: e, subscribe: function(n2) {
    return r.push(n2), function() {
      u(n2);
    };
  }, unsubscribe: u, getState: function() {
    return t;
  } };
};
