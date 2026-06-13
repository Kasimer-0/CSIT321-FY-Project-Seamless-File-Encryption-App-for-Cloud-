# Code Origin and Feature Notes

This file records the practical ownership boundary used when commenting this repository. It is based on the Git history and the archived Codex thread `019e9aca-188c-74f0-af63-6a5df71cc85e`.

## Frontend baseline

- Commit `bc970c7` (`Add files via upload`, 2026-05-28, author WFO002) is the main teammate frontend baseline. It introduced the dashboard layout and most original customer/admin pages.
- Earlier commit `3b703c0` (2026-05-19, author Kasimer-0) contains the first frontend version.
- Later commits by WFO002/jhlow019 were checked as well. They do not account for the integration features listed below.

## Codex-added frontend work

The following changes were implemented through Codex sessions and pushed using the repository owner's Git identity. For that reason, Git author name alone is not sufficient to distinguish them from manually pushed work.

| Commit | Purpose | Main frontend files |
| --- | --- | --- |
| `7e12a7e`, `ca9c845`, `554f366` | Restore a working Vite build and provide the local toast compatibility module | `MFA.tsx`, `lib/reactHotToast.tsx`, `vite.config.ts`, `tsconfig.app.json` |
| `4dae21b` | Store and render ticket conversations using `TicketResponse` and `senderRole` | ticket pages, `Entity.ts`, `Type.ts` |
| `ec5164d` | Connect customer plan purchase/downgrade to the backend and refresh the logged-in user | `App.tsx`, `CustomerDashboard.tsx`, `CustomerViewAccountPage.tsx`, type files |
| `e6dd4fb` | Complete remaining user-story flows: reports/logs, privacy scan, key management, recovery phrase and physical tokens | related admin/customer pages and type files |
| `bd6c909` | Add cloud-provider limits and Bootstrap-related website integration | `CustomerManageCloudAccLinksPage.tsx`, `CustomerDashboard.tsx` |
| `b66bb43` | Add Google Drive OAuth plus encrypted upload/decrypt-download controls | `CustomerManageCloudAccLinksPage.tsx`, type files |
| `d78d18b` | Make packaged desktop requests resolve to the embedded backend | desktop build/static-resource integration |

## Commenting convention

- `Codex integration note` identifies a complete file or a focused block added during the integration work.
- The comment states both what the code does and why it was needed.
- Existing teammate layout, visual styling, labels, and unrelated logic are intentionally left unchanged.
- Backend comments describe responsibilities and non-obvious flows. They are documentation, not a claim that every backend line was written in one session.
