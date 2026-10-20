/* Motor Dynasty product studio: deterministic, state-driven SVG illustrations. */
(() => {
  'use strict';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Number(x) || 0));
  const paint = x => /^#[a-f\d]{6}$/i.test(String(x)) ? x : '#49736c';
  const shade = (hex, factor) => '#' + [1, 3, 5].map(i => Math.round(clamp(parseInt(hex.slice(i, i + 2), 16) * factor, 0, 255)).toString(16).padStart(2, '0')).join('');
  const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const label = (x, y, text, size = 12, color = '#9caeb6', extra = '') => `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" ${extra}>${esc(text)}</text>`;
  const defs = color => `<defs>
    <linearGradient id="studio" x2="0" y2="1"><stop stop-color="#26383c"/><stop offset=".65" stop-color="#111e23"/><stop offset="1" stop-color="#0c151b"/></linearGradient>
    <radialGradient id="light"><stop stop-color="#68868c" stop-opacity=".38"/><stop offset="1" stop-color="#68868c" stop-opacity="0"/></radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="${shade(color, 1.8)}"/><stop offset=".22" stop-color="${shade(color, 1.24)}"/><stop offset=".42" stop-color="${color}"/><stop offset=".47" stop-color="${shade(color, .75)}"/><stop offset=".9" stop-color="${shade(color, .43)}"/><stop offset="1" stop-color="${shade(color, .8)}"/></linearGradient>
    <linearGradient id="metal" x2=".35" y2="1"><stop stop-color="#edf0e8"/><stop offset=".25" stop-color="#89999d"/><stop offset=".52" stop-color="#cad4d1"/><stop offset="1" stop-color="#40545e"/></linearGradient>
    <linearGradient id="darkMetal" x2=".4" y2="1"><stop stop-color="#849498"/><stop offset=".3" stop-color="#344951"/><stop offset="1" stop-color="#172831"/></linearGradient>
    <linearGradient id="glass" x2="1" y2=".7"><stop stop-color="#9fb8bd"/><stop offset=".24" stop-color="#435c67"/><stop offset=".4" stop-color="#1c3542"/><stop offset=".47" stop-color="#627a86"/><stop offset="1" stop-color="#142b38"/></linearGradient>
    <radialGradient id="tire"><stop stop-color="#39434a"/><stop offset=".7" stop-color="#182127"/><stop offset=".93" stop-color="#070d12"/><stop offset="1" stop-color="#27343b"/></radialGradient>
    <radialGradient id="lamp"><stop stop-color="#fffbd9"/><stop offset=".55" stop-color="#d9e9e7"/><stop offset="1" stop-color="#7b959b"/></radialGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>`;
  const backdrop = (name, subtitle) => `<rect width="1200" height="680" fill="url(#studio)"/><ellipse cx="620" cy="270" rx="540" ry="340" fill="url(#light)"/><path d="M0 548H1200 M100 680L520 520 M1100 680L740 520" stroke="#45606a" opacity=".17"/><ellipse cx="600" cy="546" rx="457" ry="29" fill="#02070b" opacity=".65" filter="url(#shadow)"/>${label(58, 58, name, 18, '#ecf1e9', 'letter-spacing="2"')}${label(58, 82, subtitle, 11, '#8ea6ae', 'letter-spacing="1.5"')}`;
  const svg = (name, content, color = '#49736c') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" role="img" aria-label="${esc(name)}">${defs(color)}${content}</svg>`;
  function bodyType(raw) {
    const b = String(raw || 'sedan').toLowerCase();
    if (/minivan/.test(b)) return 'minivan';
    if (/utility truck|commercial truck/.test(b)) return 'utility truck';
    if (/pickup|truck/.test(b)) return 'pickup';
    if (/crossover/.test(b)) return 'crossover';
    if (/suv|off.?road/.test(b)) return 'suv';
    if (/convert/.test(b)) return 'convertible';
    if (/wagon|estate/.test(b)) return 'wagon';
    if (/hatch|economy/.test(b)) return 'hatch';
    if (/van|commercial/.test(b)) return 'van';
    if (/coupe|sports|performance|gt|muscle/.test(b)) return 'coupe';
    return 'sedan';
  }
  function wheel(x, y, r, alloy, modern, profile, finish) {
    const rr = r * clamp(.42 + (100 - profile) * .004, .44, .76);
    let spokes = '';
    if (finish === 'steel') spokes = `<circle r="${rr * .82}" fill="#55636b"/><circle r="${rr * .46}" fill="#36454e"/>`;
    else if (alloy && (modern || finish === 'alloy')) for (let i = 0; i < 10; i++) spokes += `<path d="M-4 -${rr * .3}L-7 -${rr * .86}L4 -${rr * .92}L6 -${rr * .3}Z" fill="#b7c6cc" transform="rotate(${i * 36})"/>`;
    else spokes = `<ellipse rx="${rr * .82}" ry="${rr * .82}" fill="url(#metal)"/><ellipse rx="${rr * .57}" ry="${rr * .57}" fill="#a7b4b6"/>`;
    return `<g transform="translate(${x} ${y}) scale(.94 1)"><circle r="${r}" fill="url(#tire)"/><circle r="${r * .87}" fill="none" stroke="#6d787b" stroke-width="1.5" opacity=".35"/><circle r="${rr}" fill="#23343d" stroke="#a9bec5" stroke-width="3"/>${spokes}<circle r="${rr * .22}" fill="url(#metal)"/><circle r="${rr * .1}" fill="#2d434d"/>${Array.from({length:5}, (_, i) => `<circle cx="0" cy="${-rr * .3}" r="2.8" fill="#e3e7df" transform="rotate(${i * 72})"/>`).join('')}</g>`;
  }
  function vehicleSVG(d = {}, stats = {}, identity = {}) {
    const year = Number(identity.modelYear || d.modelYear || d.createdYear || 1970), body = bodyType(d.body || stats.body), color = paint(d.paintColor), historic = year < 1955, classic = year >= 1955 && year < 1975, angular = year >= 1975 && year < 1995;
    const target = String(d.target || stats.className || '').toLowerCase(), luxury = /lux|premium/.test(target), sport = /sport|track|performance/.test(target) || body === 'coupe', utility = /suv|pickup|truck|van/.test(body), offroad = /off.?road/.test(target);
    const styling = d.presentationStyle || {};
    const roofDelta = (clamp(d.roofHeight ?? 50, 0, 100) - 50) * .75, cabin = (clamp(d.cabinPosition ?? 50, 0, 100) - 50) * 1.1;
    let roofY = (utility ? 228 : sport ? 278 : historic ? 233 : 258) - roofDelta, roofFront = (body === 'van' || body === 'minivan' ? 390 : sport ? 535 : 490) + cabin, roofRear = (body === 'wagon' || utility || body === 'hatch' ? 930 : sport ? 742 : 792) + cabin * .35;
    let hoodY = historic ? 365 : utility ? 363 : sport ? 408 : 387, tailY = utility ? 385 : sport ? 407 : 392;
    if (body === 'pickup' || body === 'utility truck') roofRear = 696 + cabin * .3;
    if (styling.coachwork === 'formal') { roofY -= 14; roofFront -= 10; roofRear += 28; }
    if (styling.coachwork === 'flowing') { roofY += 7; roofFront += 14; roofRear += 40; }
    if (styling.coachwork === 'sporting') { roofY += 23; roofFront += 28; roofRear -= 24; }
    const front = 185 - (clamp(d.noseLength ?? 50, 0, 100) - 50) * .65, rear = body === 'hatch' ? 1030 : 1080;
    const top = body === 'convertible' ? `L${roofFront - 34} ${hoodY - 6}L${roofFront + 17} ${roofY + 20}L${roofFront + 39} ${roofY + 24}L${roofFront + 7} ${hoodY - 11}Q690 ${hoodY - 40}830 ${tailY - 14}` : historic ? `L380 ${hoodY - 6}Q${roofFront - 24} ${roofY - 15} ${roofFront + 72} ${roofY}L${roofRear - 82} ${roofY - 4}Q${roofRear} ${roofY - 5} ${roofRear + 72} ${tailY - 5}` : `L${roofFront - 78} ${hoodY - 12}${angular ? 'L' : 'Q' + (roofFront - 22) + ' ' + (roofY - 3) + ' '}${roofFront} ${roofY}L${roofRear} ${roofY + (sport ? 8 : 0)}${angular ? 'L' : 'Q' + (roofRear + 38) + ' ' + roofY + ' '}${roofRear + (utility || body === 'hatch' ? 55 : 110)} ${tailY - 12}`;
    const outline = `M${front} ${hoodY + 64}Q${front - 5} ${hoodY + 7} ${front + 67} ${hoodY} ${top}L${rear - 48} ${tailY}Q${rear + 15} ${tailY + 4} ${rear} 464L${rear - 45} 484L${front + 12} 500Z`;
    const cut = `<clipPath id="bodyClip">${path(outline, '#fff')}</clipPath>`;
    const ride = clamp(d.rideHeight ?? 165, 70, 380), radius = utility ? 78 : historic ? 75 : sport ? 69 : 72, wy = 477 + (ride - 165) * .06;
    const xFront = 336, xRear = body === 'hatch' ? 868 : 913, wheelbase = clamp(d.wheelbase ?? 2700, 2100, 3600) / 2700, track = clamp(d.trackWidth ?? 1480, 1200, 2000) / 1480;
    const gen = Number(identity.generation || 1), revision = Number(d.visualRevision || 0), seed = String(identity.visualSeed || identity.name || d.name || 'Motor');
    const hash = [...seed].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7), brandLine = (hash % 5) * 2 + (gen % 3) * 2 + Math.min(6, revision);
    let car = `<defs>${cut}</defs>${path(outline, 'url(#body)', `stroke="${shade(color, .4)}" stroke-width="3"`)}<g clip-path="url(#bodyClip)">`;
    car += path(`M${front} ${hoodY + 18}Q360 ${hoodY - 4}470 ${hoodY - 6}L${roofFront} ${roofY}L${roofRear} ${roofY}L${roofRear + 70} ${tailY}Q650 ${hoodY + 9} ${front} ${hoodY + 18}`, shade(color, 1.35), 'opacity=".42"');
    if (body !== 'convertible') {
      const wr = Math.min(roofRear + 46, rear - 88), wf = roofFront - 55;
      const windowD = historic ? `M421 ${hoodY - 11}Q${roofFront + 3} ${roofY + 12} ${roofFront + 76} ${roofY + 17}L${roofRear - 73} ${roofY + 13}Q${roofRear - 12} ${roofY + 16} ${wr} ${tailY - 26}Z` : `M${wf} ${hoodY - 24}L${roofFront + 14} ${roofY + 16}L${roofRear - 12} ${roofY + 16}L${wr} ${tailY - 28}Z`;
      car += path(windowD, 'url(#glass)', `stroke="${luxury || year < 1980 ? '#aabbbb' : '#17272e'}" stroke-width="5"`);
      car += path(`M${roofFront + (roofRear - roofFront) * .46} ${roofY + 17}L${roofFront + (roofRear - roofFront) * .44 - 15} ${hoodY - 17}`, 'none', 'stroke="#162731" stroke-width="12"');
      if (!sport && body !== 'pickup') car += path(`M${roofRear - 55} ${roofY + 17}L${roofRear - 33} ${tailY - 24}`, 'none', 'stroke="#1a2e37" stroke-width="8"');
      car += path(`M${roofFront + 18} ${roofY + 20}L${roofRear - 20} ${roofY + 20}L${roofRear - 60} ${roofY + 48}L${roofFront + 48} ${roofY + 48}Z`, '#d3e5df', 'opacity=".11"');
    }
    if (/pickup|utility truck/.test(body)) car += path(`M742 ${tailY - 8}L${rear - 20} ${tailY - 8}L${rear - 31} ${tailY + 24}L750 ${tailY + 18}Z`, '#142930', 'stroke="#8ba2a2" stroke-width="3"') + path(`M739 ${tailY + 12}L739 479`, 'none', 'stroke="#1a3137" stroke-width="4"');
    if (historic) car += path(`M${front + 22} ${hoodY + 60}Q247 387 339 397Q422 405 428 472L416 502H${front + 17}Z`, 'url(#body)', 'stroke="#122930" stroke-width="2"') + path(`M828 474Q833 396 923 392Q1022 390 1042 469L1024 492H828Z`, 'url(#body)', 'stroke="#122930" stroke-width="2"');
    car += path(`M${front + 12} ${hoodY + 51 + brandLine}Q590 ${hoodY + 60 + brandLine} ${rear - 20} ${tailY + 40}`, 'none', `stroke="${luxury || classic ? '#a3bbbd' : shade(color, 1.55)}" stroke-width="${luxury ? 4 : 2}" opacity=".75"`);
    const seam = roofFront + (sport ? 205 : 145);
    car += path(`M${seam} ${hoodY - 20}L${seam + 4} 467Q620 488 430 476`, 'none', `stroke="${shade(color, .5)}" stroke-width="2.5"`);
    if (!sport && !/pickup/.test(body)) car += path(`M${roofRear - 30} ${tailY - 23}L${roofRear - 21} 470`, 'none', `stroke="${shade(color, .5)}" stroke-width="2"`);
    car += `<rect x="${seam - 57}" y="${hoodY + 10}" width="31" height="5" rx="2" fill="url(#metal)"/>`;
    if (!sport && !/pickup/.test(body)) car += `<rect x="${roofRear - 75}" y="${tailY + 13}" width="27" height="4" rx="2" fill="url(#metal)"/>`;
    car += path(`M${roofFront - 48} ${hoodY - 12}Q${roofFront - 80} ${hoodY - 34} ${roofFront - 93} ${hoodY - 16}L${roofFront - 76} ${hoodY}Z`, 'url(#metal)', 'stroke="#314852" stroke-width="2"');
    car += path(`M${front + 7} 476H${rear - 12}L${rear - 31} 500H${front + 15}Z`, offroad ? '#17272e' : shade(color, .54));
    car += `<circle cx="${xFront}" cy="${wy}" r="${radius + 9}" fill="#070f16"/><circle cx="${xRear}" cy="${wy - 5}" r="${radius + 9}" fill="#070f16"/></g>`;
    const alloyFinish = d.presentationWheel ? d.presentationWheel === 'alloy' : !/steel/.test(d.wheelMaterial || 'steel');
    car += wheel(xFront, wy, radius, alloyFinish, !historic, Number(d.tireProfile || 65), d.presentationWheel) + wheel(xRear, wy - 5, radius, alloyFinish, !historic, Number(d.tireProfile || 65), d.presentationWheel);
    car += path(`M${front + 8} ${hoodY + 21}L${front - 17} ${hoodY + 26}L${front - 24} 469L${front + 14} 479Z`, shade(color, .69), 'stroke="#283f47" stroke-width="2"');
    if (!styling.grille || styling.grille === 'original') {
    car += `<rect x="${front - 14}" y="${hoodY + 58}" width="33" height="${historic ? 52 : 28}" rx="${historic ? 10 : 3}" fill="#11212b" stroke="#98acb0" stroke-width="2"/>${Array.from({length:historic ? 7 : 4}, (_, i) => `<path d="M${front - 10} ${hoodY + 64 + i * (historic ? 6 : 5)}H${front + 15}" stroke="#8ba2aa"/>`).join('')}`;
    } else {
      const x = front - 14, y = hoodY + 58, height = historic ? 52 : 28;
      car += `<g data-grille-style="${esc(styling.grille)}"><rect x="${x}" y="${y}" width="33" height="${height}" rx="3" fill="#11212b" stroke="#98acb0" stroke-width="2"/>`;
      if (styling.grille === 'vertical') car += Array.from({length:5}, (_, i) => `<path d="M${x + 5 + i * 6} ${y + 3}V${y + height - 3}" stroke="#b9c9ca" stroke-width="2"/>`).join('');
      if (styling.grille === 'horizontal') car += Array.from({length:4}, (_, i) => `<path d="M${x + 3} ${y + 5 + i * (height - 8) / 4}H${x + 30}" stroke="#b9c9ca" stroke-width="2"/>`).join('');
      if (styling.grille === 'mesh') car += Array.from({length:6}, (_, i) => `<path d="M${x + 3} ${y + 3 + i * (height - 6) / 6}L${x + 30} ${y + 6 + i * (height - 6) / 6}M${x + 5 + i * 4} ${y + 3}V${y + height - 3}" stroke="#66818d"/>`).join('');
      car += '</g>';
    }
    if (styling.lighting === 'quad') car += `<g data-light-style="quad">${[front + 29, front + 60].map(x => `<ellipse cx="${x}" cy="${hoodY + 34}" rx="13" ry="19" fill="url(#lamp)" stroke="#d4ddda" stroke-width="3"/>`).join('')}</g>`;
    else if (styling.lighting === 'round') car += `<g data-light-style="round"><ellipse cx="${front + 40}" cy="${hoodY + 34}" rx="19" ry="24" fill="url(#lamp)" stroke="#d4ddda" stroke-width="4"/></g>`;
    else if (styling.lighting === 'rectangular') car += `<g data-light-style="rectangular"><rect x="${front + 9}" y="${hoodY + 21}" width="66" height="24" rx="2" fill="url(#lamp)" stroke="#a4bec8" stroke-width="3"/></g>`;
    else {
    car += historic || classic || d.headlightStyle === 'round' ? `<ellipse cx="${front + 40}" cy="${hoodY + 34}" rx="19" ry="24" fill="url(#lamp)" stroke="#d4ddda" stroke-width="4"/>` : path(`M${front + 9} ${hoodY + 23}L${front + 82} ${hoodY + 23}L${front + 67} ${hoodY + 44}L${front + 5} ${hoodY + 43}Z`, 'url(#lamp)', 'stroke="#a4bec8" stroke-width="2"');
    }
    car += path(`M${front - 22} 466L${front + 81} 482`, 'none', `stroke="${year < 1985 || luxury ? '#cad7d5' : '#263840'}" stroke-width="${historic ? 12 : 7}" stroke-linecap="round"`);
    car += path(`M${rear - 16} ${tailY + 25}L${rear - 55} ${tailY + 25}L${rear - 52} ${tailY + 43}L${rear - 12} ${tailY + 43}Z`, '#da7063', 'stroke="#f0a28d" stroke-width="1"');
    if (sport && d.rearAero !== 'none' && d.rearAero) car += path(`M${rear - 120} ${tailY - 28}H${rear - 5}L${rear - 12} ${tailY - 21}H${rear - 111}Z`, '#142834') + path(`M${rear - 35} ${tailY - 21}V${tailY}`, 'none', 'stroke="#344f58" stroke-width="5"');
    const name = identity.name || d.name || 'Untitled vehicle', subtitle = `${year} / ${body.toUpperCase()} / GENERATION ${gen}${stats.hp ? ' / ' + Math.round(stats.hp) + ' HP' : ''}`;
    return svg(name, backdrop(name.toUpperCase(), subtitle) + `<g data-body="${body}" data-era="${year}" transform="translate(${600 - 600 * clamp(wheelbase, .88, 1.12)} 5) scale(${clamp(wheelbase, .88, 1.12)} ${clamp(track, .93, 1.07)})">${car}</g>` + label(60, 622, 'MOTOR DYNASTY  /  DESIGN STUDIO', 10, '#71909a', 'letter-spacing="2"') + label(1140, 622, `${d.enginePlacement || 'front'} engine · ${d.drivetrain || 'RWD'}`, 10, '#a8b9ba', 'text-anchor="end"'), color);
  }
  const point = (x, y, z) => [600 + (x - y) * .9, 415 + (x + y) * .34 - z];
  const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(p => point(...p).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
  function box(x, y, z, l, w, h, fill = 'url(#metal)') {
    return poly([[x,y,z+h],[x+l,y,z+h],[x+l,y+w,z+h],[x,y+w,z+h]], fill, 'stroke="#b2c2c4" stroke-width="1"') + poly([[x,y+w,z+h],[x+l,y+w,z+h],[x+l,y+w,z],[x,y+w,z]], 'url(#darkMetal)', 'stroke="#617982" stroke-width="1"') + poly([[x+l,y,z+h],[x+l,y+w,z+h],[x+l,y+w,z],[x+l,y,z]], '#435c66', 'stroke="#718a90" stroke-width="1"');
  }
  function cylinder(x, y, z, radius, id) {
    const [cx,cy] = point(x,y,z);
    return `<g data-cylinder="${id}"><path d="M${cx-radius} ${cy}v26q${radius} 17 ${radius*2} 0v-26" fill="url(#darkMetal)" stroke="#80999e"/><ellipse cx="${cx}" cy="${cy}" rx="${radius}" ry="${radius*.48}" fill="url(#metal)" stroke="#c6d0cb"/><ellipse cx="${cx}" cy="${cy}" rx="${radius*.62}" ry="${radius*.30}" fill="#243a46"/><ellipse cx="${cx}" cy="${cy-1}" rx="${radius*.46}" ry="${radius*.20}" fill="#a2bdc2"/><path d="M${cx-5} ${cy}h10" stroke="#304954" stroke-width="2"/></g>`;
  }
  function electricMotor(x = -145, y = -38, z = 55, scale = 1) {
    const [cx,cy] = point(x,y,z);
    return `<g transform="translate(${cx} ${cy}) scale(${scale})" data-architecture="electric"><path d="M0-65H235Q275-65 275 0Q275 65 235 65H0Z" fill="url(#metal)" stroke="#abc1c5" stroke-width="2"/><ellipse rx="46" ry="65" fill="url(#darkMetal)" stroke="#99bec6" stroke-width="3"/>${Array.from({length:12}, (_, i) => `<path d="M${42+i*15}-55v110" stroke="#4d6d7b" stroke-width="4" opacity=".7"/>`).join('')}<ellipse rx="30" ry="44" fill="#194351" stroke="#62c4ce" stroke-width="6"/><ellipse rx="15" ry="23" fill="#476773" stroke="#c2d3d3" stroke-width="5"/><path d="M-15-12H-55v24h40" fill="url(#metal)"/><rect x="75" y="-76" width="95" height="25" rx="8" fill="#1a4653" stroke="#70aeb8"/><path d="M110-78v-30h100" fill="none" stroke="#de8a3e" stroke-width="7"/></g>`;
  }
  function engineSVG(d = {}, stats = {}) {
    const config = String(d.config || d.architecture || 'I4'), low = config.toLowerCase(), electric = /electric|^ev$|motor/.test(low), rotary = /rotary|wankel|^r[123]$/.test(low), boxer = /boxer|flat|^[bfh][46]$/.test(low), narrowV = /^vr\d/.test(low), w = /^w\d/.test(low), v = /^v(?:r)?\d/.test(low) || w, hybrid = /hybrid/.test(low) || !!d.hybrid, diesel = /diesel/.test(String(d.fuel || config).toLowerCase());
    const count = electric ? 0 : rotary ? 0 : clamp(config.match(/\d+/)?.[0] || 4, 2, 16), bankCount = w ? 4 : v || boxer ? 2 : 1, rows = Math.ceil(count / bankCount), length = Math.max(165, rows * 43), width = w ? 220 : narrowV ? 108 : v ? 162 : boxer ? 265 : 78, start = -length / 2;
    let engine = '';
    if (electric) engine = electricMotor();
    else if (rotary) {
      const rotors = clamp(d.rotors || config.match(/\d+/)?.[0] || 2,1,4);
      for (let i = rotors-1; i >= 0; i--) {
        const x = 500 + i*55, y = 312 + i*17;
        engine += `<g data-rotor="${i+1}" transform="translate(${x} ${y})"><rect x="-10" y="-81" width="77" height="164" rx="37" fill="url(#darkMetal)" stroke="#7e979d" stroke-width="3"/><ellipse rx="65" ry="85" fill="url(#metal)" stroke="#bdc9c4" stroke-width="4"/><path d="M0-55Q58-10 40 37Q-20 66-50 6Q-31-34 0-55Z" fill="#334d56" stroke="#73a9b4" stroke-width="4"/><circle r="13" fill="url(#metal)"/>${[-1,1].map(a=>`<circle cx="${a*45}" cy="-35" r="4" fill="#172d3a"/><circle cx="${a*44}" cy="35" r="4" fill="#172d3a"/>`).join('')}</g>`;
      }
      engine += box(-190,60,0,285,75,40);
    } else {
      engine += box(start,-width/2,0,length,width,70,'url(#darkMetal)');
      engine += box(start+8,-width/2+8,70,length-16,width-16,48);
      const banks = boxer ? [-112,112] : w ? [-85,-30,30,85] : narrowV ? [-24,24] : v ? [-65,65] : [0];
      let id = 0;
      for (const [bankIndex,bank] of banks.entries()) {
        const bankRows = Math.floor(count / bankCount) + (bankIndex < count % bankCount ? 1 : 0);
        engine += box(start-7,bank-26,112,length+14,52,boxer?15:30, 'url(#body)');
        for (let i=0;i<bankRows;i++) engine += cylinder(start+23+i*43,bank,boxer?140:v?162:153,17,++id);
        engine += poly([[start,bank-22,187],[start+length,bank-22,187],[start+length,bank-14,187],[start,bank-14,187]], '#afc7ca');
        for(let i=0;i<bankRows;i++) {
          const [x,y]=point(start+23+i*43,bank+30,114);
          engine += `<path d="M${x} ${y}q-14 25-4 48" fill="none" stroke="${diesel?'#a07d52':'#9d9d89'}" stroke-width="8" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="4" fill="#d1ded4"/>`;
        }
      }
      const [px,py]=point(start+length+12,0,68);
      engine += `<ellipse cx="${px}" cy="${py}" rx="39" ry="54" fill="#1a2931" stroke="#a2b5b9" stroke-width="6"/><ellipse cx="${px}" cy="${py}" rx="18" ry="29" fill="url(#metal)"/><path d="M${px-17} ${py-48}Q${px-75} ${py-18} ${px-35} ${py+45}" fill="none" stroke="#13242e" stroke-width="10"/>`;
      if (d.aspiration && d.aspiration !== 'na') {
        engine += `<g data-induction="${esc(d.aspiration)}" transform="translate(430 367)"><ellipse rx="43" ry="37" fill="url(#metal)" stroke="#9dbac2" stroke-width="3"/><ellipse rx="24" ry="22" fill="#273f4c" stroke="#96b7be" stroke-width="7"/><path d="M-28-30L-65-51h-32" fill="none" stroke="#89a8b4" stroke-width="18"/><path d="M28 20h58q25 0 27-32" fill="none" stroke="#68899b" stroke-width="15"/></g>`;
      }
      if(hybrid) engine += electricMotor(-225,115,0,.55)+box(145,110,5,130,85,38,'#418a94');
    }
    const title=d.name||config+' power unit', hp=Math.round(Number(stats.hp||0)), disp=Number(stats.disp||0), subtitle=`${config.toUpperCase()} / ${electric?'ELECTRIC DRIVE':rotary?'ROTARY ARCHITECTURE':count+' CYLINDERS'}${diesel?' / DIESEL':''}${hp?' / '+hp+' HP':''}${disp?' / '+disp.toFixed(2)+' L':''}`;
    const presentationScale = hybrid || boxer || count >= 10 ? 1.45 : 1.65;
    return svg(title,backdrop(title.toUpperCase(),subtitle)+`<g data-architecture="${esc(config)}" transform="translate(600 350) scale(${presentationScale}) translate(-600 -350)">${engine}</g>`+label(70,573,electric?'STATOR  /  ROTOR  /  REDUCTION INTERFACE':rotary?'ROTOR HOUSINGS  /  ECCENTRIC SHAFT':boxer?'HORIZONTALLY OPPOSED CYLINDER BANKS':w?'FOUR CYLINDER BANKS  /  COMMON CRANKSHAFT':narrowV?'NARROW V BANKS  /  SHARED CYLINDER HEAD':v?'DUAL CYLINDER BANKS  /  CENTRAL CRANKSHAFT':'SINGLE CYLINDER BANK  /  LONGITUDINAL CRANKSHAFT',11,'#80a5ad','letter-spacing="1.4"')+label(70,620,'MOTOR DYNASTY  /  POWER UNIT ENGINEERING',10,'#6e8e99','letter-spacing="2"'),diesel?'#777268':'#527e87');
  }
  function gear(x,y,r,color='#bfcfcf') {
    return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="url(#darkMetal)" stroke="${color}" stroke-width="6"/>${Array.from({length:16},(_,i)=>`<rect x="-4" y="${-r-5}" width="8" height="11" rx="1" fill="${color}" transform="rotate(${i*22.5})"/>`).join('')}<circle r="${r*.55}" fill="#2b4654" stroke="#86a6b2" stroke-width="3"/><circle r="${r*.19}" fill="url(#metal)"/></g>`;
  }
  function transmissionSVG(d={},stats={}) {
    const type=String(stats.type||d.type||(/cvt/.test(d.base)?'CVT':/d/.test(d.base)?'DCT':/ev|electric/.test(d.base)?'EV':/a$/.test(d.base)?'Automatic':'Manual'));
    const n=clamp(stats.gears??d.gears??String(d.base||'4m').match(/\d+/)?.[0]??4,0,10), cvt=/cvt/i.test(type), ev=/ev|reduction|electric/i.test(type), auto=/automatic/i.test(type), dual=/dct|dual/i.test(type), name=d.name||stats.name||type+' transmission';
    let parts=`<path d="M205 375Q185 300 246 271L358 238H951Q1041 238 1043 334V421Q1040 466 978 470H352L244 443Q206 430 205 375Z" fill="#8aa4ad" fill-opacity=".13" stroke="#78949e" stroke-width="3"/><path d="M236 286Q336 225 359 251V446Q330 465 241 426Z" fill="url(#darkMetal)" stroke="#a8bec2" stroke-width="3"/><ellipse cx="236" cy="354" rx="50" ry="82" fill="url(#metal)" stroke="#b9c9c9" stroke-width="4"/><ellipse cx="236" cy="354" rx="33" ry="57" fill="#263e4e" stroke="#7799a8" stroke-width="5"/><path d="M185 348H129v12h56M1020 348h80v12h-80" fill="url(#metal)"/>`;
    if(cvt) parts+=gear(458,351,76)+gear(824,351,48)+`<path d="M460 274L822 304Q883 351 825 398L460 427Q365 350 460 274Z" fill="none" stroke="#7bb7c5" stroke-width="13" stroke-dasharray="4 4"/><path d="M458 295L824 324M458 405L824 378" stroke="#bdcfd0" stroke-width="3"/>`;
    else if(ev) parts+=gear(500,354,44)+gear(648,354,88)+gear(844,354,60)+`<path d="M360 354H959" stroke="#88bdc8" stroke-width="10" opacity=".4"/>`;
    else {
      parts+=`<path d="M323 309H990M323 415H990" stroke="url(#metal)" stroke-width="14"/>`;
      for(let i=0;i<n;i++){const x=405+i*(540/Math.max(1,n-1)),r=auto?30:45-i*2.5;parts+=`<g data-gear="${i+1}">${gear(x,310,r)}${gear(x,415,49-r*.23,'#99bdc8')}${label(x,500,i+1,13,'#95b3bd','text-anchor="middle"')}</g>`;}
      if(auto)parts+=`<ellipse cx="294" cy="354" rx="26" ry="61" fill="#a5bdbb" fill-opacity=".55" stroke="#e6ede4" stroke-width="4"/>`;
      if(dual)parts+=`<ellipse cx="286" cy="326" rx="19" ry="33" fill="#39748c" stroke="#9bced2" stroke-width="3"/><ellipse cx="286" cy="398" rx="19" ry="33" fill="#987b52" stroke="#ded0aa" stroke-width="3"/>`;
    }
    parts+=`<path d="M360 245H950M360 455H950" stroke="#b0c2c1" stroke-width="5"/>${Array.from({length:10},(_,i)=>`<circle cx="${360+i*65}" cy="252" r="5" fill="#203e4a" stroke="#aec6c8"/><circle cx="${360+i*65}" cy="452" r="5" fill="#203e4a" stroke="#aec6c8"/>`).join('')}`;
    return svg(name,backdrop(name.toUpperCase(),`${type.toUpperCase()} / ${cvt?'CONTINUOUSLY VARIABLE':ev?'REDUCTION DRIVE':n+' SPEEDS'}${stats.torque?' / '+Math.round(stats.torque)+' LB-FT':''}`)+`<g data-transmission="${esc(type)}">${parts}</g>`+label(72,575,cvt?'VARIABLE PULLEYS  /  DRIVE BELT':auto?'TORQUE CONVERTER  /  PLANETARY GEARSETS':dual?'DUAL CLUTCHES  /  PARALLEL SHAFTS':ev?'INPUT PINION  /  REDUCTION GEAR  /  OUTPUT':'CLUTCH INTERFACE  /  SYNCHRONIZED GEAR TRAIN',11,'#82a8b3','letter-spacing="1.5"')+label(72,620,'MOTOR DYNASTY  /  TRANSMISSION ENGINEERING',10,'#6e8e99','letter-spacing="2"'));
  }
  const cache=new Map();
  function source(kind,d,s,i) {
    const key=kind+JSON.stringify([d,s,i]);
    if(cache.has(key))return cache.get(key);
    const raw=kind==='vehicle'?vehicleSVG(d,s,i):kind==='engine'?engineSVG(d,s):transmissionSVG(d,s), value='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(raw);
    if(cache.size>=96)cache.delete(cache.keys().next().value);
    cache.set(key,value);return value;
  }
  const vehicleSrc=(d={},s={},i={})=>source('vehicle',d,s,i),engineSrc=(d={},s={})=>source('engine',d,s),transmissionSrc=(d={},s={})=>source('transmission',d,s);
  const renderVehicle=(img,d,s,i)=>{if(img){img.src=vehicleSrc(d,s,i);img.alt=(i?.name||d?.name||'Vehicle')+' · '+bodyType(d?.body)+' design';}return img;};
  const renderEngine=(img,d,s)=>{if(img){img.src=engineSrc(d,s);img.alt=(d?.config||'Engine')+' power unit architecture';}return img;};
  const renderTransmission=(img,d,s)=>{if(img){img.src=transmissionSrc(d,s);img.alt=(s?.type||d?.type||'Transmission')+' powertrain architecture';}return img;};
  const renderVehicleEntry=(img,v)=>renderVehicle(img,{...(v?.design||v),visualRevision:v?.designEvolution?.modelYearRevision||0},v?.stats||{},{name:v?.name,generation:v?.generation||1,modelYear:v?.modelYear||v?.createdYear||1970,visualSeed:v?.visualIdentity?.seed||v?.id});
  window.MDXRenderLibrary={...(window.MDXRenderLibrary||{}),vehicleSVG,engineSVG,transmissionSVG,vehicleSrc,engineSrc,transmissionSrc,renderVehicle,renderEngine,renderTransmission,renderVehicleEntry};
})();

