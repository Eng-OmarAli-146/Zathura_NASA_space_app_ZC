/* ============================================================================
   missiondata.js — كل أرقام اللعبة ومحتوى المهام في مكان واحد
   ════════════════════════════════════════════════════════════════════════════
   قاعدة البيانات: كل رقم إما (REAL) بالبصمة والمصدر، أو (SIM) معلَّم صراحة.
   ممنوع خلط الاتنين. الواجهة بتقرأ `src` وبتعرضه للمستخدم.
   ==========================================================================*/


/* ---------------------------------------------------------------- المصادر */
const SOURCES = {
  rad_surface: {
    id: 'rad_surface', label: 'RAD/MSL — جرعة سطح المريخ', value: '0.64 mSv/يوم',
    kind: 'real',
    desc: 'قياس مباشر من مقياس الإشعاع RAD على مسبار كيوريوسيتي أثناء أول 300 يوم على السطح.',
    url: 'https://science.nasa.gov/resource/curiosity-tells-all-about-mars-radiation-environment/'
  },
  rad_cruise: {
    id: 'rad_cruise', label: 'RAD/MSL — جرعة السفر بين الكواكب', value: '1.84 mSv/يوم',
    kind: 'real',
    desc: 'نفس الجهاز أثناء رحلة كيوريوسيتي 253 يوم للفضاء العميق — أعلى 3 مرات من السطح.',
    url: 'https://science.nasa.gov/resource/curiosity-tells-all-about-mars-radiation-environment/'
  },
  crew_limit: {
    id: 'crew_limit', label: 'NASA — سقف الجرعة المهنية', value: '600 mSv لكل رائد مدى الحياة',
    kind: 'real',
    desc: 'المعيار الرسمي بعد تحديث 2022: 3% خطر وفاة بالسرطان عند ثقة 95%.',
    url: 'https://www.nasa.gov/humans-in-space/'
  },
  storm_limit: {
    id: 'storm_limit', label: 'NASA — حد العاصفة الواحدة', value: '250 mSv لكل عاصفة',
    kind: 'real',
    desc: 'حد منفصل عن السقف المهني، لأحداث الجزيئات الشمسية المفردة.',
    url: 'https://www.nasa.gov/humans-in-space/'
  },
  eclss_o2: {
    id: 'eclss_o2', label: 'NASA ECLSS — استهلاك الأوكسجين', value: '0.84 كجم/رائد/يوم',
    kind: 'real',
    desc: 'الرقم الرسمي في صفحة نظام دعم الحياة على موقع NASA.',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'
  },
  bvad_water: {
    id: 'bvad_water', label: 'NASA BVAD 2022 — المياه', value: '3.2 كجم شرب + 3.8 لتر إجمالي',
    kind: 'real',
    desc: 'القيم المرجعية لتصميم دعم الحياة (BVAD). أعلى من الرقم القديم 2.5 لتر.',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'
  },
  bvad_food: {
    id: 'bvad_food', label: 'NASA BVAD 2022 — الغذاء', value: '1.56 كجم جاف / 2.39 مع التغليف',
    kind: 'real',
    desc: 'الرقم الشائع 1.8 كجم غير مطابق للمرجع الحديث.',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'
  },
  water_recovery: {
    id: 'water_recovery', label: 'ISS — تدوير المياه', value: '90% (وصلت 98% في 2023)',
    kind: 'real',
    desc: 'نظام استعادة المياه على محطة الفضاء، مع معالج المحلول الملحي (Brine Processor)',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'
  },
  sharad_ice: {
    id: 'sharad_ice', label: 'MRO/SHARAD — جليد تحت سطح المريخ', value: 'صفائح جليدية على عمق أمتار',
    kind: 'real',
    desc: 'رادار المسبار MRO اكتشف صفيحتَي جليد مدفونتين (Arcadia Planitia) — أهم مورد ISRU على المريخ.',
    url: 'https://mars.nasa.gov/mro/'
  },
  ice_moon: {
    id: 'ice_moon', label: 'SOFIA — مياه على القمر', value: 'تأكيد 2020: مياه مولكولة على السطح المضاء',
    kind: 'real',
    desc: 'تلسكوب SOFIA أكّد جزيئات الماء في فوّهة Clavius — أساس فكرة استقدام طاقم/وقود من القمر.',
    url: 'https://science.nasa.gov/feature/goddard/2020/nasa-confirms-water-on-moon'
  },
  isru_program: {
    id: 'isru_program', label: 'NASA — برنامج Moon to Mars (ISRU)', value: 'استخدام موارد محلية بدل الشحن من الأرض',
    kind: 'real',
    desc: 'الأوكسجين والماء والوقود من الريجوليث والجليد — الفارق بين قاعدة تدوم وقاعدة تجف.',
    url: 'https://www.nasa.gov/moon-to-mars/'
  },
  moxie: {
    id: 'moxie', label: 'MOXIE على Perseverance', value: '12 جم/ساعة O₂',
    kind: 'real',
    desc: 'أقصى إنتاج في التشغيل الأخير أغسطس 2023، ضعف الهدف الأصلي.',
    url: 'https://science.nasa.gov/resource/the-sound-of-moxie-at-work-on-mars/'
  },
  donki_catalog: {
    id: 'donki_catalog', label: 'DONKI — كتالوج أحداث الطقس الفضائي', value: 'FLR · CME · SEP · GST · HSS · RBE · IPS',
    kind: 'real',
    desc: 'مكتب تحليل الطقس الفضائي Moon-to-Mars. البيانات "prototyping quality" لأغراض بحثية.',
    url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'
  },
  donki_sep: {
    id: 'donki_sep', label: 'DONKI SEP — جزيئات شمسية', value: 'مايو 2024: 14 حدثًا',
    kind: 'real',
    desc: 'SEP هي الجزيئات عالية الطاقة التي تضرب الطاقم فعلًا. أول حدث 2024-05-09T13:59Z، قبل العاصفة الأرضية بـ24 ساعة.',
    url: 'https://ccmc.gsfc.nasa.gov/DONKI/'
  },
  donki_may2024: {
    id: 'donki_may2024', label: 'DONKI — عاصفة مايو 2024 الكبرى', value: 'Kp = 9.0 في 2024-05-10',
    kind: 'real',
    desc: 'أقوى عاصفة مغناطيسية أرضية في أكثر من 20 عامًا. 85 CME، 135 توهّج (17 من فئة X)، 4 عواصف أرضية.',
    url: 'https://ccmc.gsfc.nasa.gov/DONKI/'
  },
  radlab: {
    id: 'radlab', label: 'RadLab — قياسات جرعات ISS', value: 'قراءة كل 20 ثانية',
    kind: 'real',
    desc: 'قياسات من أجهزة BPD و DOSTEL على محطة الفضاء الدولية. الوحدة غير موثّقة في الـAPI — تعرض كقراءة خام.',
    url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/'
  },
  osdr: {
    id: 'osdr', label: 'OSDR — أبحاث صحة الرواد', value: '122 دراسة عن كثافة العظام',
    kind: 'real',
    desc: 'أرشيف وكالة ناسا للبيولوجيا الفضائية: عظام، عضلات، مناعة، نوم.',
    url: 'https://osdr.nasa.gov/bio/repo/'
  },
  rems: {
    id: 'rems', label: 'REMS/Curiosity — طقس المريخ', value: '+15.9°C نهارًا / −100°C ليلًا',
    kind: 'real',
    desc: 'محطة الأرصاد على كيوريوسيتي في فوهة Gale.',
    url: 'https://science.nasa.gov/mars/'
  },
  artemis: {
    id: 'artemis', label: 'NASA Artemis', value: '—',
    kind: 'real',
    desc: 'برنامج العودة إلى القمر — أساس ظروف سطح القمر.',
    url: 'https://www.nasa.gov/humans-in-space/artemis/'
  },
  mars_program: {
    id: 'mars_program', label: 'NASA Mars Exploration', value: '—',
    kind: 'real',
    desc: 'برنامج استكشاف المريخ والظروف البيئية على السطح.',
    url: 'https://science.nasa.gov/mars/'
  },
  planetary: {
    id: 'planetary', label: 'NASA Planetary Science', value: '—',
    kind: 'real',
    desc: 'بيانات البيئات الكوكبية لكواكب المجموعة الشمسية.',
    url: 'https://science.nasa.gov/solar-system/'
  },
  /* أرقام نسخة اللعبة — معلَّمة بوضوح */
  sim_scaled: {
    id: 'sim_scaled', label: 'تقدير اللعبة', value: '—',
    kind: 'sim',
    desc: 'أي رقم مقياسي داخل المحاكاة (وزن، استهلاك، ساعات). مش قياس حقيقي.',
    url: ''
  }
};

/* ------------------------------------------------------------------ الطاقم */
const CREW_NAMES = ['نور', 'عمر', 'سلمى'];
const CREW_COLORS = ['#4dd9ff', '#ffb347', '#9b7bff'];

/* ------------------------------------------ استهلاك الطاقم (BVAD 2022) */
const CREW_NEEDS = {
  o2_kg: 0.84,       // real
  water_kg: 3.2,     // real
  food_kg: 1.56,     // real
  water_total_l: 3.8 // real
};

/* --------------------------------------------------- إعدادات المحاكاة */
const SIM = {
  crew: 3,
  crew_hours_day: 24,
  day_ms: 2600,             // مدة الـsol بالمللي ثانية
  doses: { cruise: 1.84, surface: 0.64 },
  limits: { career: 600, storm: 250 },
  storm_multiplier: 26,     // تقدير اللعبة: ×26 معدل الخلفية داخل عاصفة
  daily: {
    o2_draw: 1.25,          // نسبة من المخزون/يوم
    water_draw: 0.95,
    food_draw: 0.72,
    power_base: 14.0,     // مفاعل RTG — دايمًا شغال (الليل والغبار مش بيوقفوه)
    power_gen_clear: 24.0,  // ذروة شمسية — صافية (النهار + مفاعل = 38)
    power_gen_dust: 13.0,   // ذروة شمسية — غبار كامل (النهار + مفاعل = 27)
    power_base: 14.0        // استهلاك دعم الحياة الإجباري (sim)
  }
};

/* ========================================================================= */
/*                                   المهام                                  */
/* ========================================================================= */
/* كل مهمة: ظروف بيئية بنفس الوحدات (mSv/day, °C, mmHg, دقائق ضوء) */

const MISSIONS = [
  /* ============================ 1. القمر ============================ */
  {
    id: 'moon',
    num: '01',
    name: 'القمر',
    nameEn: 'THE MOON',
    site: 'القطب الجنوبي — فوهة شاكليتون',
    craft: 'EAGLE II',
    craftFull: 'Lunar Module "Eagle II" — مركبة هبوط قمرية',
    heritage: 'مستوحاة من Apollo 11 — Lunar Module Eagle (1969)',
    heritageUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
    difficulty: 1,
    difficultyLabel: 'مبتدئ',
    color: '#c9ced8',
    color2: '#7d8494',
    sky: '#05060b',
    accent: '#8fd4ff',
    blurb: 'أسهل الوجهات وأسرعها — تأخير الاتصال 1.3 ثانية فقط. لكن ليل القمر 14 يوم بلا شمس، والإشعاع بلا حماية.',
    duration_days: 3,
    travel_days: 3,
    delay_s: 1.3,
    env: {
      gravity_g: 0.165, temp_day: 127, temp_night: -173,
      pressure_mmhg: 0, radiation_dose: 1.50,
      storms: true, dust_storms: false, note: 'لا غلاف جوي — الدروع هي كل الحماية'
    },
    resources: { oxygen: 1.0, water: 0.55, food: 1.0 },
    objectives: [
      'هبوط آمن في القطب الجنوبي',
      'تعدين جليد الماء من الحفر المظلمة',
      'تشغيل وحدة أبحاث وتحمل ليل قمري كامل'
    ],
    scenarios: ['solar_flare', 'lunar_night', 'regolith', 'o2_leak', 'spe_proton', 'micropuncture'],
    primaryThreat: 'الإشعاع — لا يوجد غلاف جوي',
    secondaryThreat: 'ليل 14 يوم بلا كهرباء شمسية'
  },

  /* ============================ 2. المريخ ============================ */
  {
    id: 'mars',
    num: '02',
    name: 'المريخ',
    nameEn: 'MARS',
    site: 'فوهة جيزيرو — Jezero Crater',
    craft: 'ARES VII',
    craftFull: 'Ares VII — مركبة سطح مأهولة',
    heritage: 'مستوحاة من Mars 2020 / Perseverance',
    heritageUrl: 'https://science.nasa.gov/mars/',
    difficulty: 2,
    difficultyLabel: 'متوسط',
    color: '#d4653f',
    color2: '#7a3320',
    sky: '#e8b17a',
    accent: '#ffb347',
    blurb: 'الوجهة النموذجية: 210 يوم سفر، تأخير اتصال حتى 22 دقيقة، عواصف ترابية — ولا وسيلة للنجدة.',
    duration_days: 53,
    travel_days: 210,
    delay_s: 1320,
    env: {
      gravity_g: 0.377, temp_day: 15.9, temp_night: -100,
      pressure_mmhg: 5.4, radiation_dose: 0.64,
      storms: true, dust_storms: true, note: 'CO₂ 96% · 0.7% من ضغط الأرض'
    },
    resources: { oxygen: 1.0, water: 0.6, food: 0.85 },
    objectives: [
      'هبوط في فوهة جيزيرو',
      'جمع 6 عينات صخرية',
      'تشغيل دفيئة وإنتاج غذاء محلي',
      'العودة بفريق سليم'
    ],
    scenarios: ['solar_storm', 'dust_storm', 'o2_leak', 'water_filter', 'comms_delay', 'food_shortage', 'power_failure', 'dust_devil', 'spe_proton', 'co2_scrubber'],
    primaryThreat: 'الأوكسجين والغذاء — مدة طويلة بدون إمداد',
    secondaryThreat: 'تأخير الاتصال 22 دقيقة'
  },

  /* ============================ 3. عطارد ============================ */
  {
    id: 'mercury',
    num: '03',
    name: 'عطارد',
    nameEn: 'MERCURY',
    site: 'فوهة كالوري — القطب الشمالي',
    craft: 'HERMES I',
    craftFull: 'Hermes I — محطة مدارية + مسبار سطحي',
    heritage: 'مستوحاة من NASA MESSENGER (2004–2015)',
    heritageUrl: 'https://science.nasa.gov/mercury/',
    difficulty: 3,
    difficultyLabel: 'متقدم',
    color: '#b9a89b',
    color2: '#6b5c50',
    sky: '#0a0a0f',
    accent: '#ff9f5a',
    blurb: '3 شهور سفر، حرارة تفرق 600 درجة، وشمس أقوى 10 مرات. والفرملة تاخد معظم الوقود.',
    duration_days: 40,
    travel_days: 115,
    delay_s: 480,
    env: {
      gravity_g: 0.38, temp_day: 430, temp_night: -180,
      pressure_mmhg: 0, radiation_dose: 6.5,
      storms: true, dust_storms: false, note: 'فرق حراري 610° — تمدد وانكماش في المعدن'
    },
    resources: { oxygen: 0.8, water: 0.35, food: 0.9 },
    objectives: [
      'منارة جاذبية للفرملة قبل المدار',
      'هبوط في قطب مظلل دائمًا',
      'حماية حرارية للنظام',
      'تحمل عاصفة شمسية بدون غلاف جوي'
    ],
    scenarios: ['solar_flare', 'thermal_shock', 'power_failure', 'comms_delay', 'spe_proton', 'co2_scrubber'],
    primaryThreat: 'الحرارة والإشعاع',
    secondaryThreat: 'الوقود — الفرملة تستهلك المعظم'
  },

  /* ============================ 4. الزهرة ============================ */
  {
    id: 'venus',
    num: '04',
    name: 'الزهرة',
    nameEn: 'VENUS',
    site: 'منطاد على ارتفاع 50 كم',
    craft: 'AEROSTAT V',
    craftFull: 'Aerostat V — محطة جوية عائمة',
    heritage: 'مستوحاة من NASA Magellan (1989–1994)',
    heritageUrl: 'https://science.nasa.gov/venus/',
    difficulty: 4,
    difficultyLabel: 'خبير',
    color: '#f0d98a',
    color2: '#a8862f',
    sky: '#ffcf6b',
    accent: '#ffd98a',
    blurb: 'على سطح الزهرة 464°C وضغط 92 ضعف الأرض — مستحيل. لكن على ارتفاع 50 كم الضغط والحرارة قريبين من الأرض. محطة عائمة منطقيًا.',
    duration_days: 35,
    travel_days: 150,
    delay_s: 300,
    env: {
      gravity_g: 0.9, temp_day: 75, temp_night: 60,
      pressure_mmhg: 760, radiation_dose: 0.9,
      storms: true, dust_storms: false, note: 'سحب حمض كبريتيك · رياح 350 كم/س'
    },
    resources: { oxygen: 0.75, water: 0.3, food: 0.8 },
    objectives: [
      'الحفاظ على ارتفاع آمن 50 كم',
      'درع تفلون ضد الحمض',
      'مناورة في الرياح الفائقة',
      'تصوير ورصد قبل الهبوط التدريجي'
    ],
    scenarios: ['acid_clouds', 'super_rotation', 'balloon_leak', 'electronics_heat', 'comms_delay', 'greenhouse_blight', 'co2_scrubber'],
    primaryThreat: 'الحمض والتآكل',
    secondaryThreat: 'فقدان الارتفاع = سحق فوري'
  },

  /* ============================ 5. زحل ============================ */
  {
    id: 'saturn',
    num: '05',
    name: 'زحل / تايتان',
    nameEn: 'SATURN',
    site: 'مدار زحل + هبوط على تايتان',
    craft: 'CASSINI II',
    craftFull: 'Cassini II — محطة مدارية + مسبار تايتان',
    heritage: 'مستوحاة من Cassini–Huygens (1997–2017)',
    heritageUrl: 'https://science.nasa.gov/saturn/',
    difficulty: 5,
    difficultyLabel: 'أسطوري',
    color: '#e8dcc0',
    color2: '#8a7a5a',
    sky: '#0b0d1a',
    accent: '#c9b98a',
    blurb: '6–7 سنوات سفر. الإشارة تاخد 84 دقيقة. لازم قراراتك تكون مستقلة تمامًا — الأرض مش هترد.',
    duration_days: 60,
    travel_days: 2555,
    delay_s: 5040,
    env: {
      gravity_g: 0.14, temp_day: -179, temp_night: -185,
      pressure_mmhg: 1140, radiation_dose: 2.2,
      storms: true, dust_storms: true, note: 'تايتان: نيتروجين 95% · ميثان · برد −179°'
    },
    resources: { oxygen: 0.6, water: 0.25, food: 0.6 },
    objectives: [
      'عبور حلقات زحل بأمان',
      'هبوط على تايتان (Dragonfly style)',
      'إنتاج طاقة من RTG بديل',
      'استقلالية تامة قرارات'
    ],
    scenarios: ['ring_crossing', 'titan_fog', 'titan_cold', 'gcr_bones', 'isolation', 'comms_delay', 'spe_proton', 'micropuncture', 'greenhouse_blight'],
    primaryThreat: 'المسافة والاستقلالية',
    secondaryThreat: 'برد تايتان −179°'
  },

  /* ============================ 6. زويل ════════================= */
  {
    id: 'zewail',
    num: '06',
    name: 'كوكب زويل',
    nameEn: 'ZEWAIL',
    site: 'حوض Egea — حقول جليد شبه سطي',
    craft: 'ZEWAIL II',
    craftFull: 'Zewail II — مختبر كيميائي ضوئي مداري + مركبة سطح',
    heritage: 'وجهة خيالية مستوحاة من أبحاث الجليد الحقيقية (SHARAD/SOFIA) — تكريمًا لأحمد زويل (نوبل الكيمياء 1999)',
    heritageUrl: 'https://www.nasa.gov/moon-to-mars/',
    difficulty: 3,
    difficultyLabel: 'صعب — النخبة',
    color: '#3fd8c9',
    color2: '#0e4a52',
    sky: '#01242c',
    accent: '#4dd9ff',
    blurb: 'وجهة خيالية لعشاق الكيمياء: جليد مالح تحت سطح دافئ نسبيًا، شفق قطبي دايم — والبرد هو عدوك وقت الليل.',
    duration_days: 21,
    travel_days: 96,
    delay_s: 480,
    env: {
      gravity_g: 0.42, temp_day: -21, temp_night: -148,
      pressure_mmhg: 8, radiation_dose: 0.38,
      storms: false, dust_storms: false,
      note: 'جليد مالح شبه-سطحي · شفق قطبي · برد ليلي قاتل لغير المجهزين'
    },
    resources: { oxygen: 0.85, water: 0.45, food: 0.7 },
    objectives: [
      'تحليل التركيب الكيميائي للجليد المالح',
      'استخراج 6 حقائب ريجوليث وعينات عضوية',
      'تشغيل مفاعل صهر ISRU مستقل عن الأرض',
      'العودة بحمولة ثلج قابلة للتحليل'
    ],
    scenarios: ['spe_proton', 'solar_flare', 'co2_scrubber', 'greenhouse_blight', 'micropuncture', 'cryo_freeze', 'last_meal'],
    primaryThreat: 'البرد الليلي −148°C — التدفئة ليست رفاهية',
    secondaryThreat: 'المسافة — اتصال متقطع كل عدة ساعات'
  }
];

/* ======================================================================= */
/*    السيناريوهات — كل واحد ليه أنيميشن وسؤال وقرارات صحيحة وخاطئة       */
/* ======================================================================= */

const SCENARIOS = {
  /* -------- مشترك: عاصفة جزيئات شمسية -------- */
  solar_flare: {
    id: 'solar_flare',
    kind: 'radiation',
    title: 'عاصفة جزيئات شمسية',
    titleEn: 'SOLAR ENERGETIC PARTICLE EVENT',
    severity: 'critical',
    source: 'donki_sep',
    icon: 'sun',
    briefing: 'مكتب الطقس الفضائي رصد جزيئات عالية الطاقة من توهج على الشمس. الجزيئات في طريقها إلينا الآن.',
    time_to_impact: 40,   // ثانية
    choices: [
      {
        id: 'shelter',
        label: 'دخول الملجأ الإشعاعي فورًا',
        detail: 'نوقف كل الأنشطة وننزل كل الطاقم للملجأ تحت السطح.',
        effects: { dose: 4, o2: -3, hours: -6, science: -1 },
        correct: true,
        why: 'الصح: الدرع بيقلل الجرعة 85%+. التكلفة: 6 ساعات من طاقمك ضاعت.'
      },
      {
        id: 'partial',
        label: 'ندخل جزئيًا — نكمل التجارب الحرجة',
        detail: 'نحط غطاء إضافي ونسيب الطاقم شغال.',
        effects: { dose: 55, o2: -1, hours: 0, science: 1 },
        correct: false,
        why: 'الجرعة اتعرضت ليك: 55 mSv في دقايق. ده ربع سقف العاصفة الواحدة.'
      },
      {
        id: 'ignore',
        label: 'نكمل العمل — الجرعة في الخلفية عادية',
        detail: 'لا إجراء.',
        effects: { dose: 165, o2: 0, hours: 0, science: 2 },
        correct: false,
        why: 'خطر: 165 mSv في دقيقة — ثلث رصيدك المدى الحياة كله.'
      }
    ]
  },

  solar_storm: {
    id: 'solar_storm',
    kind: 'radiation',
    title: 'عاصفة شمسية كبيرة',
    titleEn: 'MAJOR SOLAR PARTICLE STORM',
    severity: 'critical',
    source: 'donki_may2024',
    icon: 'sun',
    briefing: 'العاصفة الحقيقية: 10 مايو 2024، أقوى عاصفة مغناطيسية في 20 سنة (Kp = 9.0). 17 توهج من فئة X. الأرض ما زالت ما خلصتش منها.',
    time_to_impact: 45,
    choices: [
      { id: 'shelter', label: 'ملجأ + درع نشط', detail: 'كل الطاقم تحت الدرع.', effects: { dose: 6, o2: -4, hours: -8, science: -1 }, correct: true, why: 'الجرعة 6 mSv فقط. الصح.' },
      { id: 'partial', label: 'درع جزئي — نغطي الكابسولة', detail: 'الطاقم في المنتصف.', effects: { dose: 58, o2: -2, hours: -3, science: 0 }, correct: false, why: '58 mSv — التنازل ده ماله لزوم.' },
      { id: 'ignore', label: 'سترات واقية وبس', detail: 'السترات تحمي من الحطام، ما توقفش البروتونات.', effects: { dose: 175, o2: 0, hours: 0, science: 2 }, correct: false, why: 'السترات مش كفاية أبدًا في عاصفة بهذا الحجم — البروتونات عالية الطاقة بتخترق القماش والطبقة المعدنية.' }
    ]
  },

  /* -------- القمر -------- */
  lunar_night: {
    id: 'lunar_night', kind: 'power', title: 'ليل القمر المتجمد',
    titleEn: 'LUNAR NIGHT — 173°C BELOW', severity: 'high', source: 'sim_scaled', icon: 'moon',
    briefing: 'الشمس غابت في القطب الجنوبي. الليل القمري مستمر 14 يوم. الألواح وقفت والحرارة بتنزل −173°C.',
    time_to_impact: 30,
    choices: [
      { id: 'shutdown', label: 'نفصل كل التجارب العلمية', detail: 'الطاقة للتدفئة ودعم الحياة بس.', effects: { power: -18, science: -2, o2: 0 }, correct: true, why: 'سلامة الطاقم أولًا. العلم هيتوقف 14 يوم بس الطاقم حي.' },
      { id: 'burn', label: 'نحرق وقود المركبة لتوليد كهربا', detail: 'إنتاج إضافي فوري.', effects: { power: 20, fuel: -35, o2: -2 }, correct: false, why: 'وقود الإقلاع اتبخر. المركبة مش هتقدر ترجع.' },
      { id: 'lesseat', label: 'نقلل التدفئة', detail: 'توفير طاقة.', effects: { o2: -25, power: 8 }, correct: false, why: 'حرارة المقصورة نزلت تحت الصفر — الماء اتجمد.' }
    ]
  },

  regolith: {
    id: 'regolith', kind: 'radiation', title: 'غبار قمري سام',
    titleEn: 'LUNAR REGOLITH CONTAMINATION', severity: 'high', source: 'artemis', icon: 'moon',
    briefing: 'غبار القمر حاد كالزجاج، بيراكم على الألواح وبيدخل الأقنعة. بيقطع الإنتاج والتنفس.',
    time_to_impact: 30,
    choices: [
      { id: 'clean', label: 'تنظيف المصفوفة والأقنعة', detail: 'نوقف يوم كامل للتنظيف.', effects: { power: 12, hours: -10, o2: 0 }, correct: true, why: 'الإنتاج رجع 100% — بس كلفك 10 ساعات.' },
      { id: 'ignore', label: 'نكمل بالغبار', detail: 'مفيش وقت.', effects: { power: -22, o2: -18 }, correct: false, aftermath: 'maintenance', why: 'الغبار قطع التنفس والإنتاج.' }
    ]
  },

  /* -------- المريخ -------- */
  dust_storm: {
    id: 'dust_storm', kind: 'power', title: 'عاصفة ترابية مريخية',
    titleEn: 'MARTIAN GLOBAL DUST STORM', severity: 'high', source: 'rems', icon: 'dust',
    briefing: 'التراب غطى السماء. الألواح بتنتج 25% بس من قدرتها. الدفيئة محتاجة ضوء.',
    time_to_impact: 35,
    choices: [
      { id: 'rtg', label: 'تحويل الحمل لـ RTG والبطاريات', detail: 'إنتاج مضمون بس محدود.', effects: { power: -10, science: -1, o2: 0 }, correct: true, why: 'كفاية للضروري. العلم اتبطأ.' },
      { id: 'greenhouse', label: 'نخلي الدفيئة منورة بأقصى طاقة', detail: 'نضحي بالتكييف.', effects: { power: -20, o2: -12, science: 1 }, correct: false, why: 'الدفيئة اشتغلت بس أنظمة الحياة ضعفت.' },
      { id: 'clean', label: 'تنظيف الألواح كل ساعة', detail: 'جهد كامل.', effects: { hours: -12, power: -4 }, correct: false, why: 'التراب بيرجع فورًا — 12 ساعة ضاعت.' }
    ]
  },

  water_filter: {
    id: 'water_filter', kind: 'water', title: 'فلتر تدوير المياه اتسدّ',
    titleEn: 'WATER RECOVERY FILTER BLOCKED', severity: 'high', source: 'water_recovery', icon: 'water',
    briefing: 'كفاءة الاستعادة نزلت من 90% لـ50%. كل رائد بيستهلك 3.2 كجم مية يوميًا — الحساب مش هيستحمل.',
    time_to_impact: 30,
    choices: [
      { id: 'fix', label: 'إصلاح الفلتر + ترشيد فوري', detail: 'إيقاف ري المزرعة مؤقتًا.', effects: { water: 12, hours: -6, food: -8 }, correct: true, why: 'المية رجعت للـ90% — بس المزرعة اتبطأت.' },
      { id: 'reserve', label: 'سحب من مخزون الهبوط', detail: 'المخزون الاحتياطي.', effects: { water: -25, o2: 0 }, correct: false, why: 'المخزون ده للحالات الحرجة — صفّيته.' },
      { id: 'ignore', label: 'نكمل بـ50%', detail: 'الطاقم هيقلل شرب.', effects: { water: -40, o2: -10 }, correct: false, why: 'الجفاف وصل — التركيز والأداء نزلوا.' }
    ]
  },

  o2_leak: {
    id: 'o2_leak', kind: 'oxygen', title: 'تسريب أوكسجين',
    titleEn: 'OXYGEN LEAK — PRESSURE DROP', severity: 'critical', source: 'eclss_o2', icon: 'o2',
    briefing: 'حساس الضغط رصد هبوط مفاجئ. الأوكسجين بيتسرب. الأرض على بعد دقائق ضوء — مش هتساعد.',
    time_to_impact: 28,
    choices: [
      { id: 'seal', label: 'قفل بوابة العزل فورًا', detail: ' 40 ثانية وخلص.', effects: { o2: 4, food: -35, hours: -2 }, correct: true, why: 'أوكسجين سليم — بس 30 يوم أكل ومعدات حفر اتحبسوا.' },
      { id: 'repair', label: 'إصلاح من جوه بالسويت', detail: 'بتحافظ على المخزون.', effects: { o2: 2, dose: 18 }, correct: false, why: 'المخزون اتحفظ بس رائد أخد 18 mSv.' },
      { id: 'wait', label: 'استنى قرار مركز التحكم', detail: '20 دقيقة انتظار.', effects: { o2: -60 }, correct: false, aftermath: 'maintenance', why: '36 دقيقة انتظار — والمخزون كان يكفي 28.' }
    ]
  },

  food_shortage: {
    id: 'food_shortage', kind: 'food', title: 'نقص غذاء',
    titleEn: 'FOOD SUPPLY CRITICAL', severity: 'high', source: 'bvad_food', icon: 'food',
    briefing: 'مخزون الوجبات نزل تحت 20%. الدفيئة بتنتج 30% من الاحتياج. كل رائد محتاج 1.56 كجم/يوم.',
    time_to_impact: 30,
    choices: [
      { id: 'expand', label: 'توسيع الدفيئة بالطاقة', detail: 'ضوء ونمو أسرع.', effects: { food: 25, power: -16, water: -8 }, correct: true, why: 'الأكل زاد — بس الكهربا والمية دفعوا الفاتورة.' },
      { id: 'rations', label: 'تقنين الحصص', detail: 'كل رائد يحصل على 60%.', effects: { food: 8, o2: -15, hours: -4 }, correct: false, why: 'الطاقم ضعف — الأداء قل 15%.' },
      { id: 'stop', label: 'إيقاف الدفيئة وتوفير طاقتها', detail: 'مفيش أكل محلي.', effects: { food: -30, power: 12 }, correct: false, why: 'وفّرت كهربا وخسرت مصدر الأكل الوحيد.' }
    ]
  },

  power_failure: {
    id: 'power_failure', kind: 'power', title: 'انهيار الشبكة الكهربائية',
    titleEn: 'ELECTRICAL SYSTEM FAILURE', severity: 'critical', source: 'sim_scaled', icon: 'power',
    briefing: 'قفزة حمل سببت فصل في المحول الرئيسي. الأنظمة بتتطفي واحدة واحدة.',
    time_to_impact: 25,
    choices: [
      { id: 'shed', label: 'فصل الأحمال غير الضرورية', detail: 'دعم حياة أولًا.', effects: { power: 6, science: -3, hours: -3 }, correct: true, why: 'دعم الحياة اشتغل — البحث اتوقف.' },
      { id: 'restart', label: 'إعادة تشغيل المحول فورًا', detail: 'مخاطرة.', effects: { power: 14, o2: -20 }, correct: false, aftermath: 'maintenance', why: 'المحول رجع بس فليكر وقطع في دورة الهوا.' }
    ]
  },

  comms_delay: {
    id: 'comms_delay', kind: 'comms', title: 'تأخير الاتصال',
    titleEn: 'SIGNAL DELAY — YOU ARE ON YOUR OWN', severity: 'medium', source: 'mars_program', icon: 'comms',
    briefing: 'الأرض بترد بعد دقائق. لازم تقرر لوحدك — هناك قرارات مش هتستنى.',
    time_to_impact: 25,
    choices: [
      { id: 'autonomy', label: 'نفّذ القرار الآن بدون انتظار', detail: 'استقلالية كاملة.', effects: { hours: -2, dose: 0 }, correct: true, why: 'التأخير مش مشكلة لو انت اللي بتقرر.' },
      { id: 'wait', label: 'استنى التعليمات', detail: '16 دقيقة ×2.', effects: { o2: -18, hours: -2 }, correct: false, why: 'الانتظار ضيّع وقت خانق.' }
    ]
  },

  /* -------- زويل — انهيار تبريد المركبة -------- */
  cryo_freeze: {
    id: 'cryo_freeze', kind: 'cold', title: 'انهيار حلقة التبريد',
    titleEn: 'CRYO LOOP FAILURE — ZEWAIL NIGHT', severity: 'high', source: 'isru_program', icon: 'cold',
    briefing: 'ليلة −148°C وحلقة التبريد الأساسية وقعت. الجليد الداخلي في الأنابيب هيتجمد ويتكسر — الأوكسجين السائل في الضاغط هو الضحية الأقرب.',
    time_to_impact: 30,
    choices: [
      { id: 'heatboost', label: 'تحويل طاقة دائمة للتدفئة', detail: 'التدفئة تبقى شغالة على مدار الساعة.', effects: { power: -10, hours: -1 }, correct: true, why: 'الصح — على زويل التدفئة ليست ترفًا. المفاعل قد يتحمل، أنابيب الأوكسجين لا.' },
      { id: 'isolate', label: 'قفل الحلقات الجانبية وعزل الأساسية', detail: 'نشيل الأجزاء الضعيفة من الشبكة.', effects: { power: -6, o2: -6, hours: -2 }, correct: false, why: 'العزل أنقذ الأعضاء الرئيسية بس الأوكسجين السائل نزف −6% في العملية.' },
      { id: 'ride', label: 'نستنى الصباح — لازم تتثبت لوحدها', detail: 'النهار هيسخن كل حاجة.', effects: { o2: -18, dose: 6 }, correct: false, aftermath: 'maintenance', why: 'الأنابيب اتجمدت وانكسرت فعلًا — خزان الأوكسجين خسر جزء ونجم تسرب داخلي.' }
    ]
  },

  /* -------- مخاطر الموارد أثناء المهمة -------- */
  dust_devil: {
    id: 'dust_devil', kind: 'wind', title: 'شيطان غباري يضرب الألواح',
    titleEn: 'DUST DEVIL — SOLAR ARRAY HIT', severity: 'medium', source: 'rems', icon: 'dust',
    briefing: 'دوامة ترابية بسرعة 80 كم/س لفت على المصفوفة الشمسية. الغبار بينضف طبيعي في المريخ — بس كل دورة غبار = كيلووات أقل.',
    time_to_impact: 30,
    choices: [
      { id: 'shutter', label: 'إغلاق الفتحات والكاميرات فورًا', detail: 'الروبوت يتحمل الضربة.', effects: { dust: 0.08, hours: -1 }, correct: true, why: 'الصح — الغبار حجمه محدود والفتحات ما اتحطتش فيها تربة.' },
      { id: 'ride', label: 'نسيبها تعدي — مفيش وقت', detail: 'المجموعة بتشوفها بعيد.', effects: { dust: 0.3, power: -8 }, correct: false, why: 'الغبار تراكم 30% — الإنتاج بينهار لحد ما تتنضف الألواح.' },
      { id: 'clean_after', label: 'تنظيف فوري بعد الدوامة', detail: 'شغل يدوي على طول.', effects: { hours: -3, dust: 0.12 }, correct: false, why: 'تضحيات مطلوبة — 3 ساعات ضاعت والغبار باقي منه فات.' }
    ]
  },

  spe_proton: {
    id: 'spe_proton', kind: 'radiation', title: 'حدث بروتونات شمسية مفاجئ',
    titleEn: 'PROTON EVENT — NO WARNING', severity: 'high', source: 'donki_sep', icon: 'sun',
    briefing: 'الجسيمات سريعة جدًا — مفيش إنذار مسبق. الدرع العادي ما يكفيش؛ محتاج درع ISRU أو ملجأ تحت السطح.',
    time_to_impact: 25,
    choices: [
      { id: 'isru_shield', label: 'الدرع المحلي المصهور + الملجأ', detail: 'ريجوليث مصهور بيوقف البروتونات.', effects: { dose: 3, hours: -3 }, correct: true, why: 'درع ISRU محلي: الجرعة 3 mSv بس — ده مية بمية السبب في بناء الدرع.' },
      { id: 'shelter', label: 'ملجأ تحت السطح بدون درع إضافي', detail: 'الصخر العادي بيخفف بس مش 100%.', effects: { dose: 18, hours: -4 }, correct: false, why: '18 mSv — مقبول، بس من غير درع ISRU كان هيبقى أضعاف.' },
      { id: 'eva', label: 'استكمال الـEVA الضرورية وبس', detail: 'نخلص الضروري وننزل.', effects: { dose: 52, science: 1 }, correct: false, why: '52 mSv في دقائق — خمس سقف العاصفة الواحدة.' }
    ]
  },

  micropuncture: {
    id: 'micropuncture', kind: 'oxygen', title: 'ثقب دقيق في خزان الأوكسجين',
    titleEn: 'MICROMETEORITE PUNCTURE — O₂ TANK', severity: 'high', source: 'eclss_o2', icon: 'o2',
    briefing: 'جسم بحجم حبيبة رمل وخز الخزان. الهسيس خفيف... بس الأوكسجين بيتسرّب ببطء — وده أخطر أنواع التسريبات.',
    time_to_impact: 30,
    choices: [
      { id: 'isolate', label: 'قفل العزل + رقعة إبوكسي', detail: 'شغل نظيف من جوه.', effects: { o2: -3, hours: -3 }, correct: true, why: 'الخزان اتعزل والرقعة اتثبت — خسارة بسيطة فقط.' },
      { id: 'sinter_patch', label: 'رقعة ريجوليث مصهور', detail: 'صهر تربة محلية حول الثقب.', effects: { regolith: -2, hours: -2, o2: -1 }, correct: true, why: 'ريجوليث مصهور + إيبوكسي = ختم دايم بمواد محلية 100%.' },
      { id: 'wait', label: 'نراقب بس — الهسيس خفيف', detail: 'يمكن يبقى وهم.', effects: { o2: -14 }, correct: false, why: 'الهسيس مبطلش — خزّانك خسر 14% من الأوكسجين.' }
    ]
  },

  co2_scrubber: {
    id: 'co2_scrubber', kind: 'oxygen', title: 'منظّم CO₂ عطلان',
    titleEn: 'CO₂ SCRUBBER FAULT', severity: 'medium', source: 'eclss_o2', icon: 'o2',
    briefing: 'خرطوشة الأمين خلصت صلاحيتها. CO₂ بدأ يتراكم في المقصورة — مفيش تأثير فوري، بس التركيز بيطلع كل ساعة.',
    time_to_impact: 35,
    choices: [
      { id: 'swap', label: 'تبديل الخرطوشة الاحتياطية', detail: 'المخزن معاه واحدة.', effects: { hours: -2 }, correct: true, why: 'شغل بسيط بس لازم يتم دلوقتي — CO₂ مش بيهزر مع دماغ الرائد.' },
      { id: 'manual', label: 'تشغيل مضخة الامتصاص اليدوية', detail: 'جهد بشري بدل الكهرباء.', effects: { hours: -4, o2: -4 }, correct: false, why: 'اشتغلت بس التعب كبير واستهلاك الأوكسجين زاد.' },
      { id: 'vent', label: 'تهوية المقصورة كل 20 دقيقة', detail: 'نفضّي الجو يدوي.', effects: { o2: -12 }, correct: false, why: 'التهوية رمت أوكسجين ثمين مع ثاني أكسيد الكربون.' }
    ]
  },

  greenhouse_blight: {
    id: 'greenhouse_blight', kind: 'food', title: 'آفة فطرية في الدفيئة',
    titleEn: 'FUNGAL BLIGHT — GREENHOUSE', severity: 'medium', source: 'bvad_food', icon: 'food',
    briefing: 'بقع بنية على الأوراق — فطر شبيه بالبياض الدقيقي. بيتمدد بسرعة في الرطوبة العالية للدفيئة.',
    time_to_impact: 30,
    choices: [
      { id: 'prune', label: 'تشذيب الأوراق المصابة فورًا', detail: 'نشيل البؤر قبل ما تنتشر.', effects: { hours: -1, food: -2 }, correct: true, why: 'التشذيب المبكر أنجح علاج — خسرت 2% غذاء وبس.' },
      { id: 'copper', label: 'مبيد نحاسي موضعي', detail: 'رش على البقع.', effects: { water: -3, food: 0 }, correct: false, why: 'نجح المبيد — بس الماء اللي اتصرف كان محتاجينه.' },
      { id: 'ignore', label: 'نستنى ونشوف الأسبوع الجاي', detail: 'يمكن يكون حاجة تانية.', effects: { food: -12 }, correct: false, why: 'الفطر غطى المجموعة كلها — خسارة 12% من المحصول.' }
    ]
  },

  last_meal: {
    id: 'last_meal', kind: 'food', title: 'الوجبات بدأت تفسد',
    titleEn: 'FOOD SPOILAGE — LAST CYCLE', severity: 'medium', source: 'bvad_food', icon: 'food',
    briefing: 'رطوبة الوجبات المجففة عدّت الحد — الفطر هيتشكل خلال 48 ساعة لو ما اتصرفتش.',
    time_to_impact: 30,
    choices: [
      { id: 'redistribute', label: 'تقسيم الحصص بالتساوي', detail: 'نص حصة × 3 أشخاص = لا جوع ولا هدر.', effects: { food: -3 }, correct: true, why: 'التقسيم العادل أنضف حل — كله لسه واكل، بس أقل.' },
      { id: 'freeze', label: 'تجميد فوري بالطاقة', detail: 'نشيل الرطوبة بالفريزة.', effects: { power: -8, food: 0 }, correct: false, why: 'التجميد نجح — بس الشبكة الكهربائية حست بالضريبة.' },
      { id: 'ignore', label: 'الفطر مش هيحصل في أسبوع', detail: 'تجاهل.', effects: { food: -10, o2: -4 }, correct: false, why: 'الفطر حصل — التسمم الخفيف ضرب الطاقم كله.' }
    ]
  },

  /* -------- عطارد -------- */
  thermal_shock: {
    id: 'thermal_shock', kind: 'heat', title: 'صدمة حرارية',
    titleEn: 'THERMAL SHOCK — 610° SWING', severity: 'critical', source: 'planetary', icon: 'heat',
    briefing: 'المركبة خرجت من نهار 430°C لظل −180°C في دقائق. فرق 610 درجة بيشرخ المعدن.',
    time_to_impact: 30,
    choices: [
      { id: 'balance', label: 'تخصيص طاقة دائمة للتوازن الحراري', detail: 'تدوير + مبردات.', effects: { power: -20, dose: 0 }, correct: true, why: 'الدرع سليم — بس الكهربا دفعت.' },
      { id: 'cut', label: 'نوقف التوازن الحراري', detail: 'توفير طاقة.', effects: { power: 10, dose: 45 }, correct: false, why: 'تشققات في الدرع — الإشعاع دخل مباشر.' }
    ]
  },

  /* -------- الزهرة -------- */
  acid_clouds: {
    id: 'acid_clouds', kind: 'acid', title: 'سحب حمض الكبريتيك',
    titleEn: 'SULFURIC ACID ATTACK', severity: 'high', source: 'planetary', icon: 'acid',
    briefing: 'الحمض بياكل الطبقة الخارجية للحساسات والألواح. التلف دايم مش قابل للإصلاح.',
    time_to_impact: 30,
    choices: [
      { id: 'rise', label: 'نطلع لـ58 كم وأغطية تفلون', detail: 'فوق تركيز السحابة.', effects: { power: -8, hours: -2 }, correct: true, why: 'السطح اتحمي — طلعة قصيرة.' },
      { id: 'stay', label: 'نفضل في السحابة', detail: 'توفير طاقة الصعود.', effects: { power: -22, dose: 18 }, correct: false, why: 'الألواح اتحلّت للنص — تلف دايم.' }
    ]
  },

  super_rotation: {
    id: 'super_rotation', kind: 'wind', title: 'الرياح الفائقة',
    titleEn: 'SUPER-ROTATION — 350 KM/H', severity: 'high', source: 'planetary', icon: 'wind',
    briefing: 'رياح 350 كم/س سحبت المنطاد ناحية الجانب الليلي. مفيش شمس = مفيش شحن.',
    time_to_impact: 30,
    choices: [
      { id: 'ride', label: 'نركب التيار ونوفر الطاقة', detail: 'هنلف الكوكب ونرجع للنهار.', effects: { power: -12, hours: -4 }, correct: true, why: 'وفّرت الوقود — الرياح هي اللي هتجيبك.' },
      { id: 'fight', label: 'محركات عكس الرياح', detail: 'نفضل في النهار.', effects: { fuel: -50, power: -10 }, correct: false, aftermath: 'maintenance', why: 'الرياح أقوى — اشتغلت عكسها وخسرت نصف الوقود وبلا فايدة.' }
    ]
  },

  balloon_leak: {
    id: 'balloon_leak', kind: 'oxygen', title: 'فقدان الارتفاع',
    titleEn: 'ALTITUDE LOSS — 50 TO 42 KM', severity: 'critical', source: 'planetary', icon: 'heat',
    briefing: 'ثقب صغير في البالون. المركبة بتغطس من 50 لـ42 كم. الحرارة والضغط بيزيدوا بسرعة.',
    time_to_impact: 25,
    choices: [
      { id: 'drop', label: 'نرمي أوزان غير حيوية', detail: 'ترتفع فورًا بدون وقود.', effects: { food: -10, power: 0 }, correct: true, why: 'الطفو رفعك لل50 كم — خسرت 10% إمدادات بس.' },
      { id: 'burn', label: 'حرق محركات رفع', detail: 'رفع بالقوة.', effects: { fuel: -40, dose: 8 }, correct: false, why: 'الوقود اتحرق ولسه هتغطس بعد ما تبطل المحرك.' }
    ]
  },

  electronics_heat: {
    id: 'electronics_heat', kind: 'heat', title: 'سخونة الإلكترونيات',
    titleEn: 'AVIONICS OVERHEAT', severity: 'high', source: 'sim_scaled', icon: 'heat',
    briefing: 'حرارة غرفة الإلكترونيات عند حد الإغلاق. الكمبيوتر متوقف = المركبة فقدت توازنها.',
    time_to_impact: 25,
    choices: [
      { id: 'shutdown', label: 'إيقاف الرادار والمسح', detail: 'حماية الكمبيوتر.', effects: { power: -10, science: -2 }, correct: true, why: 'الحرارة نزلت — الطاقة الحية ثابتة.' },
      { id: 'less_o2', label: 'تقليل توليد الأوكسجين', detail: 'طاقة للتبريد.', effects: { o2: -28, power: 6 }, correct: false, why: 'CO₂ ارتفع والطاقم دوخة.' }
    ]
  },

  /* -------- زحل / تايتان -------- */
  ring_crossing: {
    id: 'ring_crossing', kind: 'rings', title: 'عبور حلقات زحل',
    titleEn: 'RING CROSSING — ICE DEBRIS', severity: 'critical', source: 'planetary', icon: 'rings',
    briefing: 'الطريق المختصر جنب حافة الحلقات. شظايا جليد بسرعة 20 كم/ث — قطعة صغيرة = انفجار.',
    time_to_impact: 30,
    choices: [
      { id: 'detour', label: 'الالتفاف فوق مستوى الحلقات', detail: 'مسافة أطول.', effects: { fuel: -10, hours: -4 }, correct: true, why: 'المركبة سليمة — 10% وقود بس.' },
      { id: 'cut', label: 'المرور من الحافة', detail: 'توفير وقود.', effects: { dose: 20, power: -25 }, correct: false, why: 'الدرع اتشرخ وخزانات الغاز اتأثرت.' }
    ]
  },

  titan_fog: {
    id: 'titan_fog', kind: 'fog', title: 'ضباب تايتان',
    titleEn: 'LANDING IN FOG — 84 MIN DELAY', severity: 'critical', source: 'planetary', icon: 'fog',
    briefing: 'الرادار لقى صخور جليد حادة تحت المركبة بـ2 كم فقط. الأرض على بعد 84 دقيقة — مستحيل تتحكم.',
    time_to_impact: 20,
    choices: [
      { id: 'autopilot', label: 'الطيار الآلي يبحث عن مستوى', detail: 'Dragonfly style.', effects: { fuel: -15, power: -4 }, correct: true, why: 'هبطت ناعم — 15% وقود الهبوط الاحتياطي.' },
      { id: 'wait', label: 'انتظار تعليمات الأرض', detail: '84 دقيقة.', effects: { fuel: -35, o2: -20 }, correct: false, why: 'مفيش وقت — هبطت على صخر جليد.' }
    ]
  },

  titan_cold: {
    id: 'titan_cold', kind: 'cold', title: 'برد تايتان القارس',
    titleEn: 'CRYO −179°C', severity: 'high', source: 'planetary', icon: 'cold',
    briefing: 'البرد بينزّل حرارة المواسير. الشمس أضعف 100 مرة. الألواح بتنتج 1% فقط.',
    time_to_impact: 30,
    choices: [
      { id: 'rtg', label: 'تجميع الطاقم + حرارة RTG', detail: 'تقليل المساحة المدفأة.', effects: { power: -8, science: -1 }, correct: true, why: 'الطاقة استقرت والمية سليمة.' },
      { id: 'heat_all', label: 'تدفئة كل الأقسام', detail: 'ألواح بديلة.', effects: { power: -35, o2: -10 }, correct: false, why: 'الألواح مش بتنتج — البطارية فرغت.' }
    ]
  },

  gcr_bones: {
    id: 'gcr_bones', kind: 'bones', title: 'فقدان العظام',
    titleEn: 'BONE DENSITY LOSS — OSDR', severity: 'high', source: 'osdr', icon: 'bones',
    briefing: 'سنين في انعدام الجاذبية. أبحاث OSDR بتقول الرائد بيفقد 1–1.5% عظام شهريًا بدون تمارين.',
    time_to_impact: 30,
    choices: [
      { id: 'protocol', label: 'بروتوكول ناسا: ساعتين رياضة + كالسيوم', detail: 'الماء كدرع طبيعي.', effects: { o2: -12, food: -10, dose: -15 }, correct: true, why: 'سلامة الطاقم أولوية — بس الأكل والأوكسجين دفعوا.' },
      { id: 'skip', label: 'إلغاء التمارين', detail: 'توفير موارد.', effects: { o2: 5, food: 5, dose: 20 }, correct: false, why: 'وفّرت شوية موارد — الطاقم مش هيقدر يقف على تايتان.' }
    ]
  },

  /* ============ تداعيات — مشاكل تتراكم من قراراتك واستهلاكك (تُطلق حسب الحالة) ============
     لا تدخل في سحب الأحداث العشوائي — تُطلقها «آلية التداعيات» عند تجاوز عتبة أو نضج راية قرار.
     التبريد: ٣ أيام لعبة بين تكرار نفس التداعية. */
  cascade_water: {
    id: 'cascade_water', kind: 'water', title: 'مخزون الماء حرج', titleEn: 'WATER RESERVE CRITICAL',
    severity: 'high', source: 'bvad_water', icon: 'water',
    briefing: 'كل قرار شربت بيه من المخزون حسبناه — والآن الماء وصل حد الإنذار. لو استهلكنا بنفس المعدل، هنعطش قبل نهاية المهمة بأيام.',
    time_to_impact: 30,
    choices: [
      { id: 'ration', label: 'خطة الجفاف — ترشيد صارم', detail: 'إيقاف ري الدفيئة مؤقتًا وتقليل الاستحمام والغسيل.', effects: { water: 10, food: -6, science: -1 }, correct: true, why: 'الترشيد أنقذ المخزون — بس الدفيئة اتأثرت والأكل قل.' },
      { id: 'mine_ice', label: 'نوبة حفر ثلج طارئة', detail: 'الطاقم كله على مواقع استخراج الجليد.', effects: { water: 14, hours: -6 }, correct: true, why: 'الجليد المحلي رفع المخزون — بس 6 ساعات من يومك ضاعت.' },
      { id: 'ignore', label: 'نكمل بنفس المعدل', detail: 'مفيش وقت إجراءات — الطاقم يشرب عادي.', effects: { water: -15, o2: -6 }, correct: false, why: 'المخزون نزل تحت نقطة الخطر — الجفاف بيفتك بالأداء أولًا.' }
    ]
  },
  cascade_o2: {
    id: 'cascade_o2', kind: 'oxygen', title: 'مخزون الأوكسجين حرج', titleEn: 'OXYGEN RESERVE CRITICAL',
    severity: 'critical', source: 'eclss_o2', icon: 'o2',
    briefing: 'الحساس سجّل هبوطًا متدرجًا — مش تسرب واحد ولا صدمة، ده استنزاف تراكمي: كل مهمة تنفس دفعت من المخزون. لو فضلنا كده، الطاقم هيتنفس بصعوبة بكرة.',
    time_to_impact: 28,
    choices: [
      { id: 'moxie_max', label: 'تشغيل MOXIE بأقصى طاقة', detail: 'تحويل أكسجين ثاني أكسيد الكربون بأقصى معدل.', effects: { power: -14, o2: 12 }, correct: true, why: 'MOXIE بيرفع الأوكسجين — بس الشبكة دفعت الثمن.' },
      { id: 'scrub', label: 'تبديل خراطيش CO₂ والفلاتر', detail: 'كفاءة الاسترجاع ترجع لقريب الأصل.', effects: { o2: 8, hours: -3 }, correct: true, why: 'فلاتر نضيفة = هواء أنضف — بس تمن ساعات الطاقم.' },
      { id: 'curtail', label: 'إلغاء الأنشطة الخارجية والعلم', detail: 'تقليص كل استهلاك غير ضروري للتنفس.', effects: { o2: 5, science: -3, hours: -1 }, correct: true, why: 'قليل الخطوات بيحافظ على كل نفس — بس العلم توقف.' }
    ]
  },
  cascade_food: {
    id: 'cascade_food', kind: 'food', title: 'المطبخ فاضي', titleEn: 'FOOD STORES EXHAUSTED',
    severity: 'high', source: 'bvad_food', icon: 'food',
    briefing: 'الوجبات الباقية تكفي أيام قليلة بالكاد. الدفيئة بتنتج أقل من المطلوب — والمهمة لسه مخلصتش. قرار لازم يتخذ دلوقتي وعليك تبعاته.',
    time_to_impact: 30,
    choices: [
      { id: 'green_boost', label: 'توسيع الدفيئة بطاقة كاملة', detail: 'ضوء ونمو بأقصى معدل — على حساب كل شيء آخر.', effects: { food: 14, water: -6, power: -8 }, correct: true, why: 'الأكل زاد — بس الكهرباء والماء دفعوا الفاتورة.' },
      { id: 'ration', label: 'تقنين صارم 60%', detail: 'الطاقم كله على حصص مخفضة.', effects: { food: 8, o2: -8, hours: -2 }, correct: false, why: 'اكتفيتوا بالقليل — بس الضعف آخد في الأجساد.' },
      { id: 'harvest_emergency', label: 'حصاد مبكر للمحصول', detail: 'نجمع قبل ما ينضج حتى لو أقل قيمة غذائية.', effects: { food: 9, hours: -5, science: -1 }, correct: true, why: 'حصاد مبكر أفضل من معدة فاضية — بس المحصول كان هيبقى أكمل.' }
    ]
  },
  cascade_power: {
    id: 'cascade_power', kind: 'power', title: 'الشبكة على شفا الانهيار', titleEn: 'GRID CRITICAL — LOAD > GENERATION',
    severity: 'high', source: 'sim_scaled', icon: 'power',
    briefing: 'الأحمال تجاوزت الإنتاج طول اليوم الأخير. المحولات سخنة — ولو زودنا حملًا واحدًا صغيرًا، الأنظمة بتفصل. مش مشكلة فشل مفاجئة، دي نتيجة حساباتك اليومية.',
    time_to_impact: 30,
    choices: [
      { id: 'shed', label: 'فصل الأحمال العلمية فورًا', detail: 'دعم الحياة أولًا — العلم بكرة.', effects: { power: 10, science: -2, hours: -1 }, correct: true, why: 'الشبكة اتوازنت — بس التجارب توقفت.' },
      { id: 'rtg', label: 'تحويل جزئي لـ RTG', detail: 'طاقة نووية محدودة ومحترمة.', effects: { power: 12, fuel: -6 }, correct: true, why: 'RTG أنقذ الموقف — بس حرق وقود لا يتعوض.' },
      { id: 'boost', label: 'ضخ أقصى طاقة بلا فصل', detail: 'نكمل بنفس الحمل.', effects: { o2: -10, science: 1 }, correct: false, why: 'رضوض حرارية في المحولات — ودفعة أكسجين ضاعت.' }
    ]
  },
  cascade_dust: {
    id: 'cascade_dust', kind: 'wind', title: 'الألواح مغطاة بغبار متراكم', titleEn: 'DUST ACCUMULATION CRITICAL',
    severity: 'medium', source: 'rems', icon: 'dust',
    briefing: 'التراب اللي نسيناه من أيام بقى طبقة. الإنتاج بينهار يوم بعد يوم — مش عاصفة واحدة ولا حدث مفاجئ، ده إهمال متراكم لازم يتسد.',
    time_to_impact: 35,
    choices: [
      { id: 'clean', label: 'يوم تنظيف كامل للألواح', detail: 'طاقم كامل، فرش وأنظمة نفخ.', effects: { dust: -0.35, hours: -5, power: 6 }, correct: true, why: 'الإنتاج رجع قريب للأصل — بس يومك اتمسح.' },
      { id: 'tilt', label: 'إمالة الألواح للفك الذاتي', detail: 'زاوية أفضل + اهتزاز ميكانيكي.', effects: { dust: -0.18, hours: -2 }, correct: true, why: 'حل وسط محترم — مش كامل بس فعال.' },
      { id: 'accept', label: 'نتعايش مع الخسارة', detail: 'مفيش وقت — نكمل بالإنتاج الناقص.', effects: { power: -6, science: -1 }, correct: false, why: 'التراكم بيفضل يتدهور — الإنتاج هيبقى أسوأ بكرة.' }
    ]
  },
  cascade_fatigue: {
    id: 'cascade_fatigue', kind: 'fog', title: 'إجهاد تراكمي للطاقم', titleEn: 'CREW FATIGUE OVERLOAD',
    severity: 'high', source: 'osdr', icon: 'fog',
    briefing: 'ساعات الشغل التراكمية عدّت الحد الآمن. التركيز بيقل والأخطاء بتزيد — ده مش ضعف شخصية، ده فسيولوجيا بشرية منهكة من قراراتك بجدولة كل ساعة في اليوم.',
    time_to_impact: 30,
    choices: [
      { id: 'rest', label: 'إيقاف كل العمل لهذا اليوم', detail: 'نوم وتعافي كامل — العلم يدفع الثمن.', effects: { hours: -5, dose: -6, science: -2 }, correct: true, why: 'الجسد اتعافى — بس يوم كامل من العلم ضاع.' },
      { id: 'stimulants', label: 'منبهات مركزة', detail: 'كافيين وجرعات تعديل — بذكاء.', effects: { hours: 5, food: -4, dose: 2 }, correct: false, why: 'قمتم باليوم — بس الجسد سيدفع لاحقًا.' },
      { id: 'push', label: 'شد حيل واكمل', detail: 'نكمل بنفس المعدل — الطاقم متعوّد.', effects: { o2: -6, science: 1 }, correct: false, why: 'خطأ حسابي صغير ضاعف استهلاك الهواء — والطاقم مرهق زيادة.' }
    ]
  },
  cascade_dose: {
    id: 'cascade_dose', kind: 'radiation', title: 'تقييم طبي إلزامي', titleEn: 'MEDICAL REVIEW — DOSE SPIKE',
    severity: 'high', source: 'radlab', icon: 'sun',
    briefing: 'العدادات سجّلت جرعة عالية في آخر 24 ساعة. مش عاصفة ولا حدث واحد — ده تراكم كل دقيقة قضيتموها بدراع مفتوح. البروتوكول يلزم بتقييم فوري.',
    time_to_impact: 30,
    choices: [
      { id: 'scan', label: 'أشعة وفحص كامل للطاقم', detail: 'تصوير دم وقراءة عداد الفرد لكل رائد.', effects: { hours: -3, dose: -8 }, correct: true, why: 'التقييم المبكر يلقط الأضرار قبل ما تتفاقم.' },
      { id: 'shelter', label: 'توريط باقي اليوم في الملجأ', detail: 'صفر تعرض للإشعاع لبقية اليوم.', effects: { hours: -6, science: -1, dose: -10 }, correct: true, why: 'الإشعاع مش بيهزر — الوقاية هي العلاج الوحيد.' },
      { id: 'monitor', label: 'رصد ومواصلة العمل', detail: 'العداد شغال — نكمل.', effects: { dose: 10 }, correct: false, why: 'الجرعة زادت فوق — والجسم مبيصلحش بسرعة.' }
    ]
  },
  cascade_solar: {
    id: 'cascade_solar', kind: 'power', title: 'ضرر حرج في الألواح', titleEn: 'SOLAR ARRAY CRITICAL DAMAGE',
    severity: 'high', source: 'sim_scaled', icon: 'power',
    briefing: 'تلف تراكمي: غبار، شظايا، حرارة — الألواح بقت تنتج أقل بكتير. المشكلة مش يوم واحد ولا ضربة واحدة، ده كل الأيام اللي فاتت مجتمعة.',
    time_to_impact: 30,
    choices: [
      { id: 'repair', label: 'حملة إصلاح شاملة', detail: 'تبديل خلايا وأسلاك — شغل معماري.', effects: { solar: -0.25, hours: -7, power: 4 }, correct: true, why: 'الإصلاح أعاد 25% من القدرة — بس 7 ساعات ضاعت.' },
      { id: 'panel_swap', label: 'تدوير الخلايا الاحتياطية', detail: 'خلايا احتياطية بدل التالفة.', effects: { solar: -0.15, science: -1, hours: -3 }, correct: true, why: 'حل وسط ذكي — مش كل الخلايا جديدة بس اللعب استمر.' },
      { id: 'ignore', label: 'الإنتاج الناقص يكفي', detail: 'نكمل — مش مشكلة.', effects: { power: -8, science: -2 }, correct: false, why: 'الضرر بيكبر بالإهمال — والإنتاج بيفضل ينزل.' }
    ]
  },

  cascade_maintenance: {
    id: 'cascade_maintenance', kind: 'power', title: 'المعدات تدفع ثمن التسرّع', titleEn: 'MAINTENANCE DEBT DUE',
    severity: 'high', source: 'sim_scaled', icon: 'power',
    briefing: 'الأيام الممتلئة بقرارات مستعجلة تركت أثرها: أختام مرتخية، أسلاك مسخنة، فلتر مشدود. المعدات بتطالب بفاتورتها — لو تجاهلتها دلوقتي، هتتضاعف.',
    time_to_impact: 30,
    choices: [
      { id: 'inspect', label: 'فحص شامل للأنظمة', detail: 'مراجعة كل الوحدات واحدة واحدة.', effects: { hours: -4, power: 6, o2: 2 }, correct: true, why: 'الفحص لقى المشاكل مبكر — والإصلاح أسهل بكتير.' },
      { id: 'sinter', label: 'صهر ريجوليث للأستعانة به في الأختام', detail: 'صهر محلي لتثبيت الأختام والوصلات.', effects: { regolith: -2, solar: -0.08, hours: -2, o2: 3 }, correct: true, why: 'موارد محلية حلّت المشكلة بلا استيراد.' },
      { id: 'postpone', label: 'بكرة نشوفها', detail: 'نكمل — المعدات هتتحمل شوية كمان.', effects: { solar: 0.1, o2: -6 }, correct: false, why: 'التأجيل ضاعفه: تلف أسرع وتسريب أوسع.' }
    ]
  },
  isolation: {
    id: 'isolation', kind: 'comms', title: 'العزلة الطويلة',
    titleEn: 'ISOLATION — 6 YEARS FROM HOME', severity: 'medium', source: 'osdr', icon: 'comms',
    briefing: 'سنين بلا رد فوري من الأرض. قرارات لازم تاخدها لوحدك للأبد.',
    time_to_impact: 30,
    choices: [
      { id: 'plan', label: 'خطط للمستقبل بدون انتظار', detail: 'استقلالية كاملة.', effects: { hours: -4, food: -5 }, correct: true, why: 'الاستقلالية هي الحل — بس بتستهلك موارد.' },
      { id: 'anxious', label: 'اسأل الأرض كل يوم', detail: '84 دقيقة تنتظر.', effects: { o2: -14, hours: -6 }, correct: false, why: 'الانتظار بيستهلك الموارد والطاقة النفسية.' }
    ]
  }
};

/* ------------------------------------------------------------------ ألوان */
const PALETTE = {
  bg: '#05070c', panel: 'rgba(10,16,26,.9)', line: 'rgba(120,180,230,.18)',
  txt: '#eaf0fc', dim: '#8497b8',
  cyan: '#4dd9ff', amber: '#ffb347', red: '#ff5f6d',
  green: '#45e08a', purple: '#9b7bff'
};

/* ------------------------------------------------------------------ توليد المسار */
function missionCost(m) {
  // تقدير اللعبة: تكلفة نسبية بسيطة لغرض الـUI
  return {
    cost: Math.round(1.2e9 * m.difficulty * (1 + m.travel_days / 400) / 1e8) / 10,
    stages: m.difficulty <= 2 ? 4 : m.difficulty <= 4 ? 5 : 6
  };
}
