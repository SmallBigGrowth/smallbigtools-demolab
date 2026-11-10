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
# Bigger text so it stays readable once the video is cropped to a phone screen (settings from voidtools' ini docs)
Set-Content "$env:TEMP\everything\Everything.ini" "[Everything]`r`napp_data=0`r`nresult_list_font=Segoe UI`r`nresult_list_font_size=24`r`nsearch_edit_font=Segoe UI`r`nsearch_edit_font_size=30`r`nname_column_width=620`r`npath_column_width=560`r`nsize_column_width=150`r`ndate_modified_column_width=260`r`n"

Start-Process $exe
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep 3
[Microsoft.VisualBasic.Interaction]::AppActivate((Get-Process Everything).Id) | Out-Null
Start-Sleep 1
# Maximise (Win+Up is unreliable without a user session, so use the window menu)
[System.Windows.Forms.SendKeys]::SendWait('% x'); Start-Sleep 1
# Zoom the results so text stays readable once the video is cropped to a phone screen

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
# Bring Everything to the front for real and put the cursor in its search box: click the box, then park
# the mouse in the empty bottom-right corner so no tooltip pops up over the results.
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class W {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
  public static void Click(int x, int y) { SetCursorPos(x, y); mouse_event(2, 0, 0, 0, 0); mouse_event(4, 0, 0, 0, 0); }
}
'@
$h = (Get-Process Everything).MainWindowHandle
[W]::ShowWindow($h, 3) | Out-Null   # 3 = maximise
[W]::SetForegroundWindow($h) | Out-Null
Start-Sleep 1
[W]::Click(900, 76)                 # the search box (maximised window, 1920x1080)
Start-Sleep -Milliseconds 300
[W]::SetCursorPos(1880, 960) | Out-Null

# Start recording the whole desktop
$ff = Start-Process ffmpeg -ArgumentList '-y','-loglevel','error','-f','gdigrab','-framerate','30','-draw_mouse','1','-i','desktop','-t','24','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p',"$out\demo.mp4" -PassThru -NoNewWindow
Start-Sleep 2
[W]::SetForegroundWindow($h) | Out-Null

function Type-Slow($text) { foreach ($c in $text.ToCharArray()) { [System.Windows.Forms.SendKeys]::SendWait([string]$c); Start-Sleep -Milliseconds 140 } }
Type-Slow 'electricity bill'
Start-Sleep 3
[System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 400
Type-Slow 'form-16'
Start-Sleep 3
[System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 400
Type-Slow '*.pdf'
Start-Sleep 4

$ff.WaitForExit()
Get-Process Everything -ErrorAction SilentlyContinue | Stop-Process
Get-ChildItem $out
