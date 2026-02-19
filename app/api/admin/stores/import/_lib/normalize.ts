/**
 * normalize.ts — Re-export من storeRow.ts (Phase 4)
 * يوفر التوافق مع الكود القديم الذي يستورد من هذا الملف
 */
export {
  normalizeStoreRow as normalizeRow,
  getDedupKeys,
  findDedupMatch,
} from '@/lib/import/normalize/storeRow';

export type {
  NormalizedStoreRow as NormalizedRow,
  NormalizeResult,
  RowIssue,
  AutoFix,
  DedupKeys,
  DedupMatch,
} from '@/lib/import/normalize/storeRow';
