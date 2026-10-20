(()=>{
"use strict";
const D=window.MD_DATA;
if(!D||!Array.isArray(D.MANUFACTURERS))return;

const ROWS=[
["auburn_auto","Auburn Automobile","United States",1903,1903,.15,"niche","premium_group",["Premium","Luxury","Sport"],"Luxury touring cars • advanced styling • performance prestige","Art-deco American luxury and engineering ambition","private","bankruptcy",1937],
["duesenberg","Duesenberg","United States",1913,1921,.12,"niche","technology_leader",["Luxury","Sport"],"Ultra-luxury cars • racing-derived engineering • high-output engines","No-expense-spared American engineering prestige","private","bankruptcy",1937],
["pierce_arrow","Pierce-Arrow","United States",1901,1901,.13,"niche","premium_group",["Luxury","Premium"],"Luxury automobiles • coachbuilt bodies • executive transport","Formal American luxury and craftsmanship","private","bankruptcy",1938],
["hupmobile","Hupmobile","United States",1909,1909,.22,"regional","conservative_family",["Mainstream","Family"],"Durable middle-market cars • broad American distribution","Dependable independent American motoring","private","bankruptcy",1940],
["graham_paige","Graham-Paige","United States",1927,1928,.20,"regional","technology_leader",["Mainstream","Premium","Sport"],"Streamlined sedans • supercharging • independent engineering","Technical experimentation for the middle market","private","restructuring",1940],
["marmon","Marmon","United States",1851,1902,.12,"niche","engineering_purist",["Premium","Luxury"],"Precision engineering • aluminum construction • luxury cars","Engineering-led American prestige","private","bankruptcy",1933],
["durant_motors","Durant Motors","United States",1921,1921,.28,"regional","aggressive_conglomerate",["Budget","Mainstream","Family"],"Multi-brand mass-market expansion • dealer growth","Fast-growing multi-marque challenger","private","bankruptcy",1931],
["stutz","Stutz Motor Car","United States",1911,1911,.10,"niche","performance_specialist",["Sport","Luxury"],"Performance luxury • sporting road cars • racing image","American sporting prestige","private","bankruptcy",1935],
["vector_aeromotive","Vector Aeromotive","United States",1978,1989,.05,"micro","technology_leader",["Sport","Luxury"],"Exotic supercars • aerospace-inspired construction • high output","Futuristic American supercar engineering","private","restructuring",1996],
["saleen","Saleen Automotive","United States",1983,1984,.08,"niche","performance_specialist",["Sport","Premium"],"High-performance road cars • tuning • limited production","Track-bred American performance","private",null,null],
["panoz","Panoz","United States",1989,1992,.06,"micro","performance_specialist",["Sport","Premium"],"Lightweight sports cars • racing programs • hand-built GTs","American boutique motorsport engineering","private",null,null],
["fisker_auto","Fisker Automotive","United States",2007,2011,.10,"niche","technology_leader",["Premium","Luxury"],"Plug-in luxury cars • design-led electrification","Design-first premium electrification","private","bankruptcy",2013],
["mclaughlin","McLaughlin Motor Car","Canada",1907,1908,.18,"regional","premium_group",["Mainstream","Premium"],"Canadian automobile production • coachbuilding • North American distribution","Canadian craftsmanship with continental scale","private","acquisition",1918],
["campagna","Campagna Motors","Canada",1988,1995,.04,"micro","engineering_purist",["Sport"],"Three-wheel performance vehicles • lightweight chassis","Extreme lightweight Canadian road machines","private",null,null],

["ac_cars","AC Cars","United Kingdom",1901,1903,.07,"niche","performance_specialist",["Sport","Premium"],"Lightweight sports cars • roadsters • Anglo-American powertrains","Traditional British sports-car performance","private",null,null],
["ginetta","Ginetta","United Kingdom",1958,1958,.05,"micro","engineering_purist",["Sport"],"Lightweight sports cars • club racing • simple chassis","Minimal-mass British driver cars","private",null,null],
["marcos","Marcos","United Kingdom",1959,1959,.045,"micro","engineering_purist",["Sport","Premium"],"Low-volume GTs • lightweight structures • unconventional engineering","Quirky British lightweight GT engineering","private","restructuring",2000],
["caterham","Caterham Cars","United Kingdom",1973,1973,.055,"micro","engineering_purist",["Sport"],"Ultra-light roadsters • modular performance • club racing","Purist lightweight performance","private",null,null],
["noble","Noble Automotive","United Kingdom",1999,1999,.045,"micro","performance_specialist",["Sport","Luxury"],"Mid-engine supercars • high power-to-weight • low-volume production","Focused analog supercar performance","private",null,null],
["ariel","Ariel Motor Company","United Kingdom",1991,2000,.04,"micro","engineering_purist",["Sport"],"Exposed-frame sports cars • extreme light weight","Engineering stripped to the essentials","private",null,null],
["radical","Radical Sportscars","United Kingdom",1997,1997,.04,"micro","performance_specialist",["Sport","Race"],"Road-legal track cars • aero • motorsport engineering","Prototype-style track performance for road use","private",null,null],

["delahaye","Delahaye","France",1894,1894,.11,"niche","premium_group",["Luxury","Sport"],"Luxury automobiles • coachbuilt bodies • competition cars","French coachbuilt elegance and competition pedigree","private","bankruptcy",1954],
["delage","Delage","France",1905,1905,.10,"niche","premium_group",["Luxury","Sport"],"Luxury cars • grand prix engineering • prestige touring","Elegant French luxury with racing roots","private","bankruptcy",1953],
["hotchkiss","Hotchkiss","France",1867,1903,.14,"regional","conservative_family",["Premium","Mainstream"],"Durable touring cars • industrial engineering • conservative luxury","Robust French upper-market engineering","private","restructuring",1955],
["salmson","Salmson","France",1890,1921,.08,"niche","engineering_purist",["Premium","Sport"],"Advanced small engines • sporting cars • precision engineering","Compact French engineering sophistication","private","bankruptcy",1957],
["ligier","Ligier Automobiles","France",1968,1969,.06,"niche","performance_specialist",["Sport","Budget"],"Sports cars • microcars • motorsport-derived engineering","French racing identity turned compact mobility","private",null,null],
["aixam","Aixam","France",1983,1983,.09,"niche","cost_leader",["Budget"],"Microcars • urban mobility • low operating cost","Practical French micro-mobility","private",null,null],
["venturi","Venturi","France",1984,1984,.055,"micro","technology_leader",["Sport","Luxury"],"Sports cars • lightweight GTs • later electric performance","French boutique performance experimentation","private","restructuring",2000],

["wartburg","Automobilwerk Eisenach / Wartburg","East Germany",1896,1956,.30,"regional","mass_market_empire",["Budget","Family","Mainstream"],"State-planned family cars • simple engineering • export markets","Durable East German mass mobility","state_owned","restructuring",1991],
["trabant","Sachsenring / Trabant","East Germany",1957,1957,.32,"regional","cost_leader",["Budget","Family"],"Low-cost compact cars • simple two-stroke engineering • high-volume state production","Minimalist mass-market East German transport","state_owned","restructuring",1991],
["melkus","Melkus","East Germany",1959,1969,.025,"micro","performance_specialist",["Sport"],"Low-volume sports cars • fiberglass bodies • racing engineering","Rare East German racing-derived sports cars","private","restructuring",1986],
["wiesmann","Wiesmann","Germany",1988,1993,.045,"micro","premium_group",["Sport","Luxury"],"Hand-built sports cars • premium interiors • powerful outsourced engines","Boutique German craftsmanship and performance","private","bankruptcy",2013],
["isdera","Isdera","Germany",1982,1984,.025,"micro","engineering_purist",["Sport","Luxury"],"Bespoke supercars • advanced aerodynamics • tiny production","Engineer-led German exotica","private",null,null],
["bitter","Bitter","Germany",1971,1973,.035,"micro","premium_group",["Premium","Luxury","Sport"],"Grand touring coupes • luxury interiors • outsourced mechanicals","German coachbuilt grand touring","private",null,null],
["gumpert","Gumpert","Germany",2004,2005,.035,"micro","performance_specialist",["Sport","Race"],"Extreme supercars • aerodynamics • track performance","Function-first German supercar engineering","private","bankruptcy",2012],
["spyker_cars","Spyker Cars","Netherlands",1999,2000,.05,"micro","premium_group",["Sport","Luxury"],"Hand-built supercars • aviation-inspired design • luxury craftsmanship","Dutch aviation-themed exotic craftsmanship","private","bankruptcy",2014],

["osca","OSCA","Italy",1947,1948,.035,"micro","performance_specialist",["Sport","Race"],"Small-displacement sports cars • racing engines • lightweight chassis","Maserati-brothers competition engineering","private","acquisition",1963],
["cisitalia","Cisitalia","Italy",1946,1946,.035,"micro","technology_leader",["Sport","Premium"],"Advanced sports cars • racing • influential design","Postwar Italian innovation and design","private","restructuring",1949],
["bizzarrini","Bizzarrini","Italy",1964,1964,.03,"micro","engineering_purist",["Sport","Luxury"],"High-performance GTs • racing-derived chassis • V8 power","Engineer-led Italian GT performance","private","bankruptcy",1969],
["ats_italy","ATS Automobili","Italy",1963,1963,.025,"micro","performance_specialist",["Sport","Luxury"],"Mid-engine GTs • racing expertise • boutique production","Rebellious Italian mid-engine engineering","private","bankruptcy",1965],
["moretti","Moretti Motor Company","Italy",1925,1946,.07,"niche","asset_light",["Budget","Sport","Premium"],"Small cars • coachbuilt variants • Fiat-based engineering","Flexible Italian specialist manufacturing","private","restructuring",1989],

["hispano_suiza","Hispano-Suiza","Spain",1904,1904,.10,"niche","premium_group",["Luxury","Sport"],"Luxury automobiles • advanced engines • coachbuilt prestige","Spanish-Swiss engineering prestige","private","restructuring",1946],
["pegaso","Pegaso","Spain",1946,1951,.13,"niche","technology_leader",["Sport","Luxury","Utility"],"Advanced sports cars • heavy vehicles • state industrial engineering","Spanish state engineering ambition","state_owned","restructuring",1958],

["luaz","LuAZ","Ukraine",1955,1966,.18,"regional","cost_leader",["Utility","Off-Road","Budget"],"Compact off-road vehicles • simple drivetrains • military roots","Rugged Soviet utility simplicity","state_owned","restructuring",2002],
["zil","ZiL","Soviet Union",1916,1936,.28,"regional","vertically_integrated",["Luxury","Utility"],"State limousines • trucks • heavy industrial manufacturing","Prestige state vehicles backed by heavy industry","state_owned","restructuring",2012],
["praga","Praga","Czechoslovakia",1907,1907,.15,"regional","engineering_purist",["Mainstream","Utility","Sport"],"Cars • trucks • engineering diversity • later racing specials","Czech industrial engineering versatility","private","restructuring",1947],
["aero_cz","Aero","Czechoslovakia",1919,1929,.08,"niche","engineering_purist",["Budget","Sport"],"Lightweight small cars • aircraft engineering influence","Aviation-influenced Czech light cars","private","restructuring",1947],
["oltcit","Oltcit","Romania",1976,1981,.20,"regional","mass_market_empire",["Budget","Family"],"Compact licensed cars • state-industry production","Romanian-French compact-car industrial project","state_owned","restructuring",1991],

["ssangyong","SsangYong Motor","South Korea",1954,1954,.35,"regional","utility_specialist",["Utility","Off-Road","Family"],"SUVs • 4x4 vehicles • utility engineering","Korean utility and off-road specialist","public","restructuring",2020],
["renault_samsung","Renault Samsung Motors","South Korea",1994,1998,.32,"regional","premium_group",["Family","Mainstream","Premium"],"Modern sedans • licensed platforms • Korean manufacturing","Korean quality focus with global-platform engineering","corporate_owned","acquisition",2000],

["faw","FAW Group","China",1953,1958,.90,"mass","vertically_integrated",["Mainstream","Luxury","Utility"],"State automotive group • passenger cars • trucks • large-scale manufacturing","Foundational Chinese state automotive scale","state_owned",null,null],
["saic","SAIC Motor","China",1955,1958,1.00,"mass","aggressive_conglomerate",["Mainstream","Family","Premium"],"Large-scale passenger cars • joint ventures • global manufacturing","Mass-scale Chinese automotive conglomerate","state_owned",null,null],
["dongfeng","Dongfeng Motor","China",1969,1969,.92,"mass","vertically_integrated",["Mainstream","Utility","Family"],"State automotive group • commercial vehicles • passenger cars • joint ventures","Broad Chinese state automotive manufacturing","state_owned",null,null],
["baic","BAIC Group","China",1958,1958,.78,"mass","aggressive_conglomerate",["Mainstream","Utility","Budget"],"Passenger cars • off-road vehicles • joint ventures • state manufacturing","Beijing-centered multi-brand automotive group","state_owned",null,null],
["changan","Changan Automobile","China",1959,1959,.82,"mass","technology_leader",["Mainstream","Family","Budget"],"High-volume passenger cars • powertrain development • electrification","Scale manufacturing with growing in-house technology","public",null,null],
["jac","JAC Motors","China",1964,1968,.52,"regional","mass_market_empire",["Budget","Family","Utility"],"Commercial vehicles • affordable passenger cars • EV development","Value-focused Chinese manufacturing","public",null,null],
["brilliance","Brilliance Auto","China",1992,1992,.42,"regional","aggressive_conglomerate",["Mainstream","Premium","Family"],"Passenger cars • joint ventures • regional manufacturing","Joint-venture-led Chinese expansion","public","restructuring",2020],
["zotye","Zotye Auto","China",2005,2005,.30,"regional","cost_leader",["Budget","Mainstream"],"Low-cost vehicles • rapid model expansion • domestic market focus","Aggressive low-cost Chinese challenger","public","bankruptcy",2020],
["xpeng","XPeng","China",2014,2018,.32,"regional","technology_leader",["Premium","Mainstream"],"Battery EVs • driver assistance • software-defined vehicles","Technology-forward smart EV challenger","public",null,null],
["li_auto","Li Auto","China",2015,2019,.38,"regional","technology_leader",["Premium","Utility","Family"],"Range-extended EVs • family SUVs • software integration","Family-focused premium electrified mobility","public",null,null],
["leapmotor","Leapmotor","China",2015,2019,.28,"regional","technology_leader",["Budget","Mainstream","Family"],"Battery EVs • in-house electronics • value-focused technology","Integrated value EV engineering","public",null,null],
["gac","GAC Motor","China",2008,2010,.58,"regional","mass_market_empire",["Mainstream","Family","Premium"],"Passenger cars • modern factories • global partnerships","Modern Chinese mass-market manufacturing","state_owned",null,null],

["premier_india","Premier Automobiles","India",1944,1947,.30,"regional","conservative_family",["Budget","Family","Mainstream"],"Licensed passenger cars • local production • durable sedans","Indian licensed-production mass mobility","private","restructuring",2001],
["standard_india","Standard Motor Products India","India",1948,1948,.18,"regional","conservative_family",["Budget","Family"],"Licensed British designs • local assembly • compact family cars","Conservative Indian family-car manufacturing","private","restructuring",1988],
["sipani","Sipani Automobiles","India",1973,1975,.12,"niche","cost_leader",["Budget","Family"],"Compact fiberglass cars • licensed designs • low-cost production","Resourceful Indian low-volume economy cars","private","restructuring",1997],
["reva","Reva Electric Car Company","India",1994,2001,.08,"niche","technology_leader",["Budget","Mainstream"],"Small battery EVs • urban mobility • lightweight efficiency","Early Indian urban electric mobility","private","acquisition",2010],

["sanyang","Sanyang Motor","Taiwan",1954,1962,.28,"regional","conservative_family",["Budget","Family","Mainstream"],"Licensed automobile assembly • motorcycles • local manufacturing","Taiwanese manufacturing discipline and licensed production","public",null,null],
["bufori","Bufori","Malaysia",1986,1986,.025,"micro","premium_group",["Luxury","Sport"],"Hand-built luxury sports cars • retro styling • bespoke interiors","Bespoke Malaysian luxury craftsmanship","private",null,null],
["thai_rung","Thai Rung Union Car","Thailand",1967,1967,.18,"regional","asset_light",["Utility","Off-Road","Family"],"Utility vehicles • contract assembly • locally adapted bodies","Thai utility and contract-manufacturing specialist","public",null,null],

["otokar","Otokar","Turkey",1963,1963,.28,"regional","vertically_integrated",["Utility","Off-Road"],"Utility vehicles • buses • armored vehicles • industrial engineering","Turkish heavy-duty mobility engineering","public",null,null],
["karsan","Karsan","Turkey",1966,1966,.25,"regional","asset_light",["Utility","Budget","Mainstream"],"Contract vehicle production • commercial vehicles • flexible factories","Flexible Turkish contract manufacturing","public",null,null],
["pars_khodro","Pars Khodro","Iran",1967,1968,.32,"regional","conservative_family",["Mainstream","Utility","Family"],"Licensed passenger vehicles • SUVs • local assembly","Iranian licensed-production and utility manufacturing","corporate_owned",null,null],
["bahman","Bahman Group","Iran",1952,1959,.30,"regional","aggressive_conglomerate",["Utility","Mainstream","Family"],"Licensed vehicles • pickups • multi-brand assembly","Diversified Iranian vehicle manufacturing group","private",null,null],
["gsm_sa","Glass Sport Motors","South Africa",1958,1958,.035,"micro","performance_specialist",["Sport"],"Fiberglass sports cars • lightweight chassis • club racing","South African lightweight sports-car ingenuity","private","restructuring",1964],
["perana","Perana Cars","South Africa",1967,1967,.045,"micro","performance_specialist",["Sport","Premium"],"High-performance conversions • V8 road cars • motorsport influence","South African muscle and performance engineering","private",null,null],

["fnm","Fábrica Nacional de Motores","Brazil",1942,1960,.35,"regional","vertically_integrated",["Mainstream","Premium","Utility"],"State industrial manufacturing • licensed passenger cars • heavy vehicles","Brazilian state-backed industrial automotive production","state_owned","acquisition",1977],
["agrale","Agrale","Brazil",1962,1982,.24,"regional","utility_specialist",["Utility","Off-Road"],"Utility vehicles • trucks • agricultural engineering","Compact Brazilian utility engineering","private",null,null],
["troller","Troller","Brazil",1995,1997,.10,"niche","utility_specialist",["Off-Road","Utility"],"Rugged off-road vehicles • fiberglass bodies • regional manufacturing","Brazilian purpose-built off-road identity","private","acquisition",2007],
["siam_di_tella","Siam Di Tella Automotores","Argentina",1958,1960,.22,"regional","mass_market_empire",["Family","Mainstream","Budget"],"Licensed family cars • domestic assembly • broad middle-market appeal","Argentine industrial family-car production","private","restructuring",1966],
["dina_mexico","DINA","Mexico",1951,1951,.34,"regional","vertically_integrated",["Utility","Mainstream"],"Heavy vehicles • licensed automotive production • state industrial capacity","Mexican state-backed vehicle manufacturing","state_owned","restructuring",1989],
["mastretta","Mastretta","Mexico",1987,2008,.035,"micro","performance_specialist",["Sport"],"Lightweight sports cars • local engineering • boutique manufacturing","Mexican independent sports-car engineering","private",null,null],

["bolwell","Bolwell","Australia",1962,1962,.045,"micro","engineering_purist",["Sport"],"Fiberglass sports cars • lightweight chassis • local components","Australian lightweight sports-car ingenuity","private","restructuring",1979],
["elfin","Elfin Sports Cars","Australia",1959,1959,.04,"micro","performance_specialist",["Sport","Race"],"Race cars • lightweight road cars • motorsport engineering","Australian competition-first engineering","private",null,null],
["giocattolo","Giocattolo","Australia",1986,1988,.025,"micro","performance_specialist",["Sport","Luxury"],"Mid-engine supercar • composite body • V8 performance","Australian boutique supercar ambition","private","bankruptcy",1989],
["hartnett","Hartnett Motor Company","Australia",1949,1951,.07,"niche","cost_leader",["Budget","Family"],"Compact locally assembled cars • domestic manufacturing","Early Australian independent mass-mobility attempt","private","bankruptcy",1955],
["heron_nz","Heron Cars","New Zealand",1960,1962,.025,"micro","engineering_purist",["Sport"],"Fiberglass sports cars • local design • low-volume production","New Zealand home-grown sports-car engineering","private",null,null]
];

const VOLUME={micro:{valuation:55,cash:7,share:.008,manufacturing:34},niche:{valuation:150,cash:20,share:.04,manufacturing:48},regional:{valuation:650,cash:85,share:.35,manufacturing:68},mass:{valuation:4200,cash:560,share:2.4,manufacturing:88}};
const PERSONALITY_ARCHETYPE={
 conservative_family:"Conservative Family Company",aggressive_conglomerate:"Aggressive Conglomerate",technology_leader:"Technology Leader",
 engineering_purist:"Engineering Purist",cost_leader:"Cost Leader",premium_group:"Luxury Specialist",mass_market_empire:"Mass-Market Giant",
 asset_light:"Asset-Light Manufacturer",vertically_integrated:"Vertically Integrated Manufacturer",performance_specialist:"Performance Specialist",
 utility_specialist:"Utility Specialist"
};
function capabilities(row){
 const v=VOLUME[row.volumeClass]||VOLUME.regional,p=String(row.corporatePersonality||"balanced"),f=String(row.focus||"").toLowerCase();
 const engineering=Math.max(35,Math.min(96,58+(p==="technology_leader"?22:p==="engineering_purist"?20:p==="performance_specialist"?16:p==="vertically_integrated"?8:0)+(f.includes("racing")||f.includes("advanced")?5:0)));
 const quality=Math.max(35,Math.min(96,58+(p==="premium_group"?18:p==="engineering_purist"?12:p==="conservative_family"?8:p==="cost_leader"?-8:0)));
 const reliability=Math.max(35,Math.min(97,61+(p==="conservative_family"?14:p==="vertically_integrated"?8:p==="cost_leader"?-5:0)));
 const tech=Math.max(20,Math.min(100,50+(p==="technology_leader"?30:p==="engineering_purist"?20:p==="performance_specialist"?15:p==="conservative_family"?-8:0)));
 return{manufacturingCapability:v.manufacturing,engineeringCapability:engineering,qualityTendency:quality,reliabilityTendency:reliability,technologyAppetite:tech};
}
function inferStrengths(row){
 const f=String(row.focus||"").toLowerCase(),out=[];
 if(f.includes("racing")||f.includes("performance")||f.includes("sport"))out.push("performance engineering");
 if(f.includes("luxury")||f.includes("premium"))out.push("premium product development");
 if(f.includes("utility")||f.includes("off-road")||f.includes("truck"))out.push("utility durability");
 if(f.includes("electric")||f.includes("ev")||f.includes("software"))out.push("electrification and electronics");
 if(f.includes("lightweight")||f.includes("fiberglass")||f.includes("composite"))out.push("lightweight structures");
 if(f.includes("mass")||f.includes("high-volume")||f.includes("large-scale"))out.push("high-volume manufacturing");
 if(f.includes("licensed")||f.includes("assembly"))out.push("licensed production and localization");
 if(f.includes("engine"))out.push("powertrain engineering");
 if(!out.length)out.push("vehicle engineering","manufacturing integration");
 return [...new Set(out)].slice(0,4);
}
function inferredLegacyVolumeClass(m){
 const explicit=String(m?.volumeClass||"").toLowerCase();if(VOLUME[explicit])return explicit;
 const scale=Number(m?.seedScale);if(Number.isFinite(scale))return scale<=.08?"micro":scale<=.24?"niche":scale<=.55?"regional":"mass";
 const share=Math.max(0,Number(m?.share||0));return share<=.10?"micro":share<=.90?"niche":share<=4?"regional":"mass";
}
function inferredLegacySeedScale(m,volumeClass=inferredLegacyVolumeClass(m)){
 const existing=Number(m?.seedScale);if(Number.isFinite(existing))return Math.max(.02,existing);
 const share=Math.max(0,Number(m?.share||0));
 if(volumeClass==="mass")return Math.min(1.18,Math.max(.75,.72+share/40));
 if(volumeClass==="regional")return Math.min(.70,Math.max(.35,.30+share/10));
 if(volumeClass==="niche")return Math.min(.24,Math.max(.12,.11+share/7));
 return Math.min(.10,Math.max(.04,.045+share*.35));
}
function enrich(m){
 const hadExplicitClass=!!VOLUME[String(m.volumeClass||"").toLowerCase()],hadExplicitScale=Number.isFinite(Number(m.seedScale)),volumeClass=inferredLegacyVolumeClass(m);
 m.volumeClass=volumeClass;m.seedScale=inferredLegacySeedScale(m,volumeClass);
 m.volumeProfileSource=m.volumeProfileSource||(hadExplicitClass||hadExplicitScale?"explicit":"share_inferred_v3");
 const v=VOLUME[m.volumeClass]||VOLUME.regional;
 m.historicalScale=m.historicalScale||m.volumeClass;
 m.initialMarketPosition=m.initialMarketPosition||String(m.focus||"Independent automotive manufacturer");
 m.corporatePersonality=m.corporatePersonality||"conservative_family";
 m.managementArchetype=m.managementArchetype||PERSONALITY_ARCHETYPE[m.corporatePersonality]||"Balanced Manufacturer";
 m.preferredSegments=Array.isArray(m.preferredSegments)&&m.preferredSegments.length?m.preferredSegments:["Mainstream","Family"];
 m.productPreferences=Array.isArray(m.productPreferences)&&m.productPreferences.length?m.productPreferences:[...m.preferredSegments];
 m.marketPreferences=Array.isArray(m.marketPreferences)&&m.marketPreferences.length?m.marketPreferences:[...m.preferredSegments];
 m.brandIdentity=m.brandIdentity||String(m.focus||"Independent automotive engineering");
 m.engineeringStrengths=Array.isArray(m.engineeringStrengths)&&m.engineeringStrengths.length?m.engineeringStrengths:inferStrengths(m);
 const cap=capabilities(m);
 for(const [k,val] of Object.entries(cap))if(!Number.isFinite(Number(m[k])))m[k]=val;
 m.ownershipType=m.ownershipType||"independent";
 m.technologyAppetite=Math.max(0,Math.min(100,Number(m.technologyAppetite||cap.technologyAppetite)));
 m.reliabilityTendency=Math.max(0,Math.min(100,Number(m.reliabilityTendency||cap.reliabilityTendency)));
 m.qualityTendency=Math.max(0,Math.min(100,Number(m.qualityTendency||cap.qualityTendency)));
 return m;
}

const additions=ROWS.map(r=>{
 const [id,name,country,founded,vehicleStart,seedScale,volumeClass,personality,segments,focus,brandIdentity,ownershipType,eventType,eventYear]=r,v=VOLUME[volumeClass]||VOLUME.regional,scale=Math.max(.02,Number(seedScale||.2));
 const m={id,name,country,founded,vehicleStart,public:ownershipType==="public",valuation:Math.max(35,Math.round(v.valuation*(.55+scale))),cash:Math.max(4,Math.round(v.cash*(.55+scale))),share:Number((v.share*(.55+scale)).toFixed(3)),seedScale:scale,volumeClass,corporatePersonality:personality,preferredSegments:segments,focus,brandIdentity,ownershipType,historyNote:"Founded "+founded+"; automotive activity in the simulation begins in "+vehicleStart+". "+focus+"."};
 if(eventType&&eventYear)m.historical={type:eventType,year:eventYear,month:6,label:name+" historical "+eventType+" pressure"};
 return enrich(m);
});
const existing=new Set(D.MANUFACTURERS.map(m=>String(m.id)));let worldAdded=0;
for(const m of additions)if(!existing.has(String(m.id))&&D.MANUFACTURERS.length<200){D.MANUFACTURERS.push(m);existing.add(String(m.id));worldAdded++;}
D.MANUFACTURERS.forEach(enrich);
D.MANUFACTURER_WORLD_VERSION=4;
D.MANUFACTURER_WORLD_TARGET=200;
D.MANUFACTURER_WORLD_ADDITIONS=worldAdded;
if(D.MANUFACTURERS.length!==200)console.warn("[Motor Dynasty] manufacturer world expected 200 records, found",D.MANUFACTURERS.length);
window.MDXManufacturerWorld={version:4,target:200,additions: additions.slice(0,worldAdded).map(x=>x.id),enrich,inferredLegacyVolumeClass,inferredLegacySeedScale};
})();