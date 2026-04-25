# Yerel geliştirme: Backend başlatma scripti
# Kullanım: .\start-backend.ps1

$ProjectRoot = "C:\Users\Elanur\Desktop\YZTA-P2P-Project"
$BackendRoot = "$ProjectRoot\backend"
$Python     = "$BackendRoot\.venv\Scripts\python.exe"
$AppDir     = "$BackendRoot\app"

if (-not (Test-Path $Python)) {
    Write-Host "HATA: .venv bulunamadi. Once su komutu calistirin:" -ForegroundColor Red
    Write-Host "  cd $BackendRoot" -ForegroundColor Yellow
    Write-Host "  uv sync --no-dev" -ForegroundColor Yellow
    exit 1
}

Set-Location $AppDir

Write-Host "Backend baslatiliyor : http://localhost:8000" -ForegroundColor Green
Write-Host "API Dokumantasyonu   : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "(Durdurmak icin CTRL+C)" -ForegroundColor DarkGray
Write-Host ""

# Not: --reload kullanilmiyor. Watchfiles yeni degistirilen dosyalari
# aninda algilayip sonsuz yeniden yukleme dongusune girebilir.
# Kod degisikliklerinden sonra scripti yeniden baslatmak yeterli.
& $Python -m uvicorn main:app `
    --host 0.0.0.0 `
    --port 8000 `
    --log-level info
