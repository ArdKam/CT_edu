(function (root) {
  'use strict';
  // segmentId values are the authoritative IDs in the SPL Abdominal Atlas labelmap,
  // not UI-generated identifiers. This nine-structure catalogue is specific to
  // the bundled, explicitly documented axial teaching slice k=26.
  const anatomy = [
    {
      id: 'liver', segmentId: 3, nameEn: 'Liver', nameFa: 'کبد', color: '#933B00',
      region: 'organ', aliases: ['hepatic', 'کبدی', 'جگر'],
      labelPosition: [57, 120],
      descriptionEn: 'The liver occupies much of the right upper abdomen. In this axial display, patient right is on the viewer left.',
      descriptionFa: 'کبد بخش بزرگی از قسمت فوقانی راست شکم را اشغال می‌کند. در این نمای محوری، سمت راست بیمار در سمت چپ نمایشگر است.'
    },
    {
      id: 'spleen', segmentId: 4, nameEn: 'Spleen', nameFa: 'طحال', color: '#8C64A0',
      region: 'organ', aliases: ['splenic', 'طحالی'],
      labelPosition: [193, 191],
      descriptionEn: 'The spleen lies in the left upper abdomen. Its labelmap region is shown in purple in this teaching overlay.',
      descriptionFa: 'طحال در بخش فوقانی چپ شکم قرار دارد. ناحیهٔ قطعه‌بندی آن در این لایهٔ آموزشی بنفش است.'
    },
    {
      id: 'right-kidney', segmentId: 51, nameEn: 'Right kidney', nameFa: 'کلیهٔ راست', color: '#DBAA77',
      region: 'posterior', aliases: ['right renal', 'کلیه راست'],
      labelPosition: [84, 190],
      descriptionEn: 'The right kidney is retroperitoneal and lies on the patient-right side, shown at viewer-left in a radiological axial view.',
      descriptionFa: 'کلیهٔ راست رتروپریتوئن است و در سمت راست بیمار قرار دارد؛ در نمای محوری رادیولوژیک، در سمت چپ صفحه دیده می‌شود.'
    },
    {
      id: 'left-kidney', segmentId: 52, nameEn: 'Left kidney', nameFa: 'کلیهٔ چپ', color: '#DBAA77',
      region: 'posterior', aliases: ['left renal', 'کلیه چپ'],
      labelPosition: [158, 194],
      descriptionEn: 'The left kidney is retroperitoneal and appears on the viewer-right side in a standard radiological axial image.',
      descriptionFa: 'کلیهٔ چپ رتروپریتوئن است و در تصویر محوری رادیولوژیک استاندارد در سمت راست صفحه دیده می‌شود.'
    },
    {
      id: 'ivc', segmentId: 8, nameEn: 'Inferior vena cava', nameFa: 'ورید اجوف تحتانی', color: '#3114FF',
      region: 'vessel', aliases: ['IVC', 'vena cava', 'اجوف'],
      labelPosition: [100, 119],
      descriptionEn: 'The IVC returns blood from the lower body to the right atrium. Here it is the blue-labelled vessel to the patient-right of the aorta.',
      descriptionFa: 'ورید اجوف تحتانی خون بخش‌های پایین بدن را به دهلیز راست بازمی‌گرداند. در این برش، در سمت راست بیمار نسبت به آئورت قرار دارد.'
    },
    {
      id: 'aorta', segmentId: 7, nameEn: 'Abdominal aorta', nameFa: 'آئورت شکمی', color: '#FF3114',
      region: 'vessel', aliases: ['aortic', 'aorta', 'آئورت'],
      labelPosition: [135, 119],
      descriptionEn: 'The abdominal aorta is the round arterial landmark anterior to the vertebral body. It is red in this educational overlay.',
      descriptionFa: 'آئورت شکمی شاخص شریانی گرد در جلوی جسم مهره‌ای است و در این لایهٔ آموزشی با رنگ قرمز نشان داده شده است.'
    },
    {
      id: 'pancreas', segmentId: 6, nameEn: 'Pancreas', nameFa: 'پانکراس', color: '#9C6E36',
      region: 'organ', aliases: ['pancreatic', 'لوزالمعده'],
      labelPosition: [185, 119],
      descriptionEn: 'The pancreas extends across the upper retroperitoneum. Only its labelled pixels on this one axial slice are emphasized.',
      descriptionFa: 'پانکراس در بخش فوقانی رتروپریتوئن امتداد دارد. در اینجا فقط پیکسل‌های برچسب‌خوردهٔ آن در همین برش تأکید شده‌اند.'
    },
    {
      id: 'stomach-duodenum', segmentId: 13, nameEn: 'Stomach & duodenum', nameFa: 'معده و دوازدهه', color: '#D1AAA0',
      region: 'organ', aliases: ['gastric', 'duodenal', 'معده', 'دوازدهه'],
      labelPosition: [146, 69],
      descriptionEn: 'The atlas groups stomach and duodenum into one segment label in this lesson. The overlay follows that combined labelmap class.',
      descriptionFa: 'در این درس، اطلس معده و دوازدهه را در یک کلاس قطعه‌بندی مشترک قرار داده است؛ لایه نیز همان کلاس ترکیبی را نشان می‌دهد.'
    },
    {
      id: 'gallbladder', segmentId: 10, nameEn: 'Gallbladder', nameFa: 'کیسهٔ صفرا', color: '#00FF7E',
      region: 'organ', aliases: ['biliary', 'کیسه صفرا'],
      labelPosition: [76, 93],
      descriptionEn: 'The gallbladder is small on this slice. Its overlay is the green labelmap region adjacent to the liver.',
      descriptionFa: 'کیسهٔ صفرا در این برش کوچک است و با ناحیهٔ سبزرنگ مجاور کبد نمایش داده می‌شود.'
    }
  ];

  const bySegment = Object.create(null);
  anatomy.forEach(function (item) { bySegment[item.segmentId] = item; });
  const api = {
    items: anatomy,
    byId: function (id) { return anatomy.find(function (item) { return item.id === id; }) || anatomy[0]; },
    bySegmentId: function (segmentId) { return bySegment[Number(segmentId)] || null; },
    search: function (query) {
      const normalized = String(query || '').trim().toLocaleLowerCase();
      if (!normalized) return anatomy.slice();
      return anatomy.filter(function (item) {
        return [item.nameEn, item.nameFa].concat(item.aliases).join(' ').toLocaleLowerCase().includes(normalized);
      });
    },
    regions: ['organ', 'vessel', 'posterior']
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CTEduAnatomy = api;
})(typeof window !== 'undefined' ? window : globalThis);
