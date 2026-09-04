param([string]$InputPath = "$env:TEMP\thailand-geography.json")

$rows = Get-Content -LiteralPath $InputPath -Raw -Encoding utf8 | ConvertFrom-Json
$sql = [Text.StringBuilder]::new()
$null = $sql.AppendLine('BEGIN;')
$seenProvinces = @{}
$seenDistricts = @{}

function Q([object]$value) {
  if ($null -eq $value) { return 'NULL' }
  return "'$(([string]$value).Replace("'", "''"))'"
}
function Code([object]$value, [int]$width) { return ([string]$value).PadLeft($width, '0') }

foreach ($row in $rows) {
  $provinceCode = Code $row.provinceCode 2
  if (-not $seenProvinces.ContainsKey($provinceCode)) {
    $seenProvinces[$provinceCode] = $true
    $provinceId = [guid]::NewGuid().ToString()
    $null = $sql.AppendLine("INSERT INTO `"Province`" (id, code, `"nameTH`", `"nameEN`") VALUES ($(Q $provinceId), $(Q $provinceCode), $(Q $row.provinceNameTh), $(Q $row.provinceNameEn)) ON CONFLICT (code) DO UPDATE SET `"nameTH`" = EXCLUDED.`"nameTH`", `"nameEN`" = EXCLUDED.`"nameEN`";")
  }
}

foreach ($row in $rows) {
  $provinceCode = Code $row.provinceCode 2
  $districtCode = Code $row.districtCode 4
  $key = "$provinceCode|$districtCode"
  if (-not $seenDistricts.ContainsKey($key)) {
    $seenDistricts[$key] = $true
    $districtId = [guid]::NewGuid().ToString()
    $provinceRef = "(SELECT id FROM `"Province`" WHERE code = $(Q $provinceCode))"
    $null = $sql.AppendLine("INSERT INTO `"District`" (id, `"provinceId`", code, `"nameTH`", `"nameEN`") VALUES ($(Q $districtId), $provinceRef, $(Q $districtCode), $(Q $row.districtNameTh), $(Q $row.districtNameEn)) ON CONFLICT (`"provinceId`", code) DO UPDATE SET `"nameTH`" = EXCLUDED.`"nameTH`", `"nameEN`" = EXCLUDED.`"nameEN`";")
  }
}

foreach ($row in $rows) {
  $provinceCode = Code $row.provinceCode 2
  $districtCode = Code $row.districtCode 4
  $subdistrictCode = Code $row.subdistrictCode 6
  $districtRef = "(SELECT d.id FROM `"District`" d JOIN `"Province`" p ON p.id = d.`"provinceId`" WHERE p.code = $(Q $provinceCode) AND d.code = $(Q $districtCode))"
  $postalCode = if ($null -eq $row.postalCode) { $null } else { Code $row.postalCode 5 }
  $null = $sql.AppendLine("INSERT INTO `"Subdistrict`" (id, `"districtId`", code, `"nameTH`", `"nameEN`", `"postalCode`") VALUES ($(Q ([guid]::NewGuid().ToString())), $districtRef, $(Q $subdistrictCode), $(Q $row.subdistrictNameTh), $(Q $row.subdistrictNameEn), $(Q $postalCode)) ON CONFLICT (`"districtId`", code) DO UPDATE SET `"nameTH`" = EXCLUDED.`"nameTH`", `"nameEN`" = EXCLUDED.`"nameEN`", `"postalCode`" = EXCLUDED.`"postalCode`";")
}

$null = $sql.AppendLine('COMMIT;')
$sqlPath = Join-Path $env:TEMP 'thailand-geography-import.sql'
[IO.File]::WriteAllText($sqlPath, $sql.ToString(), [Text.UTF8Encoding]::new($false))
Write-Output $sqlPath
