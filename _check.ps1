$src = 'C:\Users\Kaan\brewmaster\Brewmaster_v2_79_10.html'
$tmp = 'C:\Users\Kaan\brewmaster\_check.js'
$content = [System.IO.File]::ReadAllText($src, [System.Text.UTF8Encoding]::new($false))
$regex = [regex]'<script(?:\s[^>]*)?>([\s\S]*?)</script>'
$matches = $regex.Matches($content)
$blocks = @()
foreach ($m in $matches) {
  $full = $m.Value
  if ($full -match 'src\s*=') { continue }
  $inner = $m.Groups[1].Value
  if ($inner.Trim().Length -eq 0) { continue }
  $blocks += $inner
}
$js = ($blocks -join "`n;//=====SCRIPT-BOUNDARY=====`n")
[System.IO.File]::WriteAllText($tmp, $js, [System.Text.UTF8Encoding]::new($false))
Write-Host ("Inline scripts: {0} | JS size: {1} bytes" -f $blocks.Count, $js.Length)
& node --check $tmp
if ($LASTEXITCODE -eq 0) { Write-Host "SYNTAX_OK" } else { Write-Host "SYNTAX_FAIL exit=$LASTEXITCODE" }
