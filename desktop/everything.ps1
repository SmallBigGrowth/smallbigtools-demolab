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

# Start recording the whole desktop
$ff = Start-Process ffmpeg -ArgumentList '-y','-loglevel','error','-f','gdigrab','-framerate','30','-draw_mouse','1','-i','desktop','-t','26','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',"$out\everything-raw.mp4" -PassThru -NoNewWindow
Start-Sleep 1

Start-Process $exe
Start-Sleep 5   # indexing the NTFS drive takes a few seconds on first run
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms
[Microsoft.VisualBasic.Interaction]::AppActivate((Get-Process Everything).Id) | Out-Null
Start-Sleep 1
# Maximise (Win+Up is unreliable without a user session, so use the window menu)
[System.Windows.Forms.SendKeys]::SendWait('% x'); Start-Sleep 1

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
