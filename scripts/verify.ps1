$ErrorActionPreference = 'Stop'
foreach ($check in @('lint', 'typecheck', 'test', 'format:check')) {
  pnpm run $check
  if ($LASTEXITCODE -ne 0) { throw "$check failed" }
}
git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Diff check failed' }
