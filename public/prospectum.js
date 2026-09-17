/* Prospectum AI · el movimiento de la pagina.
   Va con defer y la pagina se lee entera sin el. La clase .js la pone el marcado en
   linea, antes del primer pintado, porque si no las secciones parpadean. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency || 4) <= 2;

  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
  document.querySelectorAll('.reveal, .load, #method').forEach(function (el) { io.observe(el); });

  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.tile').forEach(function (t) {
      t.addEventListener('pointermove', function (ev) {
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        t.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      });
      t.addEventListener('pointerleave', function () { t.style.setProperty('--mx', '-400px'); });
    });
  }

  var steps = [].slice.call(document.querySelectorAll('.step'));
  var msgs = [].slice.call(document.querySelectorAll('#chat .msg'));
  function setStep(n) {
    steps.forEach(function (s) { s.classList.toggle('active', +s.dataset.step === n); });
    msgs.forEach(function (m) { m.classList.toggle('shown', +m.dataset.step <= n); });
  }
  setStep(1);
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setStep(+e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(function (s) { so.observe(s); });

  /* CONTACTO. Manda JSON a /api/contact. Sin guion, el form hace POST normal y el
     endpoint contesta con un redirect, que es lo que se lee aqui abajo. Nunca vuelve
     a pasar que los datos del visitante terminen en la URL. */
  var form = document.getElementById('form');
  var fmsg = document.getElementById('form-msg');
  var GRACIAS = 'Gracias, ya nos llego. Te contestamos hoy mismo.';
  var FALTAN = 'Nos falta tu nombre, tu correo o el mensaje.';
  var FALLO = 'No se pudo enviar. Escribenos por WhatsApp y lo vemos ahi.';
  function say(texto, clase) { if (!fmsg) return; fmsg.textContent = texto; fmsg.className = 'form-msg' + (clase ? ' ' + clase : ''); }
  var envio = new URLSearchParams(window.location.search).get('envio');
  if (envio === 'ok') say(GRACIAS, 'ok');
  else if (envio === 'faltan') say(FALTAN, 'bad');
  else if (envio === 'error') say(FALLO, 'bad');

  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var datos = {};
    new FormData(form).forEach(function (v, k) { datos[k] = String(v).trim(); });
    if (!datos.nombre || !datos.email || !datos.mensaje) { say(FALTAN, 'bad'); return; }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; say('Enviando...');
    fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () { form.reset(); say(GRACIAS, 'ok'); })
      .catch(function () { say(FALLO, 'bad'); })
      .then(function () { btn.disabled = false; });
  });

  /* consola: la ruta del dia */
  var cv = document.getElementById('route');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var STOPS = [
    { n: 'Centro de distribucion', x: .60, y: .10 },
    { n: 'Zona Hotelera', x: .80, y: .25 },
    { n: 'Puerto Morelos', x: .63, y: .41 },
    { n: 'Playa del Carmen', x: .49, y: .59 },
    { n: 'Akumal', x: .38, y: .75 },
    { n: 'Tulum', x: .25, y: .90 }
  ];
  var COAST = [[.74, 0], [.95, .17], [.93, .30], [.77, .45], [.63, .62], [.52, .78], [.40, 1]];
  var SEG = 40, W = 0, H = 0, pts = [], cum = [], total = 1, stopF = [];
  var state = [], avisos = 0, entregas = 0, t0 = 0;
  var MONO = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'monospace';
  var feed = document.getElementById('feed'), clock = document.getElementById('c-clock');
  var kEnt = document.getElementById('k-ent'), kAv = document.getElementById('k-av');
  var MOVE = 12600, HOLD = 3000, CYCLE = MOVE + HOLD;

  function cr(a, b, c, d, t) { var t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); }
  function build() {
    var P = STOPS.map(function (s) { return [s.x * W, s.y * H]; });
    pts = [];
    for (var i = 0; i < P.length - 1; i++) {
      var p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      for (var k = 0; k < SEG; k++) { var t = k / SEG; pts.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]); }
    }
    pts.push(P[P.length - 1]);
    cum = [0];
    for (var j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    total = cum[cum.length - 1] || 1;
    stopF = STOPS.map(function (s, i) { return cum[Math.min(i * SEG, cum.length - 1)] / total; });
  }
  function size() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build();
  }
  function at(f) {
    var d = f * total, lo = 0, hi = cum.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m; }
    var i = Math.max(1, lo), seg = (cum[i] - cum[i - 1]) || 1, t = (d - cum[i - 1]) / seg;
    return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, i: i };
  }
  function ease(u) { return -(Math.cos(Math.PI * u) - 1) / 2; }
  function hhmm(f) { var m = Math.round(8 * 60 + 12 + f * 112); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function push(time, text, ok) {
    var li = document.createElement('li'); li.className = 'new';
    li.innerHTML = '<time>' + time + '</time><span></span><em class="tag ' + (ok ? 'tag-ok">ENTREGADO' : 'tag-aviso">AVISO') + '</em>';
    li.querySelector('span').textContent = text;
    feed.insertBefore(li, feed.firstChild);
    while (feed.children.length > 4) feed.removeChild(feed.lastChild);
  }
  function reset() {
    state = STOPS.map(function (s, i) { return i === 0 ? 2 : 0; });
    avisos = 0; entregas = 0;
    feed.innerHTML = ''; push('08:12', 'Salio del centro de distribucion', false);
    feed.firstChild.querySelector('.tag').textContent = 'SALIDA';
    kEnt.textContent = '0/' + (STOPS.length - 1); kAv.textContent = '0';
  }
  function stopDot(s, i, now) {
    var x = s.x * W, y = s.y * H, st = state[i];
    if (st === 1) {
      var p = (now % 1200) / 1200;
      ctx.beginPath(); ctx.arc(x, y, 6 + p * 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(235,147,96,' + (0.7 * (1 - p)) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = '#EB9360'; ctx.fill();
    } else if (st === 2) {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = i === 0 ? '#FFFFFF' : '#8B8FF2'; ctx.fill();
      if (i > 0) { ctx.beginPath(); ctx.moveTo(x - 2.6, y + .2); ctx.lineTo(x - .6, y + 2.2); ctx.lineTo(x + 2.8, y - 2); ctx.strokeStyle = '#0B0C24'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.font = (W < 360 ? '10px ' : '11px ') + MONO;
    ctx.fillStyle = st === 0 ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.86)';
    ctx.textAlign = 'right'; ctx.fillText(s.n, x - 14, y + 4);
  }
  function draw(f, now) {
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    COAST.forEach(function (c, i) { var X = c[0] * W, Y = c[1] * H; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
    ctx.strokeStyle = 'rgba(139,143,242,.22)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
    ctx.fillStyle = 'rgba(139,143,242,.35)'; ctx.font = '10px ' + MONO;
    ctx.textAlign = 'left'; ctx.fillText('MAR CARIBE', Math.min(W - 78, .80 * W), .62 * H);
    ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    var v = at(f);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < v.i; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(v.x, v.y); ctx.strokeStyle = '#8B8FF2'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    STOPS.forEach(function (s, i) { stopDot(s, i, now); });
    if (f < 1) {
      ctx.beginPath(); ctx.arc(v.x, v.y, 13, 0, Math.PI * 2); ctx.fillStyle = 'rgba(235,147,96,.22)'; ctx.fill();
      ctx.beginPath(); ctx.arc(v.x, v.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    }
  }
  function notify(i, f) {
    if (state[i] !== 0) return;
    state[i] = 1; avisos++; kAv.textContent = avisos;
    push(hhmm(f), STOPS[i].n + ' - vamos en camino', false);
  }
  function deliver(i, f) {
    if (state[i] === 2) return;
    if (state[i] === 0) notify(i, Math.max(0, f - .08));
    state[i] = 2; entregas++; avisos++; kAv.textContent = avisos;
    kEnt.textContent = entregas + '/' + (STOPS.length - 1);
    push(hhmm(f), STOPS[i].n + ' - foto y firma', true);
  }
  var lastCycle = -1;
  function frame(now) {
    if (!t0) t0 = now;
    var c = Math.floor((now - t0) / CYCLE);
    if (c !== lastCycle) { lastCycle = c; reset(); }
    var e = (now - t0) % CYCLE;
    var n = STOPS.length - 1, f;
    if (e < MOVE) {
      var segDur = MOVE / n, s = Math.min(n - 1, Math.floor(e / segDur)), u = (e - s * segDur) / segDur;
      f = stopF[s] + (stopF[s + 1] - stopF[s]) * ease(u);
      for (var i = 1; i <= s; i++) deliver(i, stopF[i]);
      if (u > .45) notify(s + 1, f);
      if (u > .985) deliver(s + 1, f);
    } else {
      f = 1;
      for (var j = 1; j <= n; j++) deliver(j, 1);
    }
    clock.textContent = hhmm(f);
    draw(f, now);
    if (running) raf = requestAnimationFrame(frame);
  }
  var raf = 0, running = false;
  function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function staticDraw() { state = STOPS.map(function () { return 2; }); draw(1, 0); }

  size();
  staticDraw();
  if (window.ResizeObserver) new ResizeObserver(function () { size(); if (reduce || !running) staticDraw(); }).observe(cv);
  new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }, { threshold: 0.05 }).observe(cv);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (!reduce) start(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce || !running) staticDraw(); });
})();
