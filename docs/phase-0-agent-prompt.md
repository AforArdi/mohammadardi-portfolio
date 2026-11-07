# Next Antigravity task: targeted corrections and Phase 0 only

Read `docs/plan-revision-check.md` and the current `docs/implementation-plan.md` in `C:\projects\mohammadardi-portfolio`.

The current plan is not approved for Phase 1 or infrastructure work. Complete this bounded task:

1. Correct V1–V6 and the reconciliation table's remaining concrete gaps in the plan. Verify published versions and SDK APIs rather than guessing them. Fix the nonce insert/transaction and error outcomes, byte-counter type/accounting, and supported cleanup scheduler. Write honest resolved/partial/pending statuses with evidence. Preserve the existing visual identity, content scope and fixed 24-hour session. Keep the simple single-app architecture.
2. Establish Phase 0's recoverable source baseline. Verify the exact repository path and whether Git already exists or a parent worktree owns it. If this folder is not already versioned, initialise a local repository and a dedicated migration branch. Inspect exclusions before staging: never commit credentials, real environment files, `node_modules`, build outputs, logs, private backups or unrelated project material. Make a baseline commit before source/tooling edits. Do not change or initialise any other repository.
3. Record existing Node/pnpm versions and run the existing Vite build/lint. If still present, fix only the three documented ESLint errors in `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, and `tailwind.config.ts`, then rerun the affected checks. Avoid adjacent UI refactors. Preserve the current dependency versions and lockfiles during this baseline task; defer package replacement and redundant-lockfile cleanup to the approved migration slice. If the existing installation prevents verification, report the cause rather than upgrading packages to mask it.
4. Create `docs/implementation-status.md` recording the baseline commit, exact changed files, actual commands/exit results, unresolved issues and proposed next slice. Distinguish specification corrections from implemented behaviour. Stop at this checkpoint for Codex's focused check before Phase 1.

No dependency installation/upgrades, database/project provisioning, migrations, seeds, authentication implementation, pushes, deployment, DNS changes or production operations in this task. Do not work in the unrelated SureSale repositories. No new services are required merely to satisfy review wording.

Return the corrected plan's resolution summary, Phase 0 commit identifier(s), verification results and remaining owner decisions. Do not mark the whole portfolio migration complete.
