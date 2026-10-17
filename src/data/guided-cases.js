(function (root, factory) {
  'use strict';
  const data = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  if (root) root.CTEduGuidedCases = data;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Metadata, independent bilingual teaching prompts and local case synopses only.
  // Radiopaedia's full text/images are not copied; explicit Study URLs auto-load on selection.
  const cases = [
    {
      id: 'acute-abdominal-pain-ct',
      level: 'foundations',
      clinicalContext: {
        fa: 'زمینهٔ آموزشی: بیماری با درد شکم، استفراغ و کاهش دفع گاز/مدفوع مراجعه کرده است. CT شکم برای بررسی الگوی انسداد و عوارض احتمالی درخواست شده است.',
        en: 'Teaching context: a patient presents with abdominal pain, vomiting, and reduced passage of stool or flatus. CT is requested to assess for obstruction and complications.'
      },
      modality: 'CT',
      region: 'abdomen',
      title: { fa: 'درد شکم · مرور CT', en: 'Abdominal pain · CT review' },
      summary: {
        fa: 'از یک مرور سیستماتیک شروع کن: اتساع روده، محل تغییر کالیبر و وضعیت روده در سمت دیستال.',
        en: 'Start with a systematic review: bowel calibre, the transition point, and the distal bowel.'
      },
      source: {
        title: 'Closed loop small bowel obstruction',
        contributor: 'Wayland Wang',
        rid: 'rID-59227',
        url: 'https://radiopaedia.org/cases/closed-loop-small-bowel-obstruction-5?lang=us',
        studyPageUrl: 'https://radiopaedia.org/cases/59227/studies/66554?lang=us#t=im&v1i=37233728&v1z=1&v2i=37233541&v2z=1&v3i=37233598&v3z=1',
        citation: 'Wang W. Closed loop small bowel obstruction. Radiopaedia.org. rID-59227.',
        articleUrl: 'https://radiopaedia.org/articles/small-bowel-obstruction?lang=us',
        articleTitle: 'Small bowel obstruction'
      },
      objectives: {
        fa: ['اتساع رودهٔ باریک را از اتساع کولون تفکیک کن.', 'transition point را مشخص کن و رودهٔ دیستال را دنبال کن.', 'علائم انسداد closed-loop و عوارض تهدیدکنندهٔ حیات را جست‌وجو کن.'],
        en: ['Distinguish small-bowel dilatation from colonic dilatation.', 'Locate the transition point and follow the distal bowel.', 'Look for a closed-loop pattern and complications that threaten bowel viability.']
      },
      rubric: [
        {
          id: 'distribution',
          title: { fa: 'الگوی اتساع و توزیع روده', en: 'Distribution and calibre of bowel dilatation' },
          cue: { fa: 'مشخص کن کدام حلقه‌ها متسع‌اند و آیا رودهٔ دیستال فروریخته یا با کالیبر طبیعی است.', en: 'State which loops are dilated and whether distal bowel is decompressed or normal in calibre.' }
        },
        {
          id: 'transition',
          title: { fa: 'محل و تعداد نقاط گذار', en: 'Transition point(s)' },
          cue: { fa: 'محل تغییر کالیبر را دنبال کن؛ وجود دو نقطهٔ نزدیک به هم می‌تواند مطرح‌کنندهٔ انسداد closed-loop باشد.', en: 'Trace the calibre change; two adjacent transition points may indicate a closed-loop obstruction.' }
        },
        {
          id: 'complications',
          title: { fa: 'عوارض و زنده‌مانی روده', en: 'Complications and bowel viability' },
          cue: { fa: 'دیواره و enhancement، مزانتر، مایع آزاد، pneumatosis و گاز خارج روده را بررسی کن.', en: 'Assess bowel wall enhancement, mesentery, free fluid, pneumatosis, and extraluminal gas.' }
        },
        {
          id: 'impression',
          title: { fa: 'Impression روشن و متناسب با شواهد', en: 'Evidence-proportionate impression' },
          cue: { fa: 'تشخیص اصلی، محل/شدت انسداد و نگرانی دربارهٔ strangulation یا ischemia را در صورت وجود شواهد بیان کن.', en: 'State the main diagnosis, level/severity, and any supported concern for strangulation or ischaemia.' }
        }
      ],
      disclaimer: {
        fa: 'این چک‌لیست مستقل و آموزشی است؛ تفسیر تأییدشدهٔ بیمار منبع نیست.',
        en: 'This independent teaching checklist is not a validated interpretation of the source patient.'
      }
    },
    {
      id: 'closed-loop-pattern-ct',
      level: 'intermediate',
      clinicalContext: {
        fa: 'زمینهٔ آموزشی: درد شکم و استفراغ در بیماری با سابقهٔ جراحی شکم وجود دارد. CT با کنتراست برای بررسی محل انسداد و شکل حلقه‌های روده انجام شده است.',
        en: 'Teaching context: abdominal pain and vomiting occur in a patient with previous abdominal surgery. Contrast-enhanced CT is obtained to assess the level of obstruction and bowel-loop configuration.'
      },
      modality: 'CT',
      region: 'abdomen',
      title: { fa: 'انسداد حلقه‌بسته · CT', en: 'Closed-loop pattern · CT' },
      summary: {
        fa: 'روی شکل حلقه‌ها، دو نقطهٔ گذار و تغییرات مزانتر تمرکز کن؛ سپس فوریت و عوارض احتمالی را ارزیابی کن.',
        en: 'Focus on loop configuration, paired transition points, and mesenteric changes, then assess urgency and complications.'
      },
      source: {
        title: 'Closed loop small bowel obstruction',
        contributor: 'Heather Pascoe',
        rid: 'rID-58281',
        url: 'https://radiopaedia.org/cases/closed-loop-small-bowel-obstruction-4?lang=us',
        studyPageUrl: 'https://radiopaedia.org/cases/58281/studies/65391?lang=us#t=im&v1i=35824694&v1z=1&v2i=35824879&v2z=1',
        citation: 'Pascoe H. Closed loop small bowel obstruction. Radiopaedia.org. rID-58281.',
        articleUrl: 'https://radiopaedia.org/articles/small-bowel-obstruction?lang=us',
        articleTitle: 'Small bowel obstruction'
      },
      objectives: {
        fa: ['آرایش C یا U شکل و دو نقطهٔ گذار را بررسی کن.', 'تغییرات عروقی و مزانتریک را در چند صفحه مقایسه کن.', 'نشانه‌های strangulation و ischemia را از یافته‌های غیراختصاصی جدا کن.'],
        en: ['Look for a C- or U-shaped loop and two transition points.', 'Compare mesenteric and vascular changes across planes.', 'Separate signs of strangulation or ischaemia from non-specific findings.']
      },
      rubric: [
        {
          id: 'two-points',
          title: { fa: 'دو نقطهٔ گذار مجاور', en: 'Two adjacent transition points' },
          cue: { fa: 'هر دو نقطهٔ ورود و خروج حلقه را دنبال کن؛ فقط اتساع روده برای این نتیجه کافی نیست.', en: 'Trace both entry and exit points; dilatation alone is not enough to establish a closed loop.' }
        },
        {
          id: 'configuration',
          title: { fa: 'شکل حلقه و مسیر مزانتر', en: 'Loop configuration and mesenteric course' },
          cue: { fa: 'نمای C/U شکل، همگرایی یا کشیدگی عروق مزانتریک و edema را ارزیابی کن.', en: 'Assess C/U-shaped configuration, converging or stretched mesenteric vessels, and oedema.' }
        },
        {
          id: 'viability',
          title: { fa: 'ارزیابی زنده‌مانی روده', en: 'Bowel viability assessment' },
          cue: { fa: 'کاهش enhancement، ضخیم‌شدن دیواره، مایع بین‌حلقه‌ای، pneumatosis و گاز پورتال/خارج روده را جست‌وجو کن.', en: 'Look for reduced enhancement, wall thickening, interloop fluid, pneumatosis, and portal or extraluminal gas.' }
        },
        {
          id: 'action',
          title: { fa: 'بیان فوریت متناسب با یافته‌ها', en: 'Evidence-based statement of urgency' },
          cue: { fa: 'در صورت مطرح‌شدن strangulation یا ischemia، آن را واضح و بدون قطعیت بیش از شواهد بیان کن.', en: 'If strangulation or ischaemia is suspected, state it clearly without overstating certainty.' }
        }
      ],
      disclaimer: {
        fa: 'این چک‌لیست مستقل و آموزشی است؛ تفسیر تأییدشدهٔ بیمار منبع نیست.',
        en: 'This independent teaching checklist is not a validated interpretation of the source patient.'
      }
    },
    {
      id: 'bowel-viability-ct',
      level: 'advanced',
      clinicalContext: {
        fa: 'زمینهٔ آموزشی: درد شدید شکم و نگرانی بالینی از آسیب روده وجود دارد. هدف مرور، ارزیابی CT با کنتراست برای انسداد و نشانه‌های احتمالی اختلال پرفیوژن است.',
        en: 'Teaching context: severe abdominal pain raises concern for bowel injury. The task is to review contrast-enhanced CT for obstruction and possible impaired bowel perfusion.'
      },
      modality: 'CT',
      region: 'abdomen',
      title: { fa: 'CT شکم · کیس ۰۴', en: 'Abdominal CT · Case 04' },
      summary: {
        fa: 'CT را به‌صورت سیستماتیک مرور کن، یافته‌ها و تشخیص‌های افتراقی را ثبت کن و پیش از دیدن توضیح مرجع نتیجه‌گیری کن.',
        en: 'Review the CT systematically, record findings and a differential, and formulate an impression before revealing the reference explanation.'
      },
      patientPresentation: {
        ageSex: { fa: 'مرد ۸۰ ساله', en: '80-year-old male' },
        symptoms: { fa: 'درد شکم، سقوط و خون روشن از رکتوم', en: 'Abdominal pain, a fall, and bright red blood per rectum' },
        history: { fa: 'آترواسکلروز شدید آئورت شکمی در تصویربرداری دیده شده است. عروق مزانتریک باز هستند؛ سایر سابقهٔ پزشکی یا جراحی در اطلاعات منبع ذکر نشده است.', en: 'Marked abdominal aortic atherosclerosis is seen on imaging. Mesenteric vessels are patent; other medical or surgical history is not stated in the source.' },
        labs: { fa: 'لاکتات بسیار بالا گزارش شده؛ مقدار عددی در متن منبع موجود نیست.', en: 'Very high lactate is reported; the numerical value is not provided in the source text.' },
        sourceNote: { fa: 'اطلاعات بالینی از داده‌های کیس منبع استخراج شده است؛ دادهٔ گزارش‌نشده حدس زده نشده است.', en: 'Clinical details are taken from the source case; unreported values have not been inferred.' }
      },
      progressiveHints: [
        {
          title: { fa: 'سرنخ ۱ · توزیع روده', en: 'Hint 1 · Bowel distribution' },
          text: { fa: 'اتساع معده و رودهٔ باریک را از نواحی با قطر طبیعی جدا کن. به اولین تغییر کالیبر اکتفا نکن و رودهٔ دیستال را دنبال کن.', en: 'Separate dilated stomach and small bowel from normal-calibre segments. Do not stop at the first calibre change; follow the distal bowel.' }
        },
        {
          title: { fa: 'سرنخ ۲ · مسیر و نقاط گذار', en: 'Hint 2 · Course and transition points' },
          text: { fa: 'خوشهٔ حلقه‌های غیرطبیعی در ربع تحتانی راست را در نماهای محوری و کرونال دنبال کن. ببین آیا مسیر روده پس از بخشی با کالیبر طبیعی دوباره به حلقهٔ غیرطبیعی متصل می‌شود.', en: 'Trace the abnormal cluster in the right lower quadrant on axial and coronal views. Determine whether bowel returns to the abnormal segment after a stretch of normal-calibre bowel.' }
        },
        {
          title: { fa: 'سرنخ ۳ · دیواره و پرفیوژن', en: 'Hint 3 · Wall and perfusion' },
          text: { fa: 'ضخامت دیواره، دانسیتهٔ پیش از تزریق، میزان enhancement در فازهای مختلف، ادم مزانتر و مایع بین حلقه‌ها را کنار هم تفسیر کن؛ هر کدام به‌تنهایی تشخیص قطعی نمی‌دهد.', en: 'Interpret wall thickness, pre-contrast attenuation, enhancement across phases, mesenteric oedema, and interloop fluid together; none is definitive in isolation.' }
        }
      ],
      source: {
        title: 'Closed loop obstruction due to adhesive band, resulting in small bowel ischemia and resection',
        contributor: 'Michael P. Hartung',
        rid: 'rID-83835',
        url: 'https://radiopaedia.org/cases/closed-loop-obstruction-due-to-adhesive-band-resulting-in-small-bowel-ischemia-and-resection?lang=us',
        studyPageUrl: 'https://radiopaedia.org/cases/83835/studies/99023?lang=us#t=im&v1i=53798188&v1z=1&v2i=53975701&v2z=1&v3i=53798655&v3z=1&v4i=53798366&v4z=1',
        citation: 'Hartung MP. Closed loop obstruction due to adhesive band, resulting in small bowel ischemia and resection. Radiopaedia.org. rID-83835.',
        articleUrl: 'https://radiopaedia.org/articles/acute-mesenteric-ischaemia?lang=us',
        articleTitle: 'Acute mesenteric ischaemia',
        referenceDetails: {
          certainty: { fa: 'منبع تشخیص را قطعی علامت‌گذاری کرده است؛ یافته‌های جراحی و آسیب‌شناسی نیز آسیب ایسکمیک روده را تأیید می‌کنند.', en: 'The source marks the diagnosis as certain; operative findings and pathology also corroborate ischaemic bowel injury.' },
          findings: [
            { fa: 'اتساع معده و رودهٔ باریک پروگزیمال تا بخش میانی.', en: 'Dilated stomach and proximal-to-mid small bowel.' },
            { fa: 'خوشهٔ گرد حلقه‌های روده در ربع تحتانی راست، با ضخیم‌شدن دیواره، دانسیتهٔ بالاتر در CT بدون تزریق، کاهش enhancement پس از تزریق و مایع بین‌حلقه‌ای.', en: 'A rounded cluster of small bowel in the right lower quadrant, with wall thickening, increased non-contrast attenuation, diminished post-contrast enhancement, and interloop fluid.' },
            { fa: 'رودهٔ فکالیزه به نقطهٔ گذار پروگزیمال می‌رسد؛ برای یافتن نقطهٔ گذار دوم باید بخش طبیعی‌قطر و فروریختهٔ ایلئوم را تا انتها دنبال کرد.', en: 'Fecalized small bowel reaches the proximal transition point; the normal-calibre decompressed ileum must be followed to locate the second transition point.' },
            { fa: 'آترواسکلروز شدید آئورت شکمی، با عروق مزانتریک باز. الگوی دیواره و ادم مزانتریک در بحث منبع بیشتر با اختلال خروج وریدی سازگار دانسته شده است.', en: 'Heavy abdominal aortic atherosclerosis with patent mesenteric vessels. The source discussion considers the wall changes and mesenteric oedema more consistent with impaired venous outflow.' }
          ],
          pathology: { fa: 'رزکسیون رودهٔ باریک: نکروز ایسکمیک مخاط، خونریزی، احتقان عروقی و ادم.', en: 'Small-bowel resection: mucosal ischaemic necrosis, haemorrhage, vascular congestion, and oedema.' },
          pathologySourceNote: { fa: 'خلاصهٔ گزارش آسیب‌شناسی ثبت‌شده در صفحهٔ کیس منبع.', en: 'Pathology summary recorded on the source case page.' }
        },
        caseDiscussion: {
          paragraphs: [
            "This is a challenging case to rapidly put all of the findings together, particularly with the time pressures of an emergency department presentation.",
            "First, the patient presented with findings typical of mesenteric ischaemia (bright red blood per rectum and very high lactate), and thus underwent a multiphasic CT examination tailored for finding GI bleeding and mesenteric ischaemia. Second, while it is pretty obvious that there is an abnormal small bowel loop in the right lower quadrant, the exact cause is not readily apparent. While the clustered, rounded appearance of this abnormal loop is characteristic for a closed-loop obstruction, your confidence in this diagnosis falters when you attempt to follow the small bowel distally out of this segment and find a longer-than-expected segment of normal calibre, decompressed ileum that you might give up on following until the second transition point. Only the proximal small bowel within the closed-loop becomes compromised (venous ischaemia), and the remainder is not obstructed nor ischaemic. Additionally, because there is such atherosclerotic disease, you might wonder if this patient has arterial (embolic) ischaemia resulting in this finding. However, arterial ischaemia would cause hyperenhancement without wall-thickening or as much mesenteric oedema, and this case is more typical of venous ischaemia. Finally, the diffuse dilation of the small bowel to the stomach is often misleading when reading cases of closed-loop obstructions, and requires you to observe differences of bowel wall thickness and enhancement involving the closed-loop to differentiate (both present in this case).",
            "Putting it all together, there is a long segment of mid and distal small bowel which has slid under an adhesive band in the right lower quadrant. The proximal small bowel is dilated with a short segment of fecalized small bowel leading into the proximal transition point at the adhesive band. The proximal closed loop segment has become ischaemic as a result of impaired venous outflow, and these elevated venous pressures have also resulted intramural haemorrhage (accounting for higher density on non-contrast). The rest of the small bowel in this closed-loop segment has preserved blood flow (for the time being) and is not obstructed, and is therefore normal calibre leading into the distal transition point. Finding the distal transition point requires you to follow the bowel a bit longer than you might have expected to in a closed-loop case.",
            "However you might have read this case, it is practical to recognise quickly that this is a surgical abdomen, with small bowel ischaemia in the right lower quadrant. Even if you failed to account for all of these particulars, appropriately sending the patient to the OR (versus to the floor with a nasogastric tube) will save his life."
          ],
          operativeNote: "There was a significant amount of blood in the abdominal cavity. We found a segment of inflamed mesentery and threatened small bowel in the distal jejunum that was herniating through an adhesive band between the sigmoid colon epiploica and pelvic sidewall. The adhesion was lysed and the decision was made to resect a 40 cm of distal jejunum that looked threatened..."
        }
      },
      objectives: {
        fa: ['یافته‌های انسداد را از شواهد آسیب/ایسکمی دیواره جدا کن.', 'فازهای تصویربرداری و محدودیت‌های ارزیابی enhancement را ذکر کن.', 'یافته‌های مهم و درجهٔ نگرانی را در Impression اولویت‌بندی کن.'],
        en: ['Separate obstruction findings from evidence of bowel-wall injury or ischaemia.', 'Note the acquisition phase and limitations of enhancement assessment.', 'Prioritise key findings and degree of concern in the impression.']
      },
      rubric: [
        {
          id: 'enhancement',
          title: { fa: 'دیواره و enhancement', en: 'Bowel wall and enhancement' },
          cue: { fa: 'کاهش یا فقدان enhancement را با فاز کنتراست، دیواره و سایر یافته‌ها تفسیر کن.', en: 'Interpret reduced or absent enhancement in the context of contrast phase, wall appearance, and other findings.' }
        },
        {
          id: 'mesentery',
          title: { fa: 'مزانتر و مایع', en: 'Mesentery and fluid' },
          cue: { fa: 'ادم مزانتر، مایع بین حلقه‌ها، احتقان و مسیر عروق را بررسی کن.', en: 'Assess mesenteric oedema, interloop fluid, congestion, and vascular course.' }
        },
        {
          id: 'late-signs',
          title: { fa: 'علائم پیشرفته و افتراق', en: 'Advanced signs and differential' },
          cue: { fa: 'pneumatosis، گاز ورید پورت یا گاز آزاد را در زمینهٔ بالینی و با توجه به حساسیت محدود علائم دیررس بررسی کن.', en: 'Check for pneumatosis, portal venous gas, or free gas in context; absence of late signs does not exclude early ischaemia.' }
        },
        {
          id: 'communication',
          title: { fa: 'ارتباط یافته با اقدام لازم', en: 'Communicating actionable concern' },
          cue: { fa: 'اگر ایسکمی یا strangulation محتمل است، سطح نگرانی و نیاز به ارزیابی فوری را متناسب با شواهد بیان کن.', en: 'If ischaemia or strangulation is suspected, communicate the concern and urgency in proportion to the evidence.' }
        }
      ],
      disclaimer: {
        fa: 'این چک‌لیست مستقل و آموزشی است؛ تفسیر تأییدشدهٔ بیمار منبع نیست.',
        en: 'This independent teaching checklist is not a validated interpretation of the source patient.'
      }
    },
    {
      id: 'ascending-colon-lipoma-ct',
      level: 'intermediate',
      clinicalContext: {
        fa: 'زمینهٔ آموزشی: یک ضایعهٔ داخل‌لومنی در کولون صعودی در CT بررسی می‌شود. ابتدا ویژگی‌های قابل مشاهده را مستقل توصیف کن؛ سپس ترکیب ضایعه و عوارض احتمالی را ارزیابی کن.',
        en: 'Teaching context: an intraluminal lesion in the ascending colon is being assessed on CT. Describe the observable imaging features independently, then assess composition and potential complications.'
      },
      modality: 'CT',
      region: 'abdomen',
      title: { fa: 'ضایعهٔ کولون صعودی · CT', en: 'Ascending colon lesion · CT' },
      summary: {
        fa: 'محل و شکل ضایعه، دانسیته و ارتباط آن با دیوارهٔ کولون را ارزیابی کن؛ سپس عوارض احتمالی را بررسی کن.',
        en: 'Assess location, morphology, attenuation, and relationship to the colonic wall, then look for complications.'
      },
      source: {
        title: 'Ascending colon lipoma',
        caseId: '2582',
        url: 'https://radiopaedia.org/cases/ascending-colon-lipoma?lang=us',
        studyPageUrl: 'https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1',
        citation: 'Radiopaedia.org. Ascending colon lipoma. Case 2582.',
        articleUrl: 'https://radiopaedia.org/articles/gastrointestinal-tract-lipomas?lang=us',
        articleTitle: 'Gastrointestinal tract lipomas'
      },
      objectives: {
        fa: ['محل، اندازه، شکل و رابطهٔ ضایعه با لومن و دیواره را مشخص کن.', 'دانسیته را در صورت امکان با اندازه‌گیری HU توصیف کن و وجود چربی را از سایر ترکیب‌ها تفکیک کن.', 'انسداد، انواژیناسیون، التهاب یا سایر عوارض قابل مشاهده را بررسی کن.'],
        en: ['Localise the lesion and describe size, shape, and relationship to the lumen and bowel wall.', 'Characterise attenuation, using HU measurements where feasible, and distinguish fat from other tissue components.', 'Assess for obstruction, intussusception, inflammation, or other visible complications.']
      },
      rubric: [
        {
          id: 'lesion-location',
          title: { fa: 'محل و مورفولوژی ضایعه', en: 'Lesion location and morphology' },
          cue: { fa: 'بخش درگیر کولون، شکل، حدود، اندازه و جهت رشد داخل‌لومنی را توصیف کن.', en: 'Describe the colonic segment, shape, margins, size, and intraluminal growth pattern.' }
        },
        {
          id: 'attenuation',
          title: { fa: 'دانسیته و ترکیب بافتی', en: 'Attenuation and tissue composition' },
          cue: { fa: 'در صورت امکان ROI مناسب بگذار؛ دانسیتهٔ چربی، یکنواختی و هر جزء غیرچربی را بررسی کن.', en: 'Use an appropriate ROI if feasible; assess fat attenuation, homogeneity, and any non-fat component.' }
        },
        {
          id: 'differential',
          title: { fa: 'تشخیص افتراقی متناسب با تصویر', en: 'Imaging-based differential diagnosis' },
          cue: { fa: 'ویژگی‌های مؤید ضایعهٔ چربی‌دار را با پولیپ، تودهٔ نئوپلاستیک یا محتویات داخل لومن مقایسه کن.', en: 'Compare features of a fat-containing lesion with a polyp, neoplastic mass, or intraluminal contents.' }
        },
        {
          id: 'complications',
          title: { fa: 'عوارض و جمع‌بندی', en: 'Complications and impression' },
          cue: { fa: 'اتساع پروگزیمال، محل انسداد، انواژیناسیون و تغییرات اطراف را بررسی کن و میزان قطعیت را با شواهد تطبیق بده.', en: 'Check for proximal dilatation, obstruction, intussusception, and surrounding changes; keep certainty proportionate to the evidence.' }
        }
      ],
      disclaimer: {
        fa: 'این چک‌لیست مستقل و آموزشی است؛ تفسیر تأییدشدهٔ بیمار منبع نیست.',
        en: 'This independent teaching checklist is not a validated interpretation of the source patient.'
      }
    }
  ];

  function getById(id) {
    return cases.find(function (item) { return item.id === id; }) || null;
  }

  return Object.freeze({
    schemaVersion: 1,
    list: function () { return cases.slice(); },
    getById: getById
  });
}));
