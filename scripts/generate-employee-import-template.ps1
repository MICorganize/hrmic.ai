param(
  [string]$OutputPath = "public/templates/employee-import-template.xlsx"
)

$ErrorActionPreference = "Stop"
$root = Join-Path ([System.IO.Path]::GetTempPath()) ("employee-import-template-" + [guid]::NewGuid().ToString("N"))
$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))

try {
  New-Item -ItemType Directory -Path (Join-Path $root "_rels"), (Join-Path $root "xl/_rels"), (Join-Path $root "xl/worksheets") -Force | Out-Null
  New-Item -ItemType Directory -Path (Split-Path -Parent $output) -Force | Out-Null

  [System.IO.File]::WriteAllText((Join-Path $root "[Content_Types].xml"), @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>
'@, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $root "_rels/.rels"), @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>
'@, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $root "xl/workbook.xml"), @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="นำเข้าข้อมูลพนักงาน" sheetId="1" r:id="rId1"/></sheets></workbook>
'@, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $root "xl/_rels/workbook.xml.rels"), @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>
'@, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText((Join-Path $root "xl/worksheets/sheet1.xml"), @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="10" width="20" customWidth="1"/></cols><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>รหัสพนักงาน</t></is></c><c r="B1" t="inlineStr"><is><t>คำนำหน้า</t></is></c><c r="C1" t="inlineStr"><is><t>ชื่อ</t></is></c><c r="D1" t="inlineStr"><is><t>นามสกุล</t></is></c><c r="E1" t="inlineStr"><is><t>อีเมล</t></is></c><c r="F1" t="inlineStr"><is><t>เบอร์โทรศัพท์</t></is></c><c r="G1" t="inlineStr"><is><t>หน่วยงาน</t></is></c><c r="H1" t="inlineStr"><is><t>ตำแหน่ง</t></is></c><c r="I1" t="inlineStr"><is><t>ประเภทพนักงาน</t></is></c><c r="J1" t="inlineStr"><is><t>วันที่เริ่มงาน</t></is></c></row></sheetData></worksheet>
'@, [System.Text.UTF8Encoding]::new($false))

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($root, $output)
} finally {
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
