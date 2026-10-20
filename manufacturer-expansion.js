(()=>{
"use strict";
const D=window.MD_DATA;
if(!D||!Array.isArray(D.MANUFACTURERS))return;

const ROWS=[
["vector","Vector Aeromotive","United States",1978,1989,"micro","technology_leader",["Sport","Luxury"],"Exotic supercars • aerospace-inspired engineering • low-volume performance"],
["panoz","Panoz","United States",1989,1992,"micro","technology_leader",["Sport","Premium"],"Lightweight sports cars • aluminum structures • motorsport"],
["saleen","Saleen Automotive","United States",1983,1984,"niche","technology_leader",["Sport","Premium"],"Performance cars • tuning-to-manufacturer growth • motorsport"],
["ssc","SSC North America","United States",1998,2004,"micro","technology_leader",["Sport","Luxury"],"Ultra-high-performance supercars • low-volume engineering"],
["mosler","Mosler Automotive","United States",1985,1985,"micro","technology_leader",["Sport"],"Lightweight supercars • composite structures • track performance"],
["fisker_auto","Fisker Automotive","United States",2007,2011,"niche","technology_leader",["Premium","Luxury"],"Plug-in luxury cars • design-led electrification"],
["karma_auto","Karma Automotive","United States",2014,2016,"niche","premium_group",["Premium","Luxury"],"Electrified luxury GTs • low-volume premium manufacturing"],
["am_general","AM General","United States",1971,1984,"niche","vertically_integrated",["Utility","Off-Road"],"Military utility vehicles • heavy-duty engineering • contract manufacturing"],
["czinger","Czinger Vehicles","United States",2019,2021,"micro","technology_leader",["Sport","Luxury"],"Additive manufacturing • hybrid hypercars • advanced production"],
["mastretta","Mastretta","Mexico",1987,2008,"micro","technology_leader",["Sport","Premium"],"Lightweight sports cars • Mexican independent engineering"],
["agrale","Agrale","Brazil",1962,1962,"regional","vertically_integrated",["Utility","Off-Road"],"Utility vehicles • commercial platforms • rugged regional manufacturing"],
["miura_brazil","Miura","Brazil",1977,1977,"micro","premium_group",["Sport","Premium"],"Fiberglass sports coupes • Brazilian niche luxury"],
["santa_matilde","Santa Matilde","Brazil",1977,1978,"micro","premium_group",["Sport","Luxury"],"Luxury sports coupes • coachbuilt fiberglass construction"],
["troller","Troller","Brazil",1995,1997,"niche","technology_leader",["Off-Road","Utility"],"Rugged off-road vehicles • fiberglass bodies • regional utility"],
["lobini","Lobini","Brazil",1999,2005,"micro","technology_leader",["Sport"],"Lightweight mid-engine sports cars • low-volume production"],
["iame","IAME","Argentina",1951,1952,"regional","vertically_integrated",["Budget","Utility","Family"],"State industrial group • utility vehicles • domestic manufacturing"],
["siam_di_tella","SIAM Di Tella Automotores","Argentina",1911,1960,"regional","conservative_family",["Family","Mainstream"],"Licensed family cars • domestic assembly • diversified industrial base"],
["ac_cars","AC Cars","United Kingdom",1901,1903,"niche","technology_leader",["Sport","Premium"],"Lightweight sports cars • hand-built performance • Anglo-American powertrains"],
["ginetta","Ginetta","United Kingdom",1958,1958,"micro","technology_leader",["Sport"],"Lightweight sports cars • racing-led engineering"],
["marcos","Marcos","United Kingdom",1959,1959,"micro","technology_leader",["Sport"],"Lightweight GTs • unconventional structures • low-volume performance"],
["caterham","Caterham Cars","United Kingdom",1973,1973,"micro","technology_leader",["Sport"],"Ultra-light sports cars • minimalist engineering"],
["westfield","Westfield Sportscars","United Kingdom",1982,1982,"micro","technology_leader",["Sport"],"Lightweight kit and sports cars • small-series manufacturing"],
["noble","Noble Automotive","United Kingdom",1999,1999,"micro","technology_leader",["Sport","Luxury"],"Mid-engine supercars • driver-focused performance"],
["ariel","Ariel Motor Company","United Kingdom",1991,2000,"micro","technology_leader",["Sport"],"Ultra-light exposed-chassis performance cars"],
["radical","Radical Motorsport","United Kingdom",1997,1997,"micro","technology_leader",["Sport"],"Road-legal track cars • racing technology"],
["gordon_murray","Gordon Murray Automotive","United Kingdom",2017,2022,"micro","technology_leader",["Sport","Luxury"],"Lightweight supercars • fan aerodynamics • advanced engineering"],
["ineos_auto","INEOS Automotive","United Kingdom",2017,2022,"niche","vertically_integrated",["Utility","Off-Road"],"Rugged utility vehicles • global contract manufacturing"],
["ruf","RUF Automobile","West Germany",1939,1975,"micro","technology_leader",["Sport","Premium"],"Independent high-performance sports cars • powertrain engineering"],
["wiesmann","Wiesmann","West Germany",1988,1993,"micro","premium_group",["Sport","Luxury"],"Hand-built roadsters and GTs • boutique luxury performance"],
["isdera","Isdera","West Germany",1982,1984,"micro","technology_leader",["Sport","Luxury"],"Bespoke supercars • prototype-derived engineering"],
["bitter","Bitter","West Germany",1971,1973,"micro","premium_group",["Premium","Luxury"],"Coachbuilt grand tourers • European-American mechanical blends"],
["artega","Artega","Germany",2006,2009,"micro","technology_leader",["Sport","Premium"],"Compact sports cars • lightweight engineering • electrification"],
["apollo_auto","Apollo Automobil","Germany",2004,2005,"micro","technology_leader",["Sport","Luxury"],"Extreme supercars • track-focused aerodynamics"],
["ktm_sportcar","KTM Sportcar","Austria",2005,2008,"micro","technology_leader",["Sport"],"Ultra-light sports cars • motorcycle-derived performance culture"],
["ligier","Ligier","France",1968,1971,"niche","technology_leader",["Sport","Budget"],"Sports cars • microcars • motorsport engineering"],
["venturi","Venturi Automobiles","France",1984,1986,"micro","technology_leader",["Sport","Premium"],"French sports cars • GT engineering • later electrification"],
["aixam","Aixam","France",1983,1983,"niche","mass_market_empire",["Budget"],"Microcars • urban mobility • low-power efficient vehicles"],
["hommell","Hommell","France",1990,1994,"micro","technology_leader",["Sport"],"Lightweight sports coupes • enthusiast-led engineering"],
["gillet","Gillet","Belgium",1992,1994,"micro","technology_leader",["Sport"],"Ultra-light sports cars • hand-built performance"],
["maserati","Maserati","Italy",1914,1926,"niche","premium_group",["Sport","Luxury","Premium"],"Luxury GTs • racing heritage • high-performance engines"],
["bizzarrini","Bizzarrini","Italy",1964,1965,"micro","technology_leader",["Sport","Luxury"],"GT and racing engineering • low-volume V8 performance"],
["ats_italy","ATS","Italy",1963,1963,"micro","technology_leader",["Sport","Luxury"],"Mid-engine GTs • ex-racing-engineer startup"],
["cizeta","Cizeta Automobili","Italy",1988,1991,"micro","technology_leader",["Sport","Luxury"],"V16 exotic supercars • ultra-low-volume manufacturing"],
["mazzanti","Mazzanti Automobili","Italy",2002,2006,"micro","premium_group",["Sport","Luxury"],"Hand-built supercars • bespoke Italian performance"],
["dr_motor","DR Automobiles","Italy",2006,2006,"regional","asset_light",["Budget","Family","Utility"],"Imported-platform assembly • value vehicles • regional distribution"],
["pegaso","Pegaso","Spain",1946,1951,"niche","technology_leader",["Sport","Luxury","Utility"],"Advanced sports cars • heavy vehicles • state industrial engineering"],
["hurtan","Hurtan Automóviles","Spain",1991,1992,"micro","premium_group",["Premium","Sport"],"Retro coachbuilt roadsters • boutique production"],
["spania_gta","Spania GTA","Spain",1994,2009,"micro","technology_leader",["Sport","Luxury"],"Carbon-composite supercars • Spanish high-performance engineering"],
["tramontana","Tramontana","Spain",2005,2007,"micro","technology_leader",["Sport","Luxury"],"Open-cockpit supercars • aerospace-inspired design"],
["praga","Praga","Czechoslovakia",1907,1907,"niche","technology_leader",["Utility","Sport"],"Historic cars and trucks • competition engineering • specialist revival"],
["fsm","FSM","Poland",1971,1973,"regional","mass_market_empire",["Budget","Family"],"Small cars • licensed mass production • state manufacturing"],
["oltcit","Oltcit","Romania",1976,1981,"regional","vertically_integrated",["Budget","Family"],"Compact cars • Franco-Romanian industrial partnership"],
["izhavto","IzhAvto","Soviet Union",1965,1966,"regional","vertically_integrated",["Budget","Family","Utility"],"Mass-market cars • state industrial production • durable platforms"],
["luaz","LuAZ","Soviet Union",1955,1966,"niche","technology_leader",["Utility","Off-Road"],"Compact off-road vehicles • military-derived engineering"],
["marussia","Marussia Motors","Russia",2007,2010,"micro","technology_leader",["Sport","Luxury"],"Russian supercars • startup engineering • motorsport ambition"],
["aurus","Aurus Motors","Russia",2018,2018,"micro","premium_group",["Luxury","Premium"],"State-backed luxury vehicles • domestic high-end engineering"],
["faw","FAW","China",1953,1956,"mass","vertically_integrated",["Mainstream","Family","Luxury","Utility"],"State automotive group • mass production • full-line manufacturing"],
["saic","SAIC Motor","China",1955,1958,"mass","aggressive_conglomerate",["Mainstream","Family","Premium","Utility"],"Large-scale manufacturing • joint ventures • broad product portfolio"],
["dongfeng","Dongfeng Motor","China",1969,1969,"mass","vertically_integrated",["Mainstream","Utility","Family"],"State industrial group • commercial and passenger vehicles"],
["baic","BAIC","China",1958,1958,"mass","aggressive_conglomerate",["Mainstream","Utility","Budget"],"State automotive group • licensed production • broad manufacturing"],
["changan","Changan Automobile","China",1862,1959,"mass","technology_leader",["Mainstream","Family","Utility"],"Large-scale domestic cars • engineering growth • broad portfolio"],
["jac","JAC Motors","China",1964,1968,"regional","mass_market_empire",["Utility","Budget","Family"],"Commercial vehicles • affordable passenger cars • export growth"],
["nanjing_auto","Nanjing Automobile","China",1947,1958,"regional","vertically_integrated",["Budget","Family","Mainstream"],"Early Chinese vehicle production • licensed and domestic manufacturing"],
["brilliance","Brilliance Auto","China",1992,1996,"regional","aggressive_conglomerate",["Mainstream","Family","Premium"],"Passenger cars • joint ventures • regional manufacturing"],
["lifan","Lifan Motors","China",1992,2005,"regional","mass_market_empire",["Budget","Family"],"Low-cost cars • motorcycle-to-auto expansion • export markets"],
["zotye","Zotye Auto","China",2005,2005,"regional","mass_market_empire",["Budget","Utility"],"Affordable cars and crossovers • rapid model expansion"],
["xpeng","XPeng","China",2014,2018,"regional","technology_leader",["Premium","Mainstream"],"Smart EVs • software-led vehicles • advanced driver technology"],
["li_auto","Li Auto","China",2015,2019,"regional","technology_leader",["Premium","Utility","Family"],"Extended-range EVs • family utility vehicles • software integration"],
["leapmotor","Leapmotor","China",2015,2019,"regional","technology_leader",["Budget","Mainstream","Utility"],"Vertically integrated EVs • electronics and software"],
["seres","Seres","China",1986,2003,"regional","technology_leader",["Utility","Mainstream"],"Utility vehicles • electrified crossovers • powertrain integration"],
["premier_india","Premier Automobiles","India",1944,1947,"regional","conservative_family",["Budget","Family","Mainstream"],"Licensed passenger cars • domestic assembly • long-running family transport"],
["standard_india","Standard Motor Products of India","India",1948,1949,"regional","conservative_family",["Family","Mainstream"],"Licensed British cars • domestic production • regional market"],
["sipani","Sipani Automobiles","India",1973,1975,"niche","mass_market_empire",["Budget","Family"],"Small fiberglass cars • licensed compact vehicles"],
["reva","Reva Electric Car Company","India",1994,2001,"micro","technology_leader",["Budget","Mainstream"],"Early battery-electric city cars • lightweight urban engineering"],
["ssangyong","SsangYong Motor","South Korea",1954,1954,"regional","technology_leader",["Utility","Off-Road","Premium"],"SUVs • 4x4 engineering • licensed powertrains"],
["sanyang","Sanyang Motor","Taiwan",1954,1962,"regional","conservative_family",["Budget","Family","Mainstream"],"Licensed vehicle production • scooters and automobiles • regional manufacturing"],
["bufori","Bufori","Malaysia",1986,1986,"micro","premium_group",["Luxury","Premium"],"Hand-built retro luxury cars • bespoke craftsmanship"],
["bolwell","Bolwell","Australia",1962,1962,"micro","technology_leader",["Sport"],"Fiberglass sports cars • Australian low-volume engineering"],
["elfin","Elfin Sports Cars","Australia",1959,1959,"micro","technology_leader",["Sport"],"Racing and road sports cars • lightweight performance"],
["giocattolo","Giocattolo Motori","Australia",1986,1986,"micro","technology_leader",["Sport","Premium"],"Mid-engine performance coupes • Australian boutique manufacturing"],
["saker","Saker Cars","New Zealand",1989,1992,"micro","technology_leader",["Sport"],"Track-focused sports cars • lightweight composite construction"],
["pars_khodro","Pars Khodro","Iran",1967,1967,"regional","conservative_family",["Family","Mainstream","Utility"],"Licensed passenger cars • regional assembly • utility vehicles"],
["bahman","Bahman Group","Iran",1952,1959,"regional","aggressive_conglomerate",["Utility","Family","Mainstream"],"Licensed assembly • commercial vehicles • diversified automotive group"],
["w_motors","W Motors","United Arab Emirates",2012,2013,"micro","premium_group",["Sport","Luxury"],"Ultra-luxury hypercars • Middle Eastern boutique manufacturing"],
["laraki","Laraki","Morocco",1999,2003,"micro","premium_group",["Sport","Luxury"],"Coachbuilt grand tourers • Moroccan exotic-car engineering"],
["birkin","Birkin Cars","South Africa",1982,1982,"micro","technology_leader",["Sport"],"Lightweight roadsters • hand-built sports cars"]
];

const PUBLIC=new Set(["saleen","saic","changan","jac","brilliance","lifan","xpeng","li_auto","leapmotor","ssangyong","sanyang","bahman"]);
const SCALE={
 micro:{valuation:70,cash:10,share:.008,seed:.06,manufacturing:42,engineering:72,quality:4,reliability:0},
 niche:{valuation:420,cash:60,share:.12,seed:.18,manufacturing:55,engineering:76,quality:5,reliability:2},
 regional:{valuation:1450,cash:210,share:.65,seed:.48,manufacturing:72,engineering:70,quality:1,reliability:3},
 mass:{valuation:8200,cash:1250,share:5.5,seed:1,manufacturing:90,engineering:78,quality:2,reliability:4}
};
const TECH={technology_leader:.90,vertically_integrated:.76,asset_light:.72,mass_market_empire:.65,premium_group:.82,turnaround_specialist:.60,conservative_family:.55,aggressive_conglomerate:.74};
const HISTORY={
 vector:{type:"bankruptcy",year:1993,month:8,label:"Financial collapse / production shutdown pressure"},
 mosler:{type:"discontinue",year:2013,month:5,label:"Low-volume production exit pressure"},
 fisker_auto:{type:"bankruptcy",year:2013,month:10,label:"Bankruptcy / production halt pressure"},
 iame:{type:"discontinue",year:1955,month:8,label:"State reorganization / passenger-car program closure pressure"},
 siam_di_tella:{type:"restructuring",year:1966,month:6,label:"Automotive operations restructuring pressure"},
 marcos:{type:"bankruptcy",year:1971,month:0,label:"Receivership pressure"},
 artega:{type:"bankruptcy",year:2012,month:6,label:"Insolvency pressure"},
 apollo_auto:{type:"bankruptcy",year:2012,month:7,label:"Gumpert insolvency / restructuring pressure"},
 hommell:{type:"discontinue",year:2003,month:8,label:"Low-volume production exit pressure"},
 maserati:{type:"acquisition",year:1968,month:0,buyerId:"citroen",label:"Citroën control / ownership transition pressure"},
 bizzarrini:{type:"bankruptcy",year:1969,month:0,label:"Production collapse / bankruptcy pressure"},
 ats_italy:{type:"discontinue",year:1965,month:0,label:"Original ATS road-car program shutdown pressure"},
 cizeta:{type:"restructuring",year:1994,month:0,label:"Production and financing crisis pressure"},
 fsm:{type:"acquisition",year:1992,month:0,buyerId:"fiat",label:"Fiat control / privatization pressure"},
 oltcit:{type:"sale",year:1991,month:0,buyerId:"daewoo",label:"Daewoo acquisition / ownership transition pressure"},
 izhavto:{type:"bankruptcy",year:2009,month:0,label:"Bankruptcy and production disruption pressure"},
 marussia:{type:"bankruptcy",year:2014,month:3,label:"Insolvency / operations shutdown pressure"},
 brilliance:{type:"restructuring",year:2020,month:10,label:"Debt crisis / restructuring pressure"},
 lifan:{type:"bankruptcy",year:2020,month:0,label:"Debt crisis / bankruptcy reorganization pressure"},
 zotye:{type:"bankruptcy",year:2021,month:0,label:"Insolvency / restructuring pressure"},
 premier_india:{type:"discontinue",year:2000,month:0,label:"Passenger-car production exit pressure"},
 standard_india:{type:"discontinue",year:1988,month:0,label:"Production closure pressure"},
 sipani:{type:"discontinue",year:2000,month:0,label:"Automotive production exit pressure"},
 reva:{type:"acquisition",year:2010,month:4,buyerId:"mahindra",label:"Mahindra acquisition / EV integration pressure"},
 ssangyong:{type:"restructuring",year:2020,month:11,label:"Court restructuring / ownership crisis pressure"},
 giocattolo:{type:"discontinue",year:1989,month:0,label:"Low-volume production shutdown pressure"}
};

const existing=new Set(D.MANUFACTURERS.map(x=>String(x.id)));
ROWS.forEach((row,index)=>{
 const [id,name,country,founded,vehicleStart,volumeClass,corporatePersonality,preferredSegments,focus]=row;
 if(existing.has(id))return;
 const b=SCALE[volumeClass]||SCALE.niche,valuation=Math.round(b.valuation*(.72+((index*37)%57)/100)),cash=Math.round(b.cash*(.75+((index*19)%41)/100)),share=Number((b.share*(.70+((index*13)%51)/100)).toFixed(3)),seedScale=Number((b.seed*(.82+((index*11)%37)/100)).toFixed(3)),phrases=focus.split(" • ");
 const record={
  id,name,country,founded,vehicleStart,worldExpansionV1:true,public:PUBLIC.has(id),valuation,cash,share,seedScale,volumeClass,corporatePersonality,
  preferredSegments:[...preferredSegments],marketPreferences:[...preferredSegments],brandIdentity:phrases[0],engineeringStrengths:phrases.slice(0,2),
  technologyAppetite:TECH[corporatePersonality]??.68,manufacturingCapability:b.manufacturing,engineeringCapability:Math.min(96,b.engineering+(corporatePersonality==="technology_leader"?8:corporatePersonality==="vertically_integrated"?3:0)),
  qualityBias:b.quality,reliabilityBias:b.reliability,focus,
  historyNote:name+" enters Motor Dynasty vehicle production in "+vehicleStart+". Its simulated corporate identity emphasizes "+focus.toLowerCase()+". Historical entry timing is anchored; products, finances and alternate outcomes remain simulation-driven."
 };
 if(HISTORY[id])record.historical={...HISTORY[id]};
 D.MANUFACTURERS.push(record);existing.add(id);
});
window.MDXManufacturerExpansion={version:1,added:ROWS.length,targetTotal:200};
})();