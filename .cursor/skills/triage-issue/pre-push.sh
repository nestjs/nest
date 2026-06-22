# Contents to copy into .husky/pre-push (one-time, manual — agent file-write tools
# are blocked from touching .husky/ in this environment as a safety measure, since
# git hooks auto-execute on every future `git push`). This repo already uses husky
# for pre-commit/commit-msg; this just adds the matching pre-push file in the same
# no-shebang, single-line style.
#
# From the repo root:
#   cp .cursor/skills/triage-issue/pre-push.sh .husky/pre-push
#   chmod +x .husky/pre-push
#
# (cp is fine — the comment lines above are valid no-ops in a shell script. If you'd
# rather keep .husky/pre-push minimal, just paste the one real line below by hand.)

bash .cursor/skills/triage-issue/verify-trace.sh
