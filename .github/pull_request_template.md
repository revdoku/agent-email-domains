<!-- For each domain you add or change: -->

- Domain:
- Provider:
- Category: `agent_inbox` / `test_inbox`
- Evidence URL (provider page showing inbox addresses on this domain):
- `dig +short MX <domain>` output:

- [ ] The domain gives out inboxes created by software, not only the company's own mail.
- [ ] I ran `node scripts/build.mjs` and committed the changed `lists/` files.
- [ ] `node scripts/check-domains.mjs` passes.
