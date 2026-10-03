$ErrorActionPreference = 'Stop'
$env:DIRECT_URL='postgresql://uptimeforge:uptimeforge@localhost:55432/uptimeforge_test'
pnpm exec prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Test migration failed' }
pnpm exec prisma migrate status
if ($LASTEXITCODE -ne 0) { throw 'Migration status failed' }
Remove-Item Env:DIRECT_URL
