-- ============================================================
-- Migration 008: تصحيح أسماء العملاء يدوياً
-- المصدر: بيانات مُرسلة من المستخدم
-- ============================================================

UPDATE clients SET name = 'عبدالكريم'      WHERE phone = '+966544811492';
UPDATE clients SET name = 'عبدالرحمن'      WHERE phone = '+966548897555';
UPDATE clients SET name = 'محمد'            WHERE phone = '+966534069029';
UPDATE clients SET name = 'فيصل'            WHERE phone = '+966552199219';
UPDATE clients SET name = 'احمد'            WHERE phone = '+966506801447';
UPDATE clients SET name = 'ريام'            WHERE phone = '+966550884430';
UPDATE clients SET name = 'سلطان الحربي'   WHERE phone = '+966558113336';
UPDATE clients SET name = 'محمد الصلاحي'   WHERE phone = '+966552185888';
UPDATE clients SET name = 'نورة'            WHERE phone = '+966504309166';
UPDATE clients SET name = 'بسمة'            WHERE phone = '+966553449661';
UPDATE clients SET name = 'ناصر'            WHERE phone = '+966590404204';
UPDATE clients SET name = 'عاليا'           WHERE phone = '+966506212161';
UPDATE clients SET name = 'ابتسام'          WHERE phone = '+966552228282';
UPDATE clients SET name = 'سارة'            WHERE phone = '+966561111901';
UPDATE clients SET name = 'ناصر'            WHERE phone = '+966555384345';
UPDATE clients SET name = 'احمد'            WHERE phone = '+966558068998';
UPDATE clients SET name = 'محمد الخليفة'   WHERE phone = '+966567604492';
UPDATE clients SET name = 'منيرة'           WHERE phone = '+966551523322';
UPDATE clients SET name = 'نوره'            WHERE phone = '+966533960980';
UPDATE clients SET name = 'وليد'            WHERE phone = '+966546867479';
UPDATE clients SET name = 'عبدالعزيز'      WHERE phone = '+966568585762';
UPDATE clients SET name = 'اريج'            WHERE phone = '+966534644236';
UPDATE clients SET name = 'لينا'            WHERE phone = '+966535426644';
UPDATE clients SET name = 'يوسف'            WHERE phone = '+966550288808';
UPDATE clients SET name = 'ام يوسف'        WHERE phone = '+966545160428';
UPDATE clients SET name = 'رهف'             WHERE phone = '+966556038431';
UPDATE clients SET name = 'تركي'            WHERE phone = '+966556555329';
UPDATE clients SET name = 'دلال'            WHERE phone = '+966505224051';
UPDATE clients SET name = 'فيصل'            WHERE phone = '+966590933288';
UPDATE clients SET name = 'محمد ابوشام'    WHERE phone = '+966557424246';
UPDATE clients SET name = 'كريم'            WHERE phone = '+19056174053';

-- الأرقام التي بدون اسم (فارغة في القائمة) — تُترك كما هي
-- +966559239038
-- +966567439567
-- +966558310032
-- +966559911704

-- تقرير
DO $$
DECLARE v_fixed INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_fixed
  FROM clients
  WHERE name NOT LIKE '%Ù%' AND name NOT LIKE '%Ø%' AND name NOT LIKE '%Ã%'
    AND name !~ '^[0-9+]+$';
  RAISE NOTICE 'عدد العملاء بأسماء صحيحة الآن: %', v_fixed;
END $$;
