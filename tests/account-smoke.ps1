param(
    [Parameter(Mandatory)] [string] $AdminIdentifier,
    [Parameter(Mandatory)] [string] $AdminEmail,
    [Parameter(Mandatory)] [securestring] $AdminPassword
)

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5186'
$adminPasswordText = ConvertFrom-SecureString $AdminPassword -AsPlainText
$userPassword = "Smoke-Passphrase-$([guid]::NewGuid().ToString('N'))"

function Send-Json([string]$path, [object]$body, $session) {
    Invoke-WebRequest -Uri "$base$path" -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress) -WebSession $session -SkipHttpErrorCheck
}

function Check([int]$actual, [int]$expected, [string]$name) {
    if ($actual -ne $expected) { throw "$name expected $expected but got $actual" }
    Write-Output "PASS $name"
}

function Get-LinkParts([string]$url) {
    $values = [System.Web.HttpUtility]::ParseQueryString(([uri]$url).Query)
    @{ userId = $values['verifyUser']; token = $values['verifyToken'] }
}

$inbox = Invoke-RestMethod "$base/dev/inbox"
$adminLink = ($inbox | Where-Object recipient -eq $AdminEmail | Select-Object -First 1).actionUrl
if (-not $adminLink) { throw 'Administrator verification message not found; use a fresh database' }
$response = Send-Json '/account/login' @{ identifier = $AdminIdentifier; password = $adminPasswordText; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 401 'unverified administrator denied'
$response = Send-Json '/account/verify-email' (Get-LinkParts $adminLink) (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 200 'administrator email verified'
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$response = Send-Json '/account/login' @{ identifier = $AdminEmail; password = $adminPasswordText; rememberMe = $false } $adminSession
Check $response.StatusCode 200 'administrator email login'
$response = Send-Json '/admin/invitations' @{ productId = 'janus-campaigns' } $adminSession
Check $response.StatusCode 200 'administrator creates invitation'
$inviteUrl = ($response.Content | ConvertFrom-Json).url
$invite = [System.Web.HttpUtility]::ParseQueryString(([uri]$inviteUrl).Query)['invite']
$response = Send-Json '/account/register' @{ invitation = 'bad-token'; userName = 'invalid'; email = 'invalid@example.test'; password = $userPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 400 'invalid invitation denied'
$response = Send-Json '/account/register' @{ invitation = $invite; userName = 'blocked'; email = 'blocked@example.test'; password = 'passwordpassword' } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 400 'common password denied'

foreach ($number in 1..2) {
    $name = "player$number"
    $email = "player$number@example.test"
    $response = Send-Json '/account/register' @{ invitation = $invite; userName = $name; email = $email; password = $userPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
    Check $response.StatusCode 200 "registration $number using same invitation"
    $response = Send-Json '/account/login' @{ identifier = $name; password = $userPassword; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
    Check $response.StatusCode 401 "unverified user $number denied"
    $inbox = Invoke-RestMethod "$base/dev/inbox"
    $link = ($inbox | Where-Object recipient -eq $email | Select-Object -First 1).actionUrl
    $response = Send-Json '/account/verify-email' (Get-LinkParts $link) (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
    Check $response.StatusCode 200 "user $number verified"
}

$response = Send-Json '/account/register' @{ invitation = $invite; userName = 'player1'; email = 'unique@example.test'; password = $userPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 400 'duplicate username denied'
$response = Send-Json '/account/register' @{ invitation = $invite; userName = 'unique'; email = 'player1@example.test'; password = $userPassword } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
Check $response.StatusCode 400 'duplicate email denied'

$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$response = Send-Json '/account/login' @{ identifier = 'player1'; password = $userPassword; rememberMe = $false } $userSession
Check $response.StatusCode 200 'username login'
$me = Invoke-RestMethod "$base/account/me" -WebSession $userSession
if ($me.products -notcontains 'janus-campaigns') { throw 'Verified user missing product grant' }
Write-Output 'PASS invited product grant'
$response = Send-Json '/admin/invitations' @{ productId = 'janus-campaigns' } $userSession
Check $response.StatusCode 403 'non-admin cannot invite'
$response = Send-Json '/account/logout' @{} $userSession
Check $response.StatusCode 200 'logout'
$response = Invoke-WebRequest "$base/account/me" -WebSession $userSession -SkipHttpErrorCheck
Check $response.StatusCode 401 'logged out session denied'

$response = Invoke-WebRequest "$base/account/register" -Method Post -ContentType 'application/json' -Headers @{ Origin = 'http://malicious.example' } -Body '{}' -SkipHttpErrorCheck
Check $response.StatusCode 403 'cross-origin write denied'
$statuses = foreach ($number in 1..35) {
    (Send-Json '/account/login' @{ identifier = 'unknown'; password = $userPassword; rememberMe = $false } (New-Object Microsoft.PowerShell.Commands.WebRequestSession)).StatusCode
}
if ($statuses -notcontains 429) { throw 'Expected a login rate-limit response' }
Write-Output 'PASS login rate limit'
