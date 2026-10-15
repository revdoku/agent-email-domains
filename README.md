# agent-email-domains

Open list of email domains used by AI agents and test automation. Detect agent signups in your app.

| File | Contents |
|---|---|
| [`domains.json`](domains.json) | Every domain with provider, category and evidence |
| [`lists/all.txt`](lists/all.txt) | One domain per line |
| [`lists/agent_inbox.txt`](lists/agent_inbox.txt), [`lists/test_inbox.txt`](lists/test_inbox.txt) | One file per category |

- CDN: `https://cdn.jsdelivr.net/gh/revdoku/agent-email-domains@1/lists/all.txt`
- Each entry also covers its subdomains: `x@abc.mailosaur.net` matches `mailosaur.net`.

## Route these signups, do not block them

- `agent_inbox`: allow the signup, mark the account as an agent, offer your API or agent plan.
- `test_inbox`: allow it in staging and QA.

Agents that use a custom domain or Gmail are not detected.

## Add or correct a domain

Open an [issue](https://github.com/revdoku/agent-email-domains/issues/new/choose) or a pull request. Each domain needs public evidence: see [CONTRIBUTING.md](CONTRIBUTING.md).

[MIT](LICENSE). Maintained by [Revdoku](https://revdoku.com/?utm_source=github&utm_medium=readme&utm_campaign=agent-email-domains) — email inboxes for AI agents.
