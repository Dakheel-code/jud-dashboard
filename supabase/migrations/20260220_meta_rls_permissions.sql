-- =====================================================
-- Meta Ads — RLS Policies (Phase 7)
-- القواعد:
--   1. service_role: صلاحية كاملة (API routes)
--   2. authenticated: قراءة cache فقط (meta_ads_cache + meta_insights_cache)
--   3. access_token_encrypted: لا يُقرأ أبداً من client — محمي بـ column security
--   4. store_meta_connections: لا يُقرأ من client إطلاقاً (service_role فقط)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- store_meta_connections
-- لا أحد يقرأها من client — service_role فقط
-- (الـ policies الحالية تغطي هذا بالفعل)
-- ─────────────────────────────────────────────────────

-- تأكيد: لا policy للـ anon أو authenticated على store_meta_connections
-- (لا نضيف شيئاً — الجدول مقفل على service_role فقط من migration السابق)


-- ─────────────────────────────────────────────────────
-- meta_ads_cache — قراءة للجميع المصادق عليهم
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_read_meta_ads" ON meta_ads_cache;
CREATE POLICY "authenticated_read_meta_ads"
  ON meta_ads_cache FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────
-- meta_insights_cache — قراءة للجميع المصادق عليهم
-- ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_read_meta_insights" ON meta_insights_cache;
CREATE POLICY "authenticated_read_meta_insights"
  ON meta_insights_cache FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────────────
-- Column Security على access_token_encrypted
-- يمنع أي SELECT يشمل هذا العمود من غير service_role
-- ─────────────────────────────────────────────────────
REVOKE SELECT ON store_meta_connections FROM authenticated;
REVOKE SELECT ON store_meta_connections FROM anon;

-- service_role يحتفظ بصلاحية كاملة (مُعطاة في migration السابق)
