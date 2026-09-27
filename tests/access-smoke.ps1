param(
    [Parameter(Mandatory)] [string] $AdminIdentifier,
    [Parameter(Mandatory)] [string] $AdminEmail,
    [Parameter(Mandatory)] [securestring] $AdminPassword,
    [string] $BaseUri = 'http://localhost:5187'
)

$ErrorActionPreference = 'Stop'
$adminPasswordText = ConvertFrom-SecureString $AdminPassword -AsPlainText
$participantPassword = "Access-Smoke-Passphrase-$([guid]::NewGuid().ToString('N'))"
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$productA = "access-a-$suffix"
$productB = "access-b-$suffix"
$userA = "admina$suffix"
$userB = "userb$suffix"
$emailA = "$userA@example.test"
$emailB = "$userB@example.test"

function Send-Json([string]$path, [object]$body, $session) {
    Invoke-WebRequest -Uri "$BaseUri$path" -Method Post -ContentType 'application/json' -Headers @{ Origin = $BaseUri } -Body ($body | ConvertTo-Json -Compress) -WebSession $session -SkipHttpErrorCheck
}

function Get-Json([string]$path, $session) {
    Invoke-WebRequest -Uri "$BaseUri$path" -WebSession $session -SkipHttpErrorCheck
}

function Check([int]$actual, [int]$expected, [string]$name) {
    if ($actual -ne $expected) { throw "$name expected $expected but got $actual" }
    Write-Output "PASS $name"
}

function Get-LinkParts([string]$url) {
    $values = [System.Web.HttpUtility]::ParseQueryString(([uri]$url).Query)
    @{ userId = $values['verifyUser']; token = $values['verifyToken'] }
}

function Get-Invitation([string]$url) {
    [System.Web.HttpUtility]::ParseQueryString(([uri]$url).Query)['invite']
}

function Verify-FromInbox([string]$recipient) {
    $inbox = Invoke-RestMethod "$BaseUri/dev/inbox"
    $link = ($inbox | Where-Object recipient -eq $recipient | Select-Object -First 1).actionUrl
    if (-not $link) { throw "Verification message missing for $recipient" }
    Send-Json '/account/verify-email' (Get-LinkParts $link) (New-Object Microsoft.PowerShell.Commands.WebRequestSession)
}

$anonymous = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$response = Verify-FromInbox $AdminEmail
if ($response.StatusCode -eq 200) { Write-Output 'PASS first administrator verified' }
elseif ($response.StatusCode -eq 400) { Write-Output 'Administrator may already be verified; confirming through login.' }
else { throw "Administrator verification returned $($response.StatusCode)" }
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$response = Send-Json '/account/login' @{ identifier = $AdminIdentifier; password = $adminPasswordText; rememberMe = $false } $adminSession
Check $response.StatusCode 200 'shared administrator signed in'

foreach ($product in @($productA, $productB)) {
    $response = Send-Json '/admin/products' @{ id = $product; name = $product } $adminSession
    Check $response.StatusCode 201 "registered $product"
    $response = Get-Json "/products/$product" $anonymous
    Check $response.StatusCode 200 "product $product can be read"
}

$response = Send-Json '/admin/invitations' @{ productId = $productA } $adminSession
Check $response.StatusCode 200 'shared administrator invited product A'
$inviteA = Get-Invitation (($response.Content | ConvertFrom-Json).url)
$response = Send-Json '/admin/invitations' @{ productId = $productB } $adminSession
Check $response.StatusCode 200 'shared administrator invited product B'
$inviteB = Get-Invitation (($response.Content | ConvertFrom-Json).url)

foreach ($participant in @(
    @{ name = $userA; email = $emailA; invite = $inviteA },
    @{ name = $userB; email = $emailB; invite = $inviteB }
)) {
    $response = Send-Json '/account/register' @{ invitation = $participant.invite; userName = $participant.name; email = $participant.email; password = $participantPassword } $anonymous
    Check $response.StatusCode 200 "registered $($participant.name)"
    $response = Verify-FromInbox $participant.email
    Check $response.StatusCode 200 "verified $($participant.name)"
}

$sessionA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession
foreach ($participant in @(
    @{ name = $userA; session = $sessionA },
    @{ name = $userB; session = $sessionB }
)) {
    $response = Send-Json '/account/login' @{ identifier = $participant.name; password = $participantPassword; rememberMe = $false } $participant.session
    Check $response.StatusCode 200 "$($participant.name) signed in"
}

$response = Send-Json '/admin/administrators' @{ identifier = $userA; productId = $productA } $adminSession
Check $response.StatusCode 200 'appointed product A administrator'
$meA = (Get-Json '/account/me' $sessionA).Content | ConvertFrom-Json
if ($meA.administeredProducts -notcontains $productA) { throw 'Product A administration missing from /account/me' }
Write-Output 'PASS product administrator scope in /account/me'

$response = Send-Json '/admin/invitations' @{ productId = $productA } $sessionA
Check $response.StatusCode 200 'product administrator invited own product'
$response = Send-Json '/admin/invitations' @{ productId = $productB } $sessionA
Check $response.StatusCode 403 'product administrator cannot invite another product'
$response = Send-Json '/admin/administrators' @{ identifier = $userB; productId = $productA } $sessionA
Check $response.StatusCode 403 'product administrator cannot appoint administrators'
$response = Send-Json '/admin/products' @{ id = "forbidden-$suffix"; name = 'Forbidden' } $sessionA
Check $response.StatusCode 403 'product administrator cannot register products'

$response = Send-Json "/products/$productA/access-requests" @{} $sessionB
Check $response.StatusCode 201 'product B user requested product A'
$requestA = ($response.Content | ConvertFrom-Json).id
$response = Get-Json "/account/access/$productA" $sessionB
Check $response.StatusCode 403 'pending request grants no access'
$response = Send-Json "/products/$productA/access-requests" @{} $sessionB
Check $response.StatusCode 409 'duplicate pending request denied'
$response = Get-Json '/admin/access-requests' $sessionA
Check $response.StatusCode 200 'product administrator can list scoped requests'
$requestsA = $response.Content | ConvertFrom-Json
if ($requestsA.id -notcontains $requestA) { throw 'Product administrator cannot see own product request' }
$response = Send-Json "/admin/access-requests/$requestA/approve" @{} $sessionA
Check $response.StatusCode 200 'product administrator approved own product'
$response = Get-Json "/account/access/$productA" $sessionB
Check $response.StatusCode 200 'approval granted product A immediately'
$response = Get-Json "/admin/products/$productA/grants" $sessionA
Check $response.StatusCode 200 'product administrator listed own grants'
$grantsA = $response.Content | ConvertFrom-Json
$userBId = ((Get-Json '/account/me' $sessionB).Content | ConvertFrom-Json).id
if ($grantsA.id -notcontains $userBId) { throw 'Approved grant missing from list' }
$response = Get-Json "/admin/products/$productB/grants" $sessionA
Check $response.StatusCode 403 'product administrator cannot list other grants'
$response = Send-Json "/admin/products/$productA/grants/$userBId/revoke" @{} $sessionA
Check $response.StatusCode 200 'product administrator revoked own product grant'
$response = Get-Json "/account/access/$productA" $sessionB
Check $response.StatusCode 403 'revoked grant denied with existing login'
$response = Send-Json "/products/$productA/access-requests" @{} $sessionB
Check $response.StatusCode 201 'revoked user may request again'

$response = Send-Json "/products/$productB/access-requests" @{} $sessionA
Check $response.StatusCode 201 'product administrator may request another product'
$requestB = ($response.Content | ConvertFrom-Json).id
$response = Send-Json "/admin/access-requests/$requestB/approve" @{} $sessionA
Check $response.StatusCode 403 'product administrator cannot approve another product'
$response = Get-Json '/admin/access-requests' $sessionA
$requestsA = $response.Content | ConvertFrom-Json
if ($requestsA.id -contains $requestB) { throw 'Product administrator can see another product request' }
Write-Output 'PASS product administrator list excludes other product'
$response = Send-Json "/admin/access-requests/$requestB/reject" @{} $adminSession
Check $response.StatusCode 200 'shared administrator rejected product B request'
$response = Get-Json "/account/access/$productB" $sessionA
Check $response.StatusCode 403 'rejected request grants no access'
$response = Send-Json "/products/$productB/access-requests" @{} $sessionA
Check $response.StatusCode 201 'rejected user may request again'
$requestB = ($response.Content | ConvertFrom-Json).id
$response = Send-Json "/admin/access-requests/$requestB/approve" @{} $adminSession
Check $response.StatusCode 200 'shared administrator approved product B request'
$response = Send-Json "/admin/access-requests/$requestB/reject" @{} $adminSession
Check $response.StatusCode 409 'resolved request cannot be changed'
$response = Get-Json "/account/access/$productB" $sessionA
Check $response.StatusCode 200 'approval grants only requested product'
$userAId = $meA.id
$response = Send-Json "/admin/products/$productB/grants/$userAId/revoke" @{} $sessionA
Check $response.StatusCode 403 'product administrator cannot revoke another product'
$response = Send-Json "/admin/products/$productB/grants/$userAId/revoke" @{} $adminSession
Check $response.StatusCode 200 'shared administrator revoked product B'
$response = Send-Json "/admin/products/$productB/grants/$userAId/revoke" @{} $adminSession
Check $response.StatusCode 404 'repeated revocation reports no current grant'
$response = Get-Json "/account/access/$productB" $sessionA
Check $response.StatusCode 403 'product B revocation takes effect immediately'
$response = Send-Json "/products/$productB/access-requests" @{} $sessionA
Check $response.StatusCode 201 'product B revocation permits a new request'

$response = Send-Json "/admin/products/$productA/grants/$userAId/revoke" @{} $adminSession
Check $response.StatusCode 200 'shared administrator revoked a product administrator access grant'
$response = Send-Json "/products/$productA/access-requests" @{} $sessionA
Check $response.StatusCode 201 'product administrator requested own revoked product'
$ownRequest = ($response.Content | ConvertFrom-Json).id
$response = Send-Json "/admin/access-requests/$ownRequest/approve" @{} $sessionA
Check $response.StatusCode 403 'product administrator cannot approve own access request'
$response = Send-Json "/admin/access-requests/$ownRequest/approve" @{} $adminSession
Check $response.StatusCode 200 'shared administrator restored product administrator access'

$response = Send-Json '/admin/administrators' @{ identifier = $userB } $adminSession
Check $response.StatusCode 200 'shared administrator appointed another shared administrator'
$meB = (Get-Json '/account/me' $sessionB).Content | ConvertFrom-Json
if (-not $meB.isSharedAdministrator) { throw 'Shared administrator appointment missing from /account/me' }
Write-Output 'PASS shared administrator appointment is effective'
