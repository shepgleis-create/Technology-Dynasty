window.MDX_DATA={
REGIONS:[
{id:"us_ne",name:"U.S. Northeast",market:1.05,income:1.13,fuel:1.08,weather:"mixed",prefs:{Family:1.12,Premium:1.10,Luxury:1.05,Sport:.92,Utility:.86,Budget:1.02},reg:"us"},
{id:"us_south",name:"U.S. South",market:1.22,income:.96,fuel:.94,weather:"warm",prefs:{Family:1.04,Premium:.92,Luxury:.9,Sport:1.02,Utility:1.28,"Off-Road":1.16,Budget:1.04},reg:"us"},
{id:"us_midwest",name:"U.S. Midwest",market:1.05,income:.97,fuel:.96,weather:"cold",prefs:{Family:1.12,Utility:1.18,"Off-Road":1.08,Budget:1.05,Premium:.88},reg:"us"},
{id:"us_west",name:"U.S. West",market:1.04,income:1.10,fuel:1.18,weather:"mixed",prefs:{Sport:1.08,Premium:1.08,Luxury:1.06,Budget:.95,Utility:.94},reg:"us"},
{id:"canada",name:"Canada",market:.36,income:1.04,fuel:1.20,weather:"cold",prefs:{Family:1.08,Utility:1.03,"Off-Road":1.12,Premium:1.00},reg:"can"},
{id:"mexico",name:"Mexico",market:.42,income:.68,fuel:.88,weather:"warm",prefs:{Budget:1.38,Family:1.06,Premium:.68,Luxury:.55},reg:"mex"},
{id:"uk",name:"United Kingdom",market:.45,income:1.02,fuel:1.55,weather:"mixed",prefs:{Budget:1.08,Family:1.02,Premium:1.08,Sport:1.06,Utility:.72},reg:"eu"},
{id:"west_eu",name:"Western Europe",market:1.20,income:1.08,fuel:1.62,weather:"mixed",prefs:{Budget:1.10,Family:1.08,Premium:1.10,Sport:.98,Utility:.70},reg:"eu"},
{id:"japan",name:"Japan",market:.76,income:1.06,fuel:1.52,weather:"mixed",prefs:{Budget:1.18,Family:1.10,Premium:.96,Utility:.62,Sport:.94},reg:"jp"},
{id:"australia",name:"Australia",market:.24,income:1.05,fuel:1.12,weather:"warm",prefs:{Utility:1.20,"Off-Road":1.22,Family:1.04,Sport:.98},reg:"aus"}
],
SUPPLIERS:[
{id:"continental_steel",name:"Continental Steel",component:"steel",cost:.97,quality:.78,reliability:.91,capacity:1.25,country:"US"},
{id:"union_metals",name:"Union Metals",component:"steel",cost:.90,quality:.66,reliability:.80,capacity:1.50,country:"US"},
{id:"precision_cast",name:"Precision Castings",component:"engine",cost:1.08,quality:.88,reliability:.95,capacity:.92,country:"US"},
{id:"midland_powertrain",name:"Midland Powertrain",component:"transmission",cost:.98,quality:.75,reliability:.90,capacity:1.12,country:"US"},
{id:"tokai_electrics",name:"Tokai Electrics",component:"electronics",cost:1.04,quality:.90,reliability:.94,capacity:.95,country:"JP"},
{id:"rhein_brake",name:"Rhein Brake Systems",component:"brakes",cost:1.10,quality:.92,reliability:.96,capacity:.88,country:"DE"},
{id:"roadstar_rubber",name:"Roadstar Rubber",component:"tires",cost:.95,quality:.74,reliability:.90,capacity:1.30,country:"US"},
{id:"nordic_safety",name:"Nordic Safety",component:"safety",cost:1.12,quality:.94,reliability:.97,capacity:.84,country:"SE"},
{id:"heritage_trim",name:"Heritage Trim",component:"interior",cost:1.05,quality:.86,reliability:.91,capacity:.92,country:"GB"},
{id:"value_trim",name:"Value Trimworks",component:"interior",cost:.86,quality:.62,reliability:.79,capacity:1.45,country:"MX",founded:1962},
{id:"great_lakes_aluminum",name:"Great Lakes Aluminum",component:"aluminum",cost:1.02,quality:.82,reliability:.90,capacity:1.10,country:"US",founded:1954},
{id:"national_auto_glass",name:"National Auto Glass",component:"glass",cost:.97,quality:.79,reliability:.91,capacity:1.22,country:"US",founded:1938},
{id:"precision_fuel_systems",name:"Precision Fuel Systems",component:"fuel_system",cost:1.03,quality:.86,reliability:.92,capacity:.96,country:"US",founded:1946},
{id:"allied_turbo_works",name:"Allied Turbo Works",component:"turbo",cost:1.09,quality:.89,reliability:.88,capacity:.78,country:"DE",founded:1964},
{id:"lumina_automotive",name:"Lumina Automotive Lighting",component:"lighting",cost:1.01,quality:.85,reliability:.93,capacity:1.04,country:"FR",founded:1951},
{id:"powercell_industries",name:"PowerCell Industries",component:"battery",cost:1.00,quality:.83,reliability:.91,capacity:1.08,country:"US",founded:1957},
{id:"meridian_semiconductor",name:"Meridian Semiconductor",component:"semiconductor",cost:1.12,quality:.91,reliability:.94,capacity:.82,country:"JP",founded:1971},
{id:"vector_mobility_software",name:"Vector Mobility Software",component:"software",cost:1.16,quality:.90,reliability:.88,capacity:.74,country:"US",founded:1986}
],
REGULATIONS:[
{id:"us_safety_1973",reg:"us",year:1973,name:"Expanded occupant safety standard",type:"safety",min:48,penalty:450},
{id:"us_emissions_1975",reg:"us",year:1975,name:"Stricter emissions controls",type:"mpg",min:16,penalty:280},
{id:"us_cafe_1978",reg:"us",year:1978,name:"Fleet fuel-economy pressure",type:"fleet_mpg",min:18,penalty:160},
{id:"eu_safety_1976",reg:"eu",year:1976,name:"European occupant protection update",type:"safety",min:50,penalty:380},
{id:"jp_eff_1978",reg:"jp",year:1978,name:"Efficiency certification update",type:"mpg",min:20,penalty:250},
{id:"us_safety_1985",reg:"us",year:1985,name:"Advanced restraint compliance",type:"safety",min:65,penalty:700}
],
PRESS:[
{id:"road_track",name:"Road & Trackline",focus:"Sport",weight:1.0},
{id:"motor_review",name:"Motor Review",focus:"Mainstream",weight:1.1},
{id:"family_auto",name:"Family Auto",focus:"Family",weight:.9},
{id:"executive_motor",name:"Executive Motor",focus:"Luxury",weight:.8}
],
MOTORSPORT:[
{id:"touring",name:"Touring Car Championship",entry:650000,monthly:110000,rep:1.5,tech:"chassis"},
{id:"rally",name:"International Rally Series",entry:850000,monthly:155000,rep:1.8,tech:"durability"},
{id:"endurance",name:"World Endurance Cup",entry:1200000,monthly:240000,rep:2.4,tech:"engine"},
{id:"drag",name:"National Drag Championship",entry:420000,monthly:80000,rep:1.0,tech:"powertrain"}
],
PLATFORM_TYPES:[
{id:"compact",name:"Compact Unibody",dev:650000,days:120,mass:140,maxWeight:1500,maxDisp:3.0,maxEngineMass:240,bodies:["hatch","sedan","coupe"],drives:["FWD","RWD"],reuseDiscount:.075,handling:2,comfort:0,rigidity:3,tooling:.92},
{id:"midsize",name:"Midsize Unibody",dev:900000,days:150,mass:180,maxWeight:1900,maxDisp:4.5,maxEngineMass:310,bodies:["sedan","coupe","wagon"],drives:["FWD","RWD","AWD"],reuseDiscount:.085,handling:1,comfort:2,rigidity:4,tooling:.90},
{id:"utility",name:"Body-on-Frame Utility",dev:1050000,days:165,mass:260,maxWeight:2800,maxDisp:8.0,maxEngineMass:450,bodies:["pickup","suv"],drives:["RWD","AWD"],reuseDiscount:.065,handling:-2,comfort:-1,rigidity:7,tooling:.94},
{id:"premium",name:"Premium RWD Unibody",dev:1400000,days:180,mass:210,maxWeight:2200,maxDisp:6.5,maxEngineMass:390,bodies:["sedan","coupe","convertible","wagon"],drives:["RWD","AWD"],reuseDiscount:.10,handling:3,comfort:4,rigidity:6,tooling:.88}
],
DEFECTS:[
{part:"timing system",severity:"major",base:.022,cost:780,safety:false},
{part:"fuel delivery",severity:"moderate",base:.035,cost:340,safety:false},
{part:"front suspension joint",severity:"major",base:.018,cost:520,safety:true},
{part:"brake hose",severity:"critical",base:.009,cost:290,safety:true},
{part:"electrical harness",severity:"moderate",base:.041,cost:260,safety:false},
{part:"transmission seal",severity:"moderate",base:.028,cost:410,safety:false},
{part:"seat-belt anchor",severity:"critical",base:.006,cost:180,safety:true}
],
DEMOGRAPHICS:[
{id:"young",name:"Young Singles",income:.72,prefs:{Budget:1.22,Sport:1.18,Premium:.72,Luxury:.42,Family:.62}},
{id:"family",name:"Families",income:1.0,prefs:{Family:1.38,Utility:1.10,Budget:1.06,Sport:.64,Luxury:.72}},
{id:"affluent",name:"Affluent Professionals",income:1.8,prefs:{Premium:1.38,Luxury:1.34,Sport:1.12,Budget:.35,Family:.82}},
{id:"commercial",name:"Commercial Buyers",income:1.1,prefs:{Utility:1.50,"Off-Road":1.22,Budget:.82,Premium:.54}}
]
};