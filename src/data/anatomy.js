(function (root) {
  'use strict';
  const anatomy = [
    { id: 'liver', nameEn: 'Liver', nameFa: 'کبد', color: '#D9A15E', region: 'organ', aliases: ['hepatic', 'کبدی', 'جگر'], descriptionEn: 'The liver occupies much of the right upper abdomen. In radiological axial display, patient right is on the viewer left.', descriptionFa: 'کبد بخش عمده‌ای از قسمت فوقانی راست شکم را اشغال می‌کند. در نمایش محوری رادیولوژیک، سمت راست بیمار در سمت چپ صفحه دیده می‌شود.', shape: 'liver' },
    { id: 'spleen', nameEn: 'Spleen', nameFa: 'طحال', color: '#B784CB', region: 'organ', aliases: ['splenic', 'طحالی'], descriptionEn: 'The spleen lies in the left upper abdomen, lateral to the stomach. This drawing is only a schematic location cue.', descriptionFa: 'طحال در بخش فوقانی چپ شکم و در سمت خارجی معده قرار دارد. این شکل صرفاً موقعیت تقریبی را نشان می‌دهد.', shape: 'spleen' },
    { id: 'right-kidney', nameEn: 'Right kidney', nameFa: 'کلیهٔ راست', color: '#E58F91', region: 'organ', aliases: ['right renal', 'کلیه راست'], descriptionEn: 'The right kidney is usually slightly lower than the left because of the liver. Its level varies between individuals.', descriptionFa: 'کلیهٔ راست معمولاً به‌دلیل مجاورت با کبد اندکی پایین‌تر از کلیهٔ چپ قرار دارد؛ سطح دقیق آن بین افراد متفاوت است.', shape: 'right-kidney' },
    { id: 'left-kidney', nameEn: 'Left kidney', nameFa: 'کلیهٔ چپ', color: '#82B9D6', region: 'organ', aliases: ['left renal', 'کلیه چپ'], descriptionEn: 'The left kidney is retroperitoneal. In a standard radiological axial view, patient left appears on the viewer right.', descriptionFa: 'کلیهٔ چپ در فضای رتروپریتوئن قرار دارد. در نمای محوری رادیولوژیک استاندارد، سمت چپ بیمار در سمت راست صفحه دیده می‌شود.', shape: 'left-kidney' },
    { id: 'ivc', nameEn: 'Inferior vena cava', nameFa: 'ورید اجوف تحتانی', color: '#65B9B4', region: 'vessel', aliases: ['IVC', 'vena cava', 'اجوف'], descriptionEn: 'The IVC returns blood from the lower body to the right atrium. It is typically to the patient right of the aorta.', descriptionFa: 'ورید اجوف تحتانی خون بخش‌های تحتانی بدن را به دهلیز راست بازمی‌گرداند و معمولاً در سمت راست بیمار نسبت به آئورت قرار دارد.', shape: 'ivc' },
    { id: 'aorta', nameEn: 'Abdominal aorta', nameFa: 'آئورت شکمی', color: '#E6B65F', region: 'vessel', aliases: ['aortic', 'aorta', 'آئورت'], descriptionEn: 'The abdominal aorta is an arterial landmark anterior to the vertebral body. Check it against orientation markers.', descriptionFa: 'آئورت شکمی یک شاخص شریانی در جلوی جسم مهره‌ای است. جهت آن را باید با نشانگرهای جهت تصویر تطبیق داد.', shape: 'aorta' },
    { id: 'vertebra', nameEn: 'Vertebral body', nameFa: 'جسم مهره', color: '#B5BEC9', region: 'posterior', aliases: ['spine', 'vertebral', 'مهره'], descriptionEn: 'The vertebral body is a posterior midline bony landmark. This schematic does not represent real CT windowing.', descriptionFa: 'جسم مهره یک شاخص استخوانی در خط میانی خلفی است. این شکل شماتیک، پنجره و سطح یک CT واقعی را بازنمایی نمی‌کند.', shape: 'vertebra' },
    { id: 'right-psoas', nameEn: 'Right psoas major', nameFa: 'عضلهٔ پسواس راست', color: '#C28C78', region: 'posterior', aliases: ['psoas', 'iliopsoas', 'پسواس'], descriptionEn: 'Psoas major runs along the anterolateral lumbar vertebral bodies. This is not a segmentation mask.', descriptionFa: 'عضلهٔ پسواس بزرگ در امتداد بخش قدامی‌ـ‌جانبی اجسام مهره‌ای کمری قرار می‌گیرد. این تصویر ماسک قطعه‌بندی نیست.', shape: 'right-psoas' },
    { id: 'left-psoas', nameEn: 'Left psoas major', nameFa: 'عضلهٔ پسواس چپ', color: '#A88B79', region: 'posterior', aliases: ['psoas', 'iliopsoas', 'پسواس'], descriptionEn: 'Paired psoas muscles are posterior landmarks near the lumbar spine. Anatomy and slice appearance vary.', descriptionFa: 'عضلات جفت پسواس از شاخص‌های خلفی نزدیک ستون مهره‌های کمری هستند. شکل واقعی آن‌ها با آناتومی فرد و سطح برش تغییر می‌کند.', shape: 'left-psoas' },
    { id: 'stomach', nameEn: 'Stomach (schematic)', nameFa: 'معده (شماتیک)', color: '#D2A7A1', region: 'organ', aliases: ['gastric', 'معده'], descriptionEn: 'The stomach is only a soft schematic region; position, distension and contents vary substantially.', descriptionFa: 'معده در این نمونه تنها به‌شکل یک ناحیهٔ شماتیک نمایش داده شده است؛ موقعیت، اتساع و محتویات آن متغیرند.', shape: 'stomach' }
  ];
  const api = {
    items: anatomy,
    byId: function (id) { return anatomy.find(function (item) { return item.id === id; }) || anatomy[0]; },
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
