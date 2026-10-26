# Roadmap

- [x] Turn the homepage location section into a live filter with an optional district, without changing the posting wizard
- [x] Add secure read-state support for messages
- [x] Build centralized inbox and conversation replies
- [x] Add inbox navigation and unread notification badge
- [x] Add non-overlapping AdMob placeholder spaces
- [x] Verify signed-out mobile and public listing flows
- [ ] Verify authenticated inbox end-to-end — blocked until the first user account exists
- [x] Add secure listing reports and admin moderation tools
- [x] Add the protected admin dashboard and in-place listing controls
- [ ] Verify admin moderation end-to-end — blocked until an admin account exists
- [x] Admin alerts: broadcast or specific user
- [ ] Move to external Supabase project 'Egypte Estate' (SamBro26's Org) — user removes built-in database (More → Database → Manage → Settings → Remove Database), then connects via Project Settings → General → External Supabase (OAuth); existing data is permanently deleted per user decision
- [ ] After external connect: replay drizzle/migrations 0000–0009 on the external project, re-seed governorates/districts, re-enable email signup + Google auth, recreate private listing-photos bucket, verify app end-to-end
