# Prepares the Windows x64 CPU runtime once; npm starts it from the cache thereafter.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot
$cache = Join-Path $root '.local-data/model'
$null = New-Item -ItemType Directory -Path $cache -Force

function Get-VerifiedFile($name, $sha256, [string[]]$urls) {
    $target = Join-Path $cache $name
    if ((Test-Path -LiteralPath $target) -and (Get-FileHash -LiteralPath $target).Hash -eq $sha256) {
        return $target
    }
    $partial = "$target.$PID.partial"
    try {
        foreach ($url in $urls) {
            try {
                Write-Host "Downloading $name from $(([uri]$url).Host)..."
                Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $partial -TimeoutSec 1200
                if ((Get-FileHash -LiteralPath $partial).Hash -ne $sha256) { throw 'SHA-256 mismatch.' }
                Move-Item -LiteralPath $partial -Destination $target -Force
                return $target
            } catch {
                if ($url -eq $urls[-1]) { throw }
                Write-Warning 'Trying the other official model host.'
            }
        }
    } finally {
        if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial }
    }
}

$lock = [IO.File]::Open((Join-Path $cache 'prepare.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
try {
    $archive = Get-VerifiedFile 'llama.zip' '837c1655e87df3b66989f4be33a792a1399c785bf259038dc75c900096683e69' @(
        'https://github.com/ggml-org/llama.cpp/releases/download/b12359/llama-b12359-bin-win-cpu-x64.zip')
    $runtime = Join-Path $cache 'runtime'
    if (!(Test-Path -LiteralPath (Join-Path $runtime 'llama-server.exe'))) {
        $staging = Join-Path $cache "runtime-$PID"
        Expand-Archive -LiteralPath $archive -DestinationPath $staging -Force
        [IO.Directory]::Move($staging, $runtime)
    }
    $model = 'qwen2.5-0.5b-instruct-q4_k_m.gguf'
    $null = Get-VerifiedFile $model '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db' @(
        "https://modelscope.cn/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/2e50b77b0eee3083842019e257b74854323d880a/$model",
        "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/6dd44a1fb35d11b5d1b28902876ce3cc9e882d0e/$model")
} finally {
    $lock.Dispose()
}

& node (Join-Path $PSScriptRoot 'start-cached-model.mjs')
if ($LASTEXITCODE -ne 0) { throw 'The local model did not start.' }
$deadline = (Get-Date).AddSeconds(60)
do {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:39281/health' -TimeoutSec 2
        if ($health.status -eq 'ok') {
            $models = Invoke-RestMethod -Uri 'http://127.0.0.1:39281/v1/models' -TimeoutSec 2
            if ($models.data.id -contains 'moments-journal') {
                Write-Host 'The local model is ready on 127.0.0.1:39281.'
                return
            }
        }
    } catch { }
    Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)
throw 'Model unavailable. Check free memory and whether port 39281 is occupied, then run this script again.'
