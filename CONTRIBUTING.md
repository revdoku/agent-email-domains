# Contributing

## What belongs in the list

A domain belongs here when software creates inboxes on it through an API:

- `agent_inbox`: inboxes for AI agents.
- `test_inbox`: inboxes for QA and test automation.

These do not belong here:

- A provider's own company mail.
- Public temporary-mail sites. Add them to a disposable-email list instead.
- Privacy relays, such as Apple Hide My Email or Firefox Relay. Real people use them.
- Free webmail, such as Gmail.

## Evidence

Every entry needs:

- `evidence`: a public provider page (docs, API reference or quickstart) that shows inbox addresses on the domain.
- A working MX record. If inboxes use subdomains and the domain itself has no MX, set `mx_host` to one real inbox subdomain.

CI checks the MX record and the evidence page on every pull request. A weekly check opens an issue when a domain stops working.

## Add a domain

1. Edit `domains.json`. Keep the entries sorted by `domain`. Do not add a subdomain of a listed domain, because each entry covers its subdomains.
2. Run `node scripts/build.mjs` (Node.js 18 or later). Commit the changed files in `lists/`.
3. Run `node scripts/check-domains.mjs`.
4. Open a pull request and fill in the checklist.

If you cannot send a pull request, open an [Add a domain](https://github.com/revdoku/agent-email-domains/issues/new?template=add-domain.yml) issue.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `domain` | yes | Lowercase host name. It also covers all subdomains. |
| `provider` | yes | Provider name. |
| `category` | yes | `agent_inbox` or `test_inbox`. |
| `evidence` | yes | Provider page that shows inbox addresses on this domain (https). |
| `mx_host` | no | A real inbox subdomain to check for MX, when the domain itself has none. |
| `notes` | no | Short facts that matter for checking, such as "Shutting down on 2026-12-31". |

## Corrections

Use the [Correct a domain](https://github.com/revdoku/agent-email-domains/issues/new?template=correction.yml) issue form. We fix wrong entries. We remove an entry only when the domain no longer gives out inboxes. We do not remove accurate entries on request.

## License

By contributing, you agree to license your contribution under the [MIT License](LICENSE).

## Releases

A workflow releases the list on the 1st of each month when `domains.json` changed. It writes the release notes and `CHANGELOG.md` from the changes. A new or removed domain is a minor release. A change to other fields is a patch release. The npm package updates on the same day.
