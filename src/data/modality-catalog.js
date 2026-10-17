(function (root, factory) {
  'use strict';
  const catalog = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  if (root) root.CTEduModalityCatalog = catalog;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const entries = [
    {
      id:'abdomen-ct',shortLabel:'CT',modality:'CT',region:'abdomen',status:'available',contentAvailable:true,
      titleFa:'CT شکم',titleEn:'Abdominal CT',
      subtitleFa:'آناتومی مقطعی · حجم آموزشی',subtitleEn:'Cross-sectional anatomy · teaching volume',
      summaryFa:'تنها مسیر داده‌محور فعلی: پیمایش محوری، کرونال و ساژیتال، بررسی قطعه‌بندی و تمرین یادآوری فعال.',
      summaryEn:'The only data-backed path today: axial, coronal and sagittal navigation, segmentation inspection, and active-recall practice.',
      detailFa:'نمونهٔ فعلی مبتنی بر SPL Abdominal Atlas است. هندسه و شدت‌های منبع حفظ می‌شوند، اما کالیبراسیون HU مستقل تأیید نشده و بازبینی تخصصی/حقوق داده هنوز از دروازه‌های انتشار است.',
      detailEn:'The current teaching prototype uses the SPL Abdominal Atlas. Source geometry and intensity values are preserved, but HU calibration is not independently verified and specialist/legal review remains a release gate.',
      objectivesFa:['جهت‌یابی در سه صفحهٔ متعامد','شناخت ساختارهای قطعه‌بندی‌شده در برش‌های موجود','تمرین شناسایی با بازخورد آموزشی'],
      objectivesEn:['Navigate three orthogonal planes','Inspect segmented anatomy on available slices','Practice identification with educational feedback'],
      gatesFa:['تکمیل بازبینی تخصصی هم‌ترازی و جهت‌یابی','تأیید شرایط استفاده از بسته و اجزای ثالث','آزمون دستگاه واقعی و دسترس‌پذیری'],
      gatesEn:['Finish specialist review of alignment and orientation','Confirm exact package and third-party terms','Complete real-device and accessibility review'],
      sourceName:'SPL Abdominal Atlas',sourceUrl:'https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html',
      sourceNoteFa:'تصاویر در نسخهٔ فعلی موجودند؛ این به معنی تأیید بالینی یا بسته‌شدن همهٔ دروازه‌های انتشار نیست.',
      sourceNoteEn:'Images are present in the prototype; this does not mean the module is clinically validated or all release gates are closed.'
    },
    {
      id:'abdomen-ct-series',shortLabel:'CT',modality:'CT',region:'abdomen',status:'candidate',contentAvailable:false,pageUrl:'./abdomen-series.html',
      titleFa:'شکم و لگن · سه مجموعهٔ تصویری',titleEn:'Abdomen & pelvis · 3 image stacks',
      subtitleFa:'۶۴۸ تصویر مستقل · منبع Wikimedia Commons',subtitleEn:'648 separate images · Wikimedia Commons',
      summaryFa:'سه توالیِ ازپیش‌رندرشده: ۳۲۰ محوری، ۱۵۰ کرونال و ۱۷۸ ساژیتال؛ نماها مختصات مشترک ندارند.',
      summaryEn:'Three pre-rendered stacks: 320 axial, 150 coronal and 178 sagittal images; the views do not share verified coordinates.',
      detailFa:'این مجموعه شامل ۶۴۸ تصویر ثابت در سه توالی جداگانه است. صفحهٔ منبع ضخامت ۳ میلی‌متر و مجوز CC0 1.0 را اعلام می‌کند. تصاویر، بازسازی‌های زنده از یک حجم DICOM نیستند؛ هندسه، فاصلهٔ درون‌صفحه‌ای، مختصات بیمار و هم‌ترازی بین نماها تأیید نشده‌اند. فایل‌ها هنگام مشاهده از Wikimedia بارگیری می‌شوند.',
      detailEn:'This set contains 648 static images across three separate sequences. The source page reports 3 mm slice thickness and states CC0 1.0. These are not live reformats of one DICOM volume; geometry, in-plane spacing, patient-space coordinates and cross-plane alignment are not verified. Images load from Wikimedia on demand.',
      objectivesFa:['مرور تصاویر طبیعی در سه جهت مستقل','پیمایش هر توالی و مقایسهٔ ظاهری نماها','تمایز بین توالی‌های تصویری و بازسازی واقعی حجم'],
      objectivesEn:['Review normal anatomy in three independent orientations','Navigate each stack and compare the separate views visually','Distinguish image sequences from true volumetric reconstruction'],
      gatesFa:['اعتبارسنجی زندهٔ فایل‌ها، ترتیب و ابعاد','بازبینی مستقل جهت‌یابی و کیفیت آموزشی','تأیید منبع و مرور تخصصی پیش از انتشار آموزشی رسمی'],
      gatesEn:['Verify live image availability, ordering and dimensions','Independently review orientation and educational quality','Complete source and specialist review before formal teaching release'],
      sourceName:'Wikimedia Commons · Mikael Häggström, M.D.',sourceUrl:'https://commons.wikimedia.org/wiki/Scrollable_computed_tomography_images_of_a_normal_abdomen_and_pelvis',
      sourceNoteFa:'صفحهٔ منبع و دسته‌بندی‌ها سه توالی را با مجوز CC0 فهرست می‌کنند. این پیش‌نمایش تأیید بالینی یا ابزار تشخیصی نیست.',
      sourceNoteEn:'The Commons source and categories list all three stacks under CC0. This preview is not clinically validated and is not a diagnostic tool.'
    },
    {
      id:'thorax-ct-series',shortLabel:'CT',modality:'CT',region:'thorax',status:'candidate',contentAvailable:false,pageUrl:'./preview/thorax-series.html',
      titleFa:'قفسهٔ سینهٔ طبیعی · توالی‌های تصویری',titleEn:'Normal thorax · image stacks',
      subtitleFa:'۲۶۶ تصویر ثابت · منبع Wikimedia Commons',subtitleEn:'266 static images · Wikimedia Commons',
      summaryFa:'۱۰۶ محوری، ۶۷ کرونال و ۹۳ ساژیتال؛ پیش‌نمایش تصاویر منبع، نه حجم DICOM.',summaryEn:'106 axial, 67 coronal, and 93 sagittal images; a source-image preview, not a DICOM volume.',
      detailFa:'صفحهٔ منبع CT طبیعی با وضوح بالا از Mikael Häggström, M.D. و مجوز CC0 1.0 را اعلام می‌کند. تصاویر در زمان مشاهده از Wikimedia بارگیری می‌شوند؛ هندسه، هم‌ترازی فضایی و سگمنتیشن تأیید نشده‌اند.',
      detailEn:'The source page identifies normal high-resolution CT by Mikael Häggström, M.D. and states CC0 1.0. Images load from Wikimedia on demand; spatial geometry, alignment and segmentation are not verified.',
      objectivesFa:['مرور آناتومی طبیعی قفسهٔ سینه در سه توالی مستقل','پیمایش برش‌ها و توجه به نماهای محوری، کرونال و ساژیتال','تمایز توالی تصاویر ثابت از حجم سه‌بعدی'],
      objectivesEn:['Review normal thoracic anatomy across three independent stacks','Navigate slices in axial, coronal, and sagittal views','Distinguish static image stacks from a 3D volume'],
      gatesFa:['بررسی زندهٔ ترتیب و کیفیت فایل‌ها','بازبینی جهت‌یابی و مناسب‌بودن آموزشی توسط متخصص','عدم استفاده برای قطعه‌بندی یا تشخیص بدون دادهٔ هندسی معتبر'],
      gatesEn:['Verify file availability, sequence ordering, and quality','Obtain specialist review of orientation and educational suitability','Do not use for segmentation or diagnosis without valid geometric data'],
      sourceName:'Wikimedia Commons · Mikael Häggström, M.D.',sourceUrl:'https://commons.wikimedia.org/wiki/Scrollable_high-resolution_computed_tomography_images_of_a_normal_thorax',
      sourceNoteFa:'مجوز منبع CC0 1.0 اعلام شده است؛ این امر تأیید پزشکی یا تأیید هندسهٔ CT نیست.',
      sourceNoteEn:'The source states CC0 1.0; that is not medical validation or confirmation of CT geometry.'
    },
    {
      id:'brain-ct-series',shortLabel:'CT',modality:'CT',region:'brain',status:'candidate',contentAvailable:false,pageUrl:'./preview/brain-series.html',
      titleFa:'مغز طبیعی · بدون تزریق',titleEn:'Normal brain · non-contrast CT',
      subtitleFa:'۱۳۹ تصویر ثابت · منبع Wikimedia Commons',subtitleEn:'139 static images · Wikimedia Commons',
      summaryFa:'۴۱ محوری، ۵۸ کرونال و ۴۰ ساژیتال از یک کیس بدون تزریق.',summaryEn:'41 axial, 58 coronal, and 40 sagittal images from a non-contrast case.',
      detailFa:'مجموعهٔ منبع از Mikael Häggström, M.D. با مجوز CC0 1.0 است. توالی‌ها از هم‌ترازی حجمی یا هندسهٔ DICOM پشتیبانی تأییدشده ندارند و تفسیر بالینی ارائه نمی‌کنند.',
      detailEn:'The source series by Mikael Häggström, M.D. states CC0 1.0. The stacks do not provide verified volumetric alignment or DICOM geometry, and no clinical interpretation is supplied.',
      objectivesFa:['مرور ساختارهای طبیعی و جهت‌یابی CT مغز','پیمایش نماهای تصویری مستقل','شناخت محدودیت‌های توالی ثابت برای بازسازی سه‌بعدی'],
      objectivesEn:['Review normal structures and orientation on brain CT','Navigate the separate image planes','Understand the limits of fixed stacks for 3D reconstruction'],
      gatesFa:['اعتبارسنجی ترتیب، جهت و وضوح تصاویر','بازبینی مستقل نورورادیولوژی یا آموزش آناتومی','جدا نگه داشتن آموزش آناتومی از تفسیر تشخیصی'],
      gatesEn:['Validate image order, orientation and resolution','Obtain independent neuroradiology/anatomy-educator review','Keep anatomy preview separate from diagnostic interpretation'],
      sourceName:'Wikimedia Commons · Mikael Häggström, M.D.',sourceUrl:'https://commons.wikimedia.org/wiki/Scrollable_computed_tomography_images_of_a_normal_brain_(case_1)',
      sourceNoteFa:'منبع مجوز CC0 1.0 و ضخامت برش محوری ۴ میلی‌متر را ذکر می‌کند.',
      sourceNoteEn:'The source states CC0 1.0 and reports 4 mm axial slice thickness.'
    },
    {
      id:'brain-contrast-ct-series',shortLabel:'CT',modality:'CT',region:'brain',status:'candidate',contentAvailable:false,pageUrl:'./preview/brain-contrast-series.html',
      titleFa:'CT مغز با تزریق · فقط محوری',titleEn:'Contrast-enhanced brain CT · axial only',
      subtitleFa:'۳۴ تصویر ثابت · منبع Wikimedia Commons',subtitleEn:'34 static images · Wikimedia Commons',
      summaryFa:'یک توالی محوری جداگانه با مادهٔ حاجب؛ نماهای کرونال و ساژیتال موجود نیستند.',summaryEn:'A separate axial series with intravenous contrast; coronal and sagittal views are not available.',
      detailFa:'کیس دوم منبع Wikimedia از Mikael Häggström, M.D. مجوز CC0 1.0 را اعلام می‌کند. این مجموعه با کیس مغز بدون تزریق متفاوت است و نباید با آن ترکیب یا هم‌تراز فرض شود.',
      detailEn:'The second Wikimedia case by Mikael Häggström, M.D. states CC0 1.0. This is distinct from the non-contrast brain case and must not be assumed to align with or form one volume with it.',
      objectivesFa:['مرور مستقل یک توالی CT مغز با تزریق','مقایسهٔ کلی محتوا با کیس بدون تزریق بدون ادعای هم‌ترازی','تشخیص محدودیت پوشش تک‌نما'],
      objectivesEn:['Review a separate contrast-enhanced brain CT sequence','Compare it descriptively with the non-contrast case without assuming alignment','Recognize the limits of single-plane coverage'],
      gatesFa:['تأیید زندهٔ دسترسی و ترتیب ۳۴ تصویر','بازبینی تخصصی و تعیین اهداف آموزشی','عدم استنتاج نماهای دیگر یا هندسهٔ حجم'],
      gatesEn:['Verify availability and order of all 34 images','Obtain specialist review and define learning objectives','Do not infer other planes or a volume geometry'],
      sourceName:'Wikimedia Commons · Mikael Häggström, M.D.',sourceUrl:'https://commons.wikimedia.org/wiki/Scrollable_computed_tomography_images_of_a_normal_brain_(case_2)',
      sourceNoteFa:'منبع مجوز CC0 1.0 اعلام می‌کند؛ توالی فقط محوری است.',
      sourceNoteEn:'The source states CC0 1.0; this stack is axial only.'
    },
    {
      id:'brain-ct',shortLabel:'CT',modality:'CT',region:'brain',status:'blocked',contentAvailable:false,
      titleFa:'CT مغز',titleEn:'Brain CT',subtitleFa:'آناتومی سر و یافته‌های حاد',subtitleEn:'Head anatomy and acute findings',
      summaryFa:'مسیر پیشنهادی: بطن‌ها و خط وسط، خونریزی حاد، اثر فشاری و هیدروسفالی؛ داده هنوز وارد نشده است.',
      summaryEn:'Planned coverage includes ventricles and midline, acute hemorrhage, mass effect, and hydrocephalus; no image dataset is integrated yet.',
      detailFa:'RSNA-IHD کاندید بررسی محتوای خونریزی است، نه مجوز آماده برای میزبانی عمومی. پیش از افزودن هر تصویر DICOM یا مشتق‌شده، شرایط نسخهٔ جاری MIRA باید صریحاً اجازهٔ این نوع انتشار را بدهد؛ در غیر این صورت منبع دیگری لازم است.',
      detailEn:'RSNA-IHD is a candidate for researching hemorrhage teaching content, not automatic clearance for public hosting. Before adding any DICOM or derived image, current MIRA terms must explicitly permit this distribution; otherwise select a different source.',
      objectivesFa:['جهت‌یابی و آناتومی طبیعی در CT بدون کنتراست','شناخت الگوهای اصلی خونریزی داخل جمجمه','ارزیابی خط وسط، بطن‌ها و اثر فشاری'],
      objectivesEn:['Orientation and normal non-contrast head CT anatomy','Recognize major intracranial hemorrhage patterns','Assess midline, ventricles, and mass effect'],
      gatesFa:['رفع مانع مجوز بازنشر عمومی','انتخاب سری کامل و بررسی هندسهٔ حجم','بازبینی نورورادیولوژیست یا مدرس آناتومی'],
      gatesEn:['Clear public redistribution rights','Select complete series and validate volume geometry','Obtain neuroradiology/anatomy educator review'],
      sourceName:'RSNA-IHD / RSNA MIRA data card',sourceUrl:'https://atlas.rsna.org/cards/bd41bbe2-f161-4c19-841c-85d8b645e306',
      sourceNoteFa:'شرایط فعلی MIRA باید برای استفاده و انتشار دقیق بررسی شود؛ هیچ تصویر این مجموعه در این تغییر کپی نشده است.',
      sourceNoteEn:'Current MIRA terms must be reviewed for the exact use and distribution; no images from this collection are bundled in this change.'
    },
    {
      id:'chest-ct',shortLabel:'CT',modality:'CT',region:'chest',status:'candidate',contentAvailable:false,
      titleFa:'CT قفسهٔ سینه',titleEn:'Chest CT',subtitleFa:'ریه، پلور و مدیاستن',subtitleEn:'Lung, pleural and mediastinal anatomy',
      summaryFa:'مسیر پیشنهادی با پنجره‌های ریه، مدیاستن و استخوان؛ یک زیرمجموعهٔ کوچک و بازبینی‌شده لازم است.',
      summaryEn:'Planned lung, mediastinal and bone windows; a small, reviewed subset is required.',
      detailFa:'LIDC-IDRI کاندید بررسی ندول‌های ریوی با ارزیابی چندخواننده است و صفحهٔ رسمی مجوز CC BY 3.0 را برای منابع تصویر فهرست می‌کند. کل مجموعه حجیم است؛ فقط سری‌های منتخب، کامل و دارای انتساب مناسب باید پس از بررسی دقیق وارد شوند.',
      detailEn:'LIDC-IDRI is a candidate for pulmonary nodule teaching with multi-reader annotations; the official collection page lists CC BY 3.0 for image resources. The full collection is large, so only complete, selected studies with required attribution should be considered after review.',
      objectivesFa:['مرور آناتومی در پنجرهٔ ریه و مدیاستن','پیمایش سری کامل با حفظ هندسه','بررسی ندول و تفاوت ارزیابی‌های چندخواننده'],
      objectivesEn:['Review normal anatomy in lung and mediastinal windows','Navigate a complete series with preserved geometry','Inspect nodules and understand multi-reader assessments'],
      gatesFa:['انتخاب تعداد محدودی مطالعه و ثبت انتساب','اعتبارسنجی جهت، فاصلهٔ برش و سری تصویربرداری','بازبینی رادیولوژیست و آزمون عملکرد'],
      gatesEn:['Select a small subset and record attribution','Validate orientation, slice spacing, and series integrity','Obtain radiologist review and test performance'],
      sourceName:'TCIA · LIDC-IDRI',sourceUrl:'https://www.cancerimagingarchive.net/collection/lidc-idri/',
      sourceNoteFa:'مجوز فهرست‌شده برای مجموعه، تأیید خودکار همهٔ مشتقات یا فایل‌های ثالث نیست؛ فایل دقیق و انتساب باید بررسی شوند.',
      sourceNoteEn:'The collection-level license is not automatic clearance for every derivative or third-party file; exact files and attribution must be reviewed.'
    },
    {
      id:'chest-xray',shortLabel:'2D',modality:'Radiograph',region:'chest',status:'candidate',contentAvailable:false,viewerAvailable:true,
      titleFa:'گرافی قفسهٔ سینه',titleEn:'Chest radiograph',subtitleFa:'نمایشگر دوبعدی · PA / AP / لترال',subtitleEn:'2D viewer · PA / AP / lateral',
      summaryFa:'نمایشگر دوبعدی آزمایشی فایل PNG/JPEG/WebP را فقط در مرورگر باز می‌کند؛ کیس‌های آموزشی تأییدشده هنوز اضافه نشده‌اند.',
      summaryEn:'A prototype 2D viewer opens a local PNG/JPEG/WebP in this browser only; reviewed teaching cases are not integrated yet.',
      detailFa:'صفحهٔ رسمی NIH/Google دربارهٔ NIH Chest X-ray می‌گوید استفاده از تصاویر محدودیت عمومی ندارد، اما باید به NIH Clinical Center اعتبار داده شود، به صفحهٔ دانلود اصلی لینک داده شود و مقالهٔ CVPR 2017 ارجاع شود. VinDr-CXR تحت توافق‌نامهٔ محدودکننده است و نباید بازتوزیع شود. این مسیر فعلاً فقط نمایشگر محلی دارد؛ کیس، برچسب یا تفسیر بالینی آماده‌ای همراه آن نیست.',
      detailEn:'The official NIH/Google page for NIH Chest X-ray says use of the images has no restrictions, but requires acknowledgement of the NIH Clinical Center, a link to the original download page, and the CVPR 2017 citation. VinDr-CXR remains under a restrictive data-use agreement and must not be redistributed. This path currently provides only a local viewer; no curated cases, labels, or clinical interpretations are bundled.',
      objectivesFa:['بررسی سیستماتیک تصویر و کیفیت تکنیکی','شناخت پلور، میدان‌های ریوی، قلب و مدیاستن','فهم تفاوت پروجکشن PA و AP و نمای لترال'],
      objectivesEn:['Apply a systematic review and assess technical quality','Inspect pleura, lung fields, heart, and mediastinum','Understand PA versus AP projection and the lateral view'],
      gatesFa:['انتخاب مجموعهٔ جایگزین با مجوز عمومی','ثبت پروجکشن و حفظ وضوح و نسبت ابعاد','تأیید متخصص برای یافته‌ها و توضیحات'],
      gatesEn:['Choose an alternative with public redistribution rights','Record projection and preserve resolution/aspect ratio','Obtain specialist review of findings and explanations'],
      sourceName:'NIH Chest X-ray (attribution required)',sourceUrl:'https://docs.cloud.google.com/healthcare-api/docs/resources/public-datasets/nih-chest',
      sourceNoteFa:'منبع رسمی، ارجاع به مقالهٔ CVPR 2017 و ذکر NIH Clinical Center را لازم می‌داند. هر تصویر منتخب باید از نظر شناسهٔ سوخته‌شده و کیفیت آموزشی بررسی شود. VinDr-CXR برای بازنشر عمومی مناسب نیست.',
      sourceNoteEn:'The official source requires a CVPR 2017 citation and acknowledgement of the NIH Clinical Center. Each selected image must be checked for burned-in identifiers and educational quality. VinDr-CXR is not suitable for public redistribution.'
    }
  ];
  const byId = Object.create(null);
  entries.forEach(function (entry) { byId[entry.id] = Object.freeze(entry); });
  return Object.freeze({
    list: function () { return entries.slice(); },
    getById: function (id) { return byId[id] || null; },
    isAvailable: function (id) { const entry = byId[id]; return Boolean(entry && entry.contentAvailable === true && entry.status === 'available'); }
  });
}));
