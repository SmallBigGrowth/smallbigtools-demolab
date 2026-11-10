# Records a demo of "Everything" (voidtools, freeware) on a throwaway GitHub Actions Windows machine.
# Downloads the official portable build, creates some sample files, records the screen while a search is typed.
$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'out'; New-Item -ItemType Directory -Force $out | Out-Null

# Sample files so the search has something recognisable to find (all created here, nothing real)
$docs = "$env:USERPROFILE\Documents\Bills"
New-Item -ItemType Directory -Force $docs | Out-Null
foreach ($m in 'jan','feb','mar','apr','may','jun','jul','aug','sep','oct') {
  Set-Content "$docs\electricity-bill-$m-2026.pdf" 'sample'
  Set-Content "$docs\rent-receipt-$m-2026.pdf" 'sample'
}
New-Item -ItemType Directory -Force "$env:USERPROFILE\Desktop\Old stuff\Taxes\2025" | Out-Null
Set-Content "$env:USERPROFILE\Desktop\Old stuff\Taxes\2025\form-16-2025.pdf" 'sample'

# Official portable build
$zip = "$env:TEMP\everything.zip"
Invoke-WebRequest 'https://www.voidtools.com/Everything-1.4.1.1032.x64.zip' -OutFile $zip
Expand-Archive $zip "$env:TEMP\everything" -Force
$exe = "$env:TEMP\everything\Everything.exe"

Start-Process $exe
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep 3
[Microsoft.VisualBasic.Interaction]::AppActivate((Get-Process Everything).Id) | Out-Null
Start-Sleep 1
# Maximise (Win+Up is unreliable without a user session, so use the window menu)
[System.Windows.Forms.SendKeys]::SendWait('% x'); Start-Sleep 1

# The first index of the runner's large C: drive takes a while. Wait until a known file shows up in
# Everything's results (checked with its official command-line client) before recording.
Invoke-WebRequest 'https://www.voidtools.com/ES-1.1.0.30.x64.zip' -OutFile "$env:TEMP\es.zip" -ErrorAction SilentlyContinue
if (Test-Path "$env:TEMP\es.zip") { Expand-Archive "$env:TEMP\es.zip" "$env:TEMP\es" -Force }
$es = Get-ChildItem "$env:TEMP\es" -Filter es.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
for ($i = 0; $i -lt 60; $i++) {
  if ($es) { $hit = & $es.FullName 'form-16-2025.pdf' 2>$null; if ($hit) { Write-Host "Index ready after $($i*3)s"; break } }
  elseif ($i -ge 30) { break }
  Start-Sleep 3
}
Start-Sleep 2
[Microsoft.VisualBasic.Interaction]::AppActivate((Get-Process Everything).Id) | Out-Null

# Start recording the whole desktop
$ff = Start-Process ffmpeg -ArgumentList '-y','-loglevel','error','-f','gdigrab','-framerate','30','-draw_mouse','1','-i','desktop','-t','24','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',"$out\everything-raw.mp4" -PassThru -NoNewWindow
Start-Sleep 2

function Type-Slow($text) { foreach ($c in $text.ToCharArray()) { [System.Windows.Forms.SendKeys]::SendWait([string]$c); Start-Sleep -Milliseconds 140 } }
Type-Slow 'electricity bill'
Start-Sleep 3
[System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 400
Type-Slow 'form 16'
Start-Sleep 3
[System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 400
Type-Slow '*.pdf'
Start-Sleep 4

$ff.WaitForExit()
Get-Process Everything -ErrorAction SilentlyContinue | Stop-Process
Get-ChildItem $out
