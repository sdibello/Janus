param(
    [Parameter(Mandatory)] [string] $Email,
    [Parameter(Mandatory)] [securestring] $Password,
    [string] $BaseUrl = 'http://localhost:5186',
    [string] $DatabasePath
)

$ErrorActionPreference = 'Stop'
$passwordText = ConvertFrom-SecureString $Password -AsPlainText
$changedPassword = "Changed passphrase $([guid]::NewGuid().ToString('N'))"
$resetPassword = "Reset passphrase $([guid]::NewGuid().ToString('N'))"

function Post-Json([string] $path, [object] $body, $session) {
    Invoke-WebRequest -Uri "$BaseUrl$path" -Method Post -ContentType 'application/json' `
        -Headers @{ Origin = $BaseUrl } -Body ($body | ConvertTo-Json -Compress) -WebSession $session -SkipHttpErrorCheck
}

function Check([int] $actual, [int] $expected, [string] $name) {
    if ($actual -ne $expected) { throw "$name expected $expected but got $actual" }
    Write-Output "PASS $name"
}

function Get-ResetLink([string] $recipient) {
    $messages = Invoke-RestMethod "$BaseUrl/dev/inbox"
    $message = $messages | Where-Object { $_.recipient -eq $recipient -and $_.subject -eq 'Reset your Janus password' } | Select-Object -First 1
    if (-not $message) { throw 'Password reset message missing from local inbox' }
    $query = [System.Web.HttpUtility]::ParseQueryString(([uri] $message.actionUrl).Query)
    @{ userId = $query['resetUser']; token = $query['resetToken'] }
}

$sessionA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Check (Post-Json '/account/login' @{ identifier = $Email; password = $passwordText; rememberMe = $true } $sessionA).StatusCode 200 'remembered first login'
Check (Post-Json '/account/login' @{ identifier = $Email; password = $passwordText; rememberMe = $false } $sessionB).StatusCode 200 'second login'
Check (Post-Json '/account/change-password' @{ currentPassword = 'wrong password'; newPassword = $changedPassword } $sessionA).StatusCode 400 'incorrect current password denied'
Check (Post-Json '/account/change-password' @{ currentPassword = $passwordText; newPassword = 'passwordpassword' } $sessionA).StatusCode 400 'blocked new password denied'
Check (Post-Json '/account/change-password' @{ currentPassword = $passwordText; newPassword = $changedPassword } $sessionA).StatusCode 200 'password changed'
Check (Invoke-WebRequest "$BaseUrl/account/me" -WebSession $sessionA -SkipHttpErrorCheck).StatusCode 200 'changing session stays signed in'
$currentCookie = $sessionA.Cookies.GetCookies([uri] $BaseUrl) | Where-Object Name -eq '.AspNetCore.Identity.Application' | Select-Object -First 1
if (!$currentCookie -or $currentCookie.Expires -lt [datetime]::UtcNow.AddDays(29)) {
    throw 'Password change did not preserve the remembered current session.'
}
Write-Output 'PASS password change preserves Remember me'
Check (Invoke-WebRequest "$BaseUrl/account/me" -WebSession $sessionB -SkipHttpErrorCheck).StatusCode 401 'other session revoked after change'
Check (Post-Json '/account/login' @{ identifier = $Email; password = $passwordText; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 401 'old password denied after change'

$absent = Post-Json '/account/request-password-reset' @{ email = 'nobody@example.test' } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
$present = Post-Json '/account/request-password-reset' @{ email = $Email } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $absent.StatusCode 200 'unknown email recovery response'
Check $present.StatusCode 200 'known email recovery response'
if ($absent.Content -ne $present.Content) { throw 'Recovery responses disclose account existence' }
Write-Output 'PASS neutral recovery response'
$firstLink = Get-ResetLink $Email
Check (Post-Json '/account/request-password-reset' @{ email = $Email } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 200 'repeat recovery request'
$link = Get-ResetLink $Email
if ($firstLink.token -eq $link.token) { throw 'Repeated recovery requests produced the same proof' }
Write-Output 'PASS distinct recovery proofs'
Check (Post-Json '/account/reset-password' @{ userId = $link.userId; token = 'invalid'; newPassword = $resetPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 400 'invalid reset proof denied'
Check (Post-Json '/account/reset-password' @{ userId = $link.userId; token = $link.token; newPassword = 'passwordpassword' } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 400 'blocked reset password denied'
Check (Post-Json '/account/reset-password' @{ userId = $link.userId; token = $link.token; newPassword = $resetPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 200 'valid reset proof accepted after blocked password'
Check (Post-Json '/account/reset-password' @{ userId = $link.userId; token = $link.token; newPassword = $resetPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 400 'used reset proof denied'
Check (Post-Json '/account/reset-password' @{ userId = $firstLink.userId; token = $firstLink.token; newPassword = $changedPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 400 'earlier proof invalidated by reset'
Check (Invoke-WebRequest "$BaseUrl/account/me" -WebSession $sessionA -SkipHttpErrorCheck).StatusCode 401 'existing session revoked after reset'
Check (Post-Json '/account/login' @{ identifier = $Email; password = $changedPassword; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 401 'old password denied after reset'
Check (Post-Json '/account/login' @{ identifier = $Email; password = $resetPassword; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 200 'new password accepted after reset'

if ($DatabasePath) {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python is required for the optional expiry check' }
    Check (Post-Json '/account/request-password-reset' @{ email = $Email } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 200 'second recovery request'
    $expiredLink = Get-ResetLink $Email
    $hashBytes = [System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($expiredLink.token))
    $tokenHash = [Convert]::ToHexString($hashBytes)
    python -c 'import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute("UPDATE PasswordResetProofs SET ExpiresAtUtc = ? WHERE TokenHash = ?", ("2000-01-01 00:00:00", sys.argv[2])); db.commit()' $DatabasePath $tokenHash
    if ($LASTEXITCODE -ne 0) { throw 'Could not expire test proof' }
    Check (Post-Json '/account/reset-password' @{ userId = $expiredLink.userId; token = $expiredLink.token; newPassword = $changedPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode 400 'expired reset proof denied'
}
