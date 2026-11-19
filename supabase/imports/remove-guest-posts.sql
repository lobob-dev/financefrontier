-- Removes the six posts written by Natesh Nagarajah, and the two thin posts if they are still there.
-- Paste into the Supabase SQL Editor and press Run. Running it twice is safe.
delete from public.posts where slug in (
  'weekly-market-inspection-1-aspire-mining-ltd',
  'weekly-market-inspection-2-china-sxt-pharmaceuticals-inc',
  'weekly-market-inspection-3-pathward-financial-inc',
  'next-technology-holding-inc-quality-or-not',
  'asx-small-cap-gems-uos',
  'careers-in-finance-which-path-should-you-pick',
  'journey-and-motivation',
  'how-to-build-a-strong-financial-foundation'
);
