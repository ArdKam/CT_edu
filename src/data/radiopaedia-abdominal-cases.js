(function (root, factory) {
  'use strict';
  const base = (typeof module !== 'undefined' && module.exports)
    ? require('./guided-cases.js')
    : (root && root.CTEduGuidedCases);
  const data = factory(base);
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  if (root) root.CTEduGuidedCases = data;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const CATEGORY = Object.freeze({
    gastrointestinal: { en: 'Gastrointestinal', fa: 'گوارش' },
    'hepatobiliary-pancreatic': { en: 'Hepatobiliary & pancreas', fa: 'کبد، صفرا و پانکراس' },
    'renal-urinary': { en: 'Renal & urinary', fa: 'کلیه و مجاری ادراری' },
    'adrenal-endocrine': { en: 'Adrenal & endocrine', fa: 'آدرنال و غدد درون‌ریز' },
    'female-reproductive-pelvic': { en: 'Female reproductive & pelvis', fa: 'تولیدمثل زنان و لگن' },
    'male-genitourinary': { en: 'Male genitourinary', fa: 'دستگاه ادراری‌ـ‌تناسلی مردان' },
    'peritoneal-retroperitoneal-vascular': { en: 'Peritoneum, retroperitoneum & vessels', fa: 'صفاق، رتروپریتوئن و عروق' }
  });

  // Candidate intake is intentionally not represented as exhaustive. searchOrder is
  // the recorded order within each targeted, organ-system-specific intake pass.
  // Only numeric case/study identifiers encountered in indexed source metadata are used.
  const rows = [
    { id:'perforated-appendicitis-198206', category:'gastrointestinal', searchOrder:1, level:'foundations', caseId:'198206', sourceTitle:'Perforated appendicitis', titleEn:'Right lower quadrant · CT', titleFa:'ربع تحتانی راست شکم · CT', focusEn:'the appendix, right lower quadrant fat, adjacent bowel and any extraluminal gas', focusFa:'آپاندیس، چربی ربع تحتانی راست، روده مجاور و احتمال وجود گاز خارج‌روده‌ای', tags:['appendix','right lower quadrant','bowel wall','extraluminal gas'], note:'CT findings described on the indexed case page; live case page and images not opened in this run.' },
    { id:'sigmoid-diverticulitis-microperforation-74870', category:'gastrointestinal', searchOrder:2, level:'intermediate', caseId:'74870', sourceTitle:'Sigmoid diverticulitis with microperforation', titleEn:'Left lower quadrant and colon · CT', titleFa:'ربع تحتانی چپ و کولون · CT', focusEn:'segmental colonic wall change, pericolic fat and small extraluminal gas foci', focusFa:'تغییرات دیواره کولون، چربی اطراف کولون و کانون‌های کوچک گاز خارج‌روده‌ای', tags:['sigmoid colon','pericolic fat','extraluminal gas','inflammation'], note:'Indexed case information describes CT image stacks in axial, coronal and sagittal planes; no live image-load check.' },
    { id:'post-appendectomy-collection-25921', category:'gastrointestinal', searchOrder:3, level:'intermediate', caseId:'25921', sourceTitle:'Post appendectomy collection', titleEn:'Postoperative right lower quadrant · CT', titleFa:'ربع تحتانی راست پس از جراحی · CT', focusEn:'postoperative anatomy, the location and margins of a fluid-density focus, and surrounding inflammatory change', focusFa:'آناتومی پس از جراحی، محل و حدود کانون با دانسیته مایع و تغییرات التهابی اطراف', tags:['postoperative','right lower quadrant','fluid collection','complication'], note:'CT findings reported in indexed case content; the external page and image stack were not opened live.' },
    { id:'appendicitis-postoperative-ileus-99249', category:'gastrointestinal', searchOrder:4, level:'intermediate', caseId:'99249', studyId:'120709', sourceTitle:'Acute appendicitis and post-operative ileus', titleEn:'Bowel calibre after surgery · CT', titleFa:'کالیبر روده پس از جراحی · CT', focusEn:'bowel calibre, distribution of gas, transition points and the distinction between diffuse and focal dilatation', focusFa:'کالیبر روده، توزیع گاز، نقاط تغییر کالیبر و افتراق اتساع منتشر از موضعی', tags:['small bowel','large bowel','postoperative','ileus','transition point'], note:'The CT study identifier 120709 was found in case metadata; a separate study 120710 is radiography and was not used. Direct URL not live-tested.' },
    { id:'sigmoid-diverticulitis-177978', category:'gastrointestinal', searchOrder:5, level:'foundations', caseId:'177978', sourceTitle:'Sigmoid colonic diverticulitis', titleEn:'Colonic segment and surrounding fat · CT', titleFa:'بخش کولون و چربی اطراف · CT', focusEn:'the affected colonic segment, wall thickness, pericolic fat and any collection or obstruction', focusFa:'بخش درگیر کولون، ضخامت دیواره، چربی اطراف و احتمال وجود مجموعه یا انسداد', tags:['sigmoid colon','wall thickening','pericolic fat','inflammation'], note:'The indexed case includes CT findings alongside another modality; the original CT series was not opened live.' },

    { id:'acute-pancreatitis-11083', category:'hepatobiliary-pancreatic', searchOrder:1, level:'intermediate', caseId:'11083', sourceTitle:'Acute pancreatitis', titleEn:'Pancreas and adjacent tissues · CT', titleFa:'پانکراس و بافت‌های مجاور · CT', focusEn:'pancreatic contour and enhancement, peripancreatic fat, fluid and nearby vascular relationships', focusFa:'شکل و enhancement پانکراس، چربی اطراف پانکراس، مایع و ارتباط با عروق مجاور', tags:['pancreas','peripancreatic fat','fluid','vascular relationships'], note:'CT is identified in indexed case content; enhancement and actual image loading were not assessed live.' },
    { id:'pancreatic-mass-infiltrative-164871', category:'hepatobiliary-pancreatic', searchOrder:2, level:'advanced', caseId:'164871', studyId:'134067', sourceTitle:'Pancreatic adenocarcinoma - malignant large bowel obstruction', titleEn:'Pancreas, bowel and retroperitoneum · CT', titleFa:'پانکراس، روده و رتروپریتوئن · CT', focusEn:'a pancreatic-region mass, adjacent bowel calibre, vascular contact and the extent of retroperitoneal involvement', focusFa:'توده در ناحیه پانکراس، کالیبر روده مجاور، تماس عروقی و گستره درگیری رتروپریتوئن', tags:['pancreas','large bowel','retroperitoneum','vascular contact','renal hilum','adrenal'], note:'CT study ID 134067 was present in indexed case metadata. The direct study URL is constructed from those identifiers, not live-tested.' },
    { id:'hepatic-abscess-47865', category:'hepatobiliary-pancreatic', searchOrder:3, level:'intermediate', caseId:'47865', sourceTitle:'Hepatic abscess', titleEn:'Liver parenchyma and fluid-containing focus · CT', titleFa:'پارانشیم کبد و کانون مایع‌دار · CT', focusEn:'the number and distribution of hepatic lesions, their margins, surrounding parenchyma and interval change if follow-up is shown', focusFa:'تعداد و توزیع ضایعات کبد، حدود آن‌ها، پارانشیم اطراف و تغییرات زمانی در صورت وجود پیگیری', tags:['liver','focal lesion','fluid','follow-up imaging'], note:'Indexed case content describes CT at presentation and follow-up; neither series was loaded in a live viewer here.' },
    { id:'hepatic-abscess-171645', category:'hepatobiliary-pancreatic', searchOrder:4, level:'intermediate', caseId:'171645', sourceTitle:'Hepatic abscess', titleEn:'Liver focal lesion and adjacent anatomy · CT', titleFa:'ضایعه کانونی کبد و آناتومی مجاور · CT', focusEn:'the CT appearance of a focal liver abnormality and the relationship to adjacent biliary and abdominal structures', focusFa:'ظاهر CT یک ناهنجاری کانونی کبد و ارتباط آن با ساختارهای صفراوی و شکمی مجاور', tags:['liver','focal lesion','biliary tract','adjacent organs'], note:'The indexed case includes ultrasound and a CT follow-up examination; live CT image loading was not checked.' },

    { id:'renal-cell-carcinoma-cystic-191505', category:'renal-urinary', searchOrder:1, level:'intermediate', caseId:'191505', sourceTitle:'Renal cell carcinoma with cystic changes', titleEn:'Renal mass morphology · CT', titleFa:'مورفولوژی توده کلیه · CT', focusEn:'solid and fluid-density components, enhancement, the renal contour and extension beyond the kidney', focusFa:'اجزای جامد و با دانسیته مایع، enhancement، کانتور کلیه و گسترش خارج از کلیه', tags:['kidney','renal mass','cystic change','enhancement'], note:'CT is stated in indexed case content; study identity and live image loading were not verified.' },
    { id:'renal-abscess-79763', category:'renal-urinary', searchOrder:2, level:'intermediate', caseId:'79763', sourceTitle:'Renal abscess', titleEn:'Renal parenchyma and perinephric space · CT', titleFa:'پارانشیم کلیه و فضای اطراف کلیه · CT', focusEn:'renal parenchymal appearance, any focal fluid-density region, perinephric extension and obstruction', focusFa:'ظاهر پارانشیم کلیه، کانون با دانسیته مایع، گسترش اطراف کلیه و انسداد احتمالی', tags:['kidney','perinephric space','fluid collection','infection'], note:'CT findings are described in indexed case content; actual images were not opened in this run.' },
    { id:'pyelonephritis-renal-perinephric-abscess-151692', category:'renal-urinary', searchOrder:3, level:'advanced', caseId:'151692', sourceTitle:'Acute pyelonephritis with renal and perinephric abscesses', titleEn:'Renal parenchyma and perinephric tissues · CT', titleFa:'پارانشیم کلیه و بافت‌های اطراف · CT', focusEn:'renal enhancement pattern, focal parenchymal abnormalities, perinephric change and collecting-system dilatation', focusFa:'الگوی enhancement کلیه، ناهنجاری‌های کانونی پارانشیم، تغییرات اطراف کلیه و اتساع سیستم جمع‌کننده', tags:['kidney','renal enhancement','perinephric space','collecting system'], note:'CT is described in indexed case content; the source viewer and individual images were not loaded live.' },
    { id:'renal-cell-carcinoma-99963', category:'renal-urinary', searchOrder:4, level:'advanced', caseId:'99963', sourceTitle:'Renal cell carcinoma', titleEn:'Renal mass enhancement and extent · CT', titleFa:'Enhancement و گستره توده کلیوی · CT', focusEn:'the renal lesion across available contrast phases, renal vein, collecting system and adjacent structures', focusFa:'ضایعه کلیه در فازهای موجود کنتراست، ورید کلیوی، سیستم جمع‌کننده و ساختارهای مجاور', tags:['kidney','renal mass','contrast phases','renal vein'], note:'Multiphase CT is described in indexed case information; no live image-load check was completed.' },

    { id:'adrenal-myelolipoma-83258', category:'adrenal-endocrine', searchOrder:1, level:'foundations', caseId:'83258', sourceTitle:'Adrenal myelolipoma', titleEn:'Adrenal lesion composition · CT', titleFa:'ترکیب ضایعه آدرنال · CT', focusEn:'lesion attenuation, macroscopic fat, margins, side of origin and relationship to the kidney and liver', focusFa:'دانسیته ضایعه، چربی ماکروسکوپی، حدود، سمت منشأ و ارتباط با کلیه و کبد', tags:['adrenal gland','fat attenuation','retroperitoneum','renal upper pole'], note:'CT and a fat-containing adrenal lesion are described in indexed case content; live viewer not checked.' },
    { id:'adrenal-hemangioma-33078', category:'adrenal-endocrine', searchOrder:2, level:'advanced', caseId:'33078', sourceTitle:'Adrenal hemangioma', titleEn:'Adrenal lesion attenuation · CT', titleFa:'دانسیته ضایعه آدرنال · CT', focusEn:'attenuation before and after contrast, enhancement across phases, lesion margins and internal calcification if visible', focusFa:'دانسیته پیش و پس از کنتراست، enhancement در فازهای مختلف، حدود ضایعه و کلسیفیکاسیون داخلی در صورت مشاهده', tags:['adrenal gland','attenuation','contrast phases','calcification'], note:'Non-contrast, arterial and delayed CT phases are described in indexed case content; no live image-load check.' },

    { id:'ovarian-dermoid-9862', category:'female-reproductive-pelvic', searchOrder:1, level:'intermediate', caseId:'9862', sourceTitle:'Ovarian dermoid', titleEn:'Adnexal mass composition · CT', titleFa:'ترکیب توده آدنکس · CT', focusEn:'the adnexal origin, fat and soft-tissue components, calcification, mass effect and any complication visible on CT', focusFa:'منشأ آدنکس، اجزای چربی و بافت نرم، کلسیفیکاسیون، اثر فشاری و عوارض قابل مشاهده در CT', tags:['ovary','adnexa','fat attenuation','calcification','pelvis'], note:'CT findings including low attenuation are described in indexed case content. Similar ultrasound/MRI-only candidates were excluded.' },
    { id:'pelvic-adhesions-232293', category:'female-reproductive-pelvic', searchOrder:2, level:'advanced', caseId:'232293', sourceTitle:'Pelvic adhesions', titleEn:'Pelvic soft tissues and postoperative change · CT', titleFa:'بافت نرم لگن و تغییرات پس از جراحی · CT', focusEn:'pelvic organ relationships, tethering or displacement, fluid, bowel involvement and limitations of CT for thin adhesions', focusFa:'روابط اندام‌های لگن، کشیدگی یا جابه‌جایی، مایع، درگیری روده و محدودیت CT در چسبندگی‌های ظریف', tags:['pelvis','postoperative','bowel','soft tissues'], note:'A CT series including sagittal portal-venous images is described in indexed case content; viewer not checked live.' },

    { id:'zinner-syndrome-191413', category:'male-genitourinary', searchOrder:1, level:'advanced', caseId:'191413', sourceTitle:'Zinner syndrome', titleEn:'Male pelvis and urinary tract anatomy · CT', titleFa:'آناتومی لگن مردان و مجاری ادراری · CT', focusEn:'renal presence and position, pelvic cystic structures, seminal-vesicle region and which relationships require MRI correlation', focusFa:'وجود و موقعیت کلیه، ساختارهای کیستیک لگن، ناحیه وزیکول سمینال و روابطی که به تطبیق با MRI نیاز دارند', tags:['male pelvis','seminal vesicle','urinary tract','renal agenesis','MRI correlation'], note:'CT images and MRI are both described. CT alone may not establish all ductal relationships; MRI correlation is noted.' },
    { id:'prostate-metastatic-disease-77724', category:'male-genitourinary', searchOrder:2, level:'intermediate', caseId:'77724', sourceTitle:'Sclerotic bone metastases from prostatic cancer', titleEn:'Prostate-related skeletal disease · CT', titleFa:'درگیری اسکلتی مرتبط با پروستات · CT', focusEn:'the distribution and morphology of sclerotic osseous lesions, axial skeleton coverage and the limits of inferring a primary source from CT alone', focusFa:'توزیع و مورفولوژی ضایعات اسکلروتیک استخوان، پوشش اسکلت محوری و محدودیت تعیین منشأ اولیه تنها از CT', tags:['prostate','bone windows','sclerotic lesions','metastatic disease'], note:'CT bone-window images are described in indexed case content; no live viewer/image-load test was completed.' },

    { id:'peritoneal-disease-7627', category:'peritoneal-retroperitoneal-vascular', searchOrder:1, level:'advanced', caseId:'7627', sourceTitle:'Ovarian cancer with peritoneal carcinomatosis', titleEn:'Peritoneal masses and ascites · CT', titleFa:'توده‌های صفاقی و آسیت · CT', focusEn:'the distribution of peritoneal soft-tissue deposits, ascites, omental change and whether the primary organ is directly visible', focusFa:'توزیع رسوبات بافت نرم صفاقی، آسیت، تغییرات امنتوم و اینکه آیا اندام اولیه مستقیماً دیده می‌شود', tags:['peritoneum','ascites','omentum','pelvis','primary site uncertainty'], note:'CT is described for peritoneal disease and ascites; the primary ovary was not seen in the indexed description, so primary-site certainty should not be overstated.' },
    { id:'abdominal-aortic-aneurysm-221525', category:'peritoneal-retroperitoneal-vascular', searchOrder:2, level:'advanced', caseId:'221525', sourceTitle:'Abdominal aorta aneurysm with thrombosis', titleEn:'Aortic contour and major abdominal vessels · CT', titleFa:'کانتور آئورت و عروق اصلی شکم · CT', focusEn:'maximum aortic diameter, mural thrombus, longitudinal extent, iliac involvement and signs of leak or rupture', focusFa:'حداکثر قطر آئورت، ترومبوز جداری، گستره طولی، درگیری ایلیاک و علائم نشت یا پارگی', tags:['abdominal aorta','aneurysm','mural thrombus','iliac arteries','vascular emergency'], note:'CT findings describing an aneurysm with thrombus and iliac extension appear in indexed case content; live viewer not checked.' }
  ];

  function makeVerification(row) {
    return {
      status: 'partially_verified',
      checkedAt: '2026-10-14',
      searchOrder: row.searchOrder,
      searchMethod: 'Targeted, organ-system-specific Radiopaedia search; selection order is recorded within category. This is not an exhaustive review of all Radiopaedia cases.',
      checks: {
        sourcePage: 'Indexed case-page metadata located; live page could not be opened in this run.',
        ctImages: 'CT modality or CT image series is described in indexed case content; actual images were not loaded in a live viewer.',
        directViewer: row.studyId
          ? 'Numeric case and CT study identifiers were found in indexed case metadata; the generated direct URL was not live-tested.'
          : 'No suitable study identifier was extracted during this intake pass; retain the original-case link fallback.',
        imagesLoaded: 'not_checked_in_live_browser',
        categorization: 'Primary system chosen from the reported CT anatomy; secondary tags record related anatomy/topics.',
        attributionAndRights: 'Original case link and source attribution retained; current terms and item-specific rights review remain open.'
      },
      notes: row.note
    };
  }

  function makeCase(row) {
    const category = CATEGORY[row.category];
    const article = row.articleUrl ? { articleUrl: row.articleUrl, articleTitle: row.articleTitle } : {};
    const viewerUrl = row.studyId
      ? 'https://radiopaedia.org/cases/' + encodeURIComponent(row.caseId) + '/studies/' + encodeURIComponent(row.studyId) + '?lang=us'
      : undefined;
    const focus = row.focusEn;
    const focusFa = row.focusFa;
    return {
      id: row.id,
      level: row.level || 'intermediate',
      category: row.category,
      categoryLabel: { en: category.en, fa: category.fa },
      tags: row.tags.slice(),
      modality: 'CT',
      region: 'abdomen',
      title: { en: row.titleEn, fa: row.titleFa },
      summary: {
        en: 'Describe the visible anatomy and attenuation first; then evaluate adjacent structures and relevant complications.',
        fa: 'ابتدا آناتومی قابل مشاهده و دانسیته را توصیف کن؛ سپس ساختارهای مجاور و عوارض مرتبط را بررسی کن.'
      },
      clinicalContext: {
        en: 'Independent teaching scenario: review abdominal or pelvic CT with a systematic approach to the named region. This is not the source patient’s history.',
        fa: 'سناریوی مستقل آموزشی: CT شکم یا لگن را با رویکردی سیستماتیک در ناحیه نام‌برده مرور کن. این شرح‌حال بیمار منبع نیست.'
      },
      source: Object.assign({
        title: row.sourceTitle,
        caseId: row.caseId,
        url: 'https://radiopaedia.org/cases/' + encodeURIComponent(row.caseId) + '?lang=us',
        ...(viewerUrl ? { viewerUrl: viewerUrl } : {}),
        citation: 'Radiopaedia.org. ' + row.sourceTitle + '. Case ' + row.caseId + '. Accessed 14 October 2026.'
      }, article),
      objectives: {
        en: [
          'Localise the finding and describe the structure: ' + focus + '.',
          'Characterise morphology, attenuation/enhancement and the relationship to adjacent anatomy.',
          'Assess relevant complications, disease extent and limitations of the available CT examination.',
          'Write an evidence-proportionate impression and identify any important uncertainty.'
        ],
        fa: [
          'یافته را محل‌یابی و این ساختار را توصیف کن: ' + focusFa + '.',
          'مورفولوژی، دانسیته یا enhancement و ارتباط با آناتومی مجاور را مشخص کن.',
          'عوارض مرتبط، گستره درگیری و محدودیت‌های CT موجود را بررسی کن.',
          'Impression متناسب با شواهد بنویس و عدم قطعیت مهم را مشخص کن.'
        ]
      },
      rubric: [
        {
          id: 'localisation',
          title: { en: 'Anatomical localisation', fa: 'محل‌یابی آناتومیک' },
          cue: { en: 'Identify the organ/region and state the key distribution: ' + focus + '.', fa: 'اندام یا ناحیه و توزیع اصلی یافته را مشخص کن: ' + focusFa + '.' }
        },
        {
          id: 'characterisation',
          title: { en: 'Morphology and attenuation', fa: 'مورفولوژی و دانسیته' },
          cue: { en: 'Describe margins, density/enhancement, internal components and relevant adjacent structures without assuming a diagnosis.', fa: 'حدود، دانسیته یا enhancement، اجزای داخلی و ساختارهای مجاور را بدون پیش‌فرض تشخیصی توصیف کن.' }
        },
        {
          id: 'extent-complications',
          title: { en: 'Extent and complications', fa: 'گستره و عوارض' },
          cue: { en: 'Check for extension, obstruction, fluid, gas, vascular involvement or other complications appropriate to this region.', fa: 'گسترش، انسداد، مایع، گاز، درگیری عروقی یا عوارض متناسب با این ناحیه را بررسی کن.' }
        },
        {
          id: 'impression',
          title: { en: 'Evidence-based impression', fa: 'جمع‌بندی مبتنی بر شواهد' },
          cue: { en: 'Prioritise the key CT findings, note technical or modality limits, and avoid claiming features that are not demonstrated.', fa: 'یافته‌های کلیدی CT را اولویت‌بندی کن، محدودیت فنی یا مدالیته را ذکر کن و ویژگی مشاهده‌نشده را ادعا نکن.' }
        }
      ],
      disclaimer: {
        fa: 'این چک‌لیست مستقل و آموزشی است؛ تفسیر تأییدشدهٔ بیمار منبع نیست.',
        en: 'This independently authored checklist is for education only and is not a validated interpretation of the source patient.'
      },
      verification: makeVerification(row)
    };
  }

  function normalizeBase(item, index) {
    const copy = Object.assign({}, item);
    copy.category = item.category || 'gastrointestinal';
    copy.categoryLabel = CATEGORY[copy.category] || CATEGORY.gastrointestinal;
    copy.tags = Array.isArray(item.tags) ? item.tags.slice() : (
      item.id.indexOf('small-bowel') !== -1 || item.id.indexOf('bowel') !== -1 || item.id.indexOf('colon') !== -1
        ? ['bowel', 'obstruction', 'abdomen']
        : ['abdomen', 'gastrointestinal']
    );
    copy.verification = item.verification || {
      status: 'partially_verified',
      checkedAt: '2026-10-14',
      searchOrder: index + 1,
      searchMethod: 'Pre-existing guided-case record retained without replacing its source metadata.',
      checks: {
        sourcePage: 'Existing source-page URL preserved; not live-tested in this change.',
        ctImages: 'The existing exercise is designated CT; source image loading was not rechecked during this intake.',
        directViewer: item.source.viewerUrl
          ? 'Existing direct viewer reference retained; not re-tested against the live Radiopaedia viewer.'
          : 'No direct study identifier is stored in the existing record; original source page fallback retained.',
        imagesLoaded: 'not_checked_in_live_browser',
        categorization: 'Assigned to the gastrointestinal system from the existing case description.',
        attributionAndRights: 'Existing source citation preserved; current terms and item-specific rights review remain open.'
      },
      notes: item.source.viewerUrl
        ? 'Existing working-example URL is retained but was not independently image-load-tested in this change.'
        : 'Original reference case retained; a direct viewer identifier was not added without evidence.'
    };
    return copy;
  }

  const added = rows.map(makeCase);
  const original = base && typeof base.list === 'function' ? base.list().map(normalizeBase) : [];
  const all = original.concat(added);
  const byId = new Map();
  all.forEach(function (item) {
    if (byId.has(item.id)) throw new Error('Duplicate guided case ID: ' + item.id);
    byId.set(item.id, item);
  });

  return Object.freeze({
    schemaVersion: 2,
    categories: CATEGORY,
    intake: Object.freeze({
      asOf: '2026-10-14',
      orderRule: 'searchOrder is the recorded order within each targeted organ-system search pass; the candidate intake is not exhaustive.',
      addedCount: added.length
    }),
    list: function () { return all.slice(); },
    getById: function (id) { return byId.get(id) || null; }
  });
}));
