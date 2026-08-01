param(
  [Parameter(Mandatory = $true)][string]$SourceImage
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$webPublic = Join-Path $projectRoot 'frontend\public'
$mobileAssets = Join-Path $projectRoot 'mobile\assets'
$storeAssets = Join-Path $projectRoot 'play-store-submission\assets'
New-Item -ItemType Directory -Force -Path $webPublic, $mobileAssets, $storeAssets | Out-Null

function Save-SquarePng([System.Drawing.Image]$source, [int]$size, [string]$destination) {
  $canvas = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $canvas.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $canvas.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $canvas.Dispose()
}

$master = [System.Drawing.Image]::FromFile((Resolve-Path $SourceImage))
try {
  Save-SquarePng $master 1024 (Join-Path $webPublic 'dhanam-app-icon-1024.png')
  Save-SquarePng $master 512 (Join-Path $webPublic 'android-chrome-512x512.png')
  Save-SquarePng $master 192 (Join-Path $webPublic 'android-chrome-192x192.png')
  Save-SquarePng $master 180 (Join-Path $webPublic 'apple-touch-icon.png')
  Save-SquarePng $master 48 (Join-Path $webPublic 'favicon-48x48.png')
  Save-SquarePng $master 32 (Join-Path $webPublic 'favicon-32x32.png')
  Save-SquarePng $master 16 (Join-Path $webPublic 'favicon-16x16.png')
  Save-SquarePng $master 1024 (Join-Path $mobileAssets 'icon.png')
  Save-SquarePng $master 1024 (Join-Path $mobileAssets 'adaptive-icon.png')
  Save-SquarePng $master 1024 (Join-Path $mobileAssets 'splash.png')
  Save-SquarePng $master 1024 (Join-Path $storeAssets 'dhanam-play-store-icon-1024.png')

  $icoBitmap = New-Object System.Drawing.Bitmap(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $icoGraphics = [System.Drawing.Graphics]::FromImage($icoBitmap)
  $icoGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $icoGraphics.DrawImage($master, 0, 0, 32, 32)
  $iconHandle = $icoBitmap.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
  $stream = [System.IO.File]::Create((Join-Path $webPublic 'favicon.ico'))
  $icon.Save($stream)
  $stream.Dispose()
  $icon.Dispose()
  $icoGraphics.Dispose()
  $icoBitmap.Dispose()
} finally {
  $master.Dispose()
}
