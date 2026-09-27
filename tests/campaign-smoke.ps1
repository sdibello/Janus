param(
    [Parameter(Mandatory)] [string] $AdminIdentifier,
    [Parameter(Mandatory)] [securestring] $AdminPassword,
    [string] $IdentityBaseUri = 'http://localhost:5186',
    [string] $CampaignBaseUri = 'http://localhost:5199'
)

$ErrorActionPreference = 'Stop'
$identity = $IdentityBaseUri.TrimEnd('/')
$campaign = $CampaignBaseUri.TrimEnd('/')
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 10)
$name = "Campaign smoke $suffix"
$secondName = "campaignuser$suffix"
$secondEmail = "$secondName@example.test"
$secondPassword = "Campaign smoke passphrase $([guid]::NewGuid().ToString('N'))"

function Expect($Response, [int] $Status, [string] $Step) {
    if ($Response.StatusCode -ne $Status) {
        throw "$Step returned $($Response.StatusCode); expected $Status."
    }
    return $Response
}

function Send-Json([string] $Uri, [string] $Method, $Body, $Session, [string] $Origin) {
    $request = @{
        Uri = $Uri
        Method = $Method
        ContentType = 'application/json'
        Headers = @{ Origin = $Origin }
        Body = ($Body | ConvertTo-Json)
        SkipHttpErrorCheck = $true
    }
    if ($Session) { $request.WebSession = $Session }
    return Invoke-WebRequest @request
}

function Open-CampaignSession($Session) {
    $start = Invoke-WebRequest "$campaign/auth/login" -WebSession $Session -MaximumRedirection 0 `
        -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    $null = Expect $start 302 'Campaign login challenge'
    $authorization = Invoke-WebRequest $start.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    $null = Expect $authorization 302 'Identity authorization'
    $callback = Invoke-WebRequest $authorization.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    $null = Expect $callback 302 'Campaign sign-in callback'
    $null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $Session -SkipHttpErrorCheck) `
        200 'Campaign session'
}

$admin = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$adminPasswordText = [System.Net.NetworkCredential]::new('', $AdminPassword).Password
try {
    $null = Expect (Send-Json "$identity/account/login" 'POST' `
        @{ identifier = $AdminIdentifier; password = $adminPasswordText; rememberMe = $false } $admin $identity) `
        200 'Administrator login'
}
finally { $adminPasswordText = $null }
Open-CampaignSession $admin

$null = Expect (Invoke-WebRequest "$campaign/campaigns" -SkipHttpErrorCheck) 401 'Anonymous list'
$null = Expect (Send-Json "$campaign/campaigns" 'POST' @{ name = '   ' } $admin $campaign) `
    400 'Blank campaign name'

$first = (Expect (Send-Json "$campaign/campaigns" 'POST' @{ name = $name } $admin $campaign) `
    201 'First campaign').Content | ConvertFrom-Json
$second = (Expect (Send-Json "$campaign/campaigns" 'POST' @{ name = $name } $admin $campaign) `
    201 'Duplicate campaign name').Content | ConvertFrom-Json
if ($first.id -eq $second.id -or !$first.createdAtUtc) { throw 'Campaign IDs or creation dates are invalid.' }
$empty = (Expect (Invoke-WebRequest "$campaign/campaigns/$($first.id)" -WebSession $admin -SkipHttpErrorCheck) `
    200 'Empty campaign view').Content | ConvertFrom-Json
if ($empty.characters.Count -ne 0) { throw 'New campaign was not empty.' }

$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters" 'POST' `
    @{ name = ' '; kind = 'Pc' } $admin $campaign) 400 'Blank character name'
$pc = (Expect (Send-Json "$campaign/campaigns/$($first.id)/characters" 'POST' `
    @{ name = 'Echo'; kind = 'Pc' } $admin $campaign) 201 'Add PC').Content | ConvertFrom-Json
$npc = (Expect (Send-Json "$campaign/campaigns/$($first.id)/characters" 'POST' `
    @{ name = 'Echo'; kind = 'Npc' } $admin $campaign) 201 'Add duplicate-name NPC').Content | ConvertFrom-Json
if ($pc.id -eq $npc.id -or $pc.kind -ne 'Pc' -or $npc.kind -ne 'Npc') {
    throw 'Duplicate-name characters were not saved separately by kind.'
}
$changed = (Expect (Send-Json "$campaign/campaigns/$($first.id)/characters/$($pc.id)/kind" `
    'PATCH' @{ kind = 'Npc' } $admin $campaign) 200 'Reclassify PC').Content | ConvertFrom-Json
if ($changed.id -ne $pc.id -or $changed.kind -ne 'Npc') { throw 'Reclassification created or returned the wrong character.' }
$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters/$($npc.id)" `
    'DELETE' @{} $admin $campaign) 204 'Remove unreferenced NPC'
$updated = (Expect (Invoke-WebRequest "$campaign/campaigns/$($first.id)" -WebSession $admin -SkipHttpErrorCheck) `
    200 'Updated campaign view').Content | ConvertFrom-Json
if ($updated.characters.Count -ne 1 -or $updated.characters[0].id -ne $pc.id `
    -or $updated.createdAtUtc -ne $first.createdAtUtc) {
    throw 'Character changes altered the wrong records or creation date.'
}
$null = Expect (Send-Json "$campaign/campaigns/$($second.id)/characters" 'POST' `
    @{ name = 'Other campaign NPC'; kind = 'Npc' } $admin $campaign) 201 'Second-campaign character'
$null = Expect (Send-Json "$campaign/campaigns/$($second.id)/characters/$($pc.id)/kind" `
    'PATCH' @{ kind = 'Pc' } $admin $campaign) 404 'Cross-campaign reclassification'
$null = Expect (Send-Json "$campaign/campaigns/$($second.id)/characters/$($pc.id)" `
    'DELETE' @{} $admin $campaign) 404 'Cross-campaign removal'
$unchanged = (Expect (Invoke-WebRequest "$campaign/campaigns/$($first.id)" -WebSession $admin -SkipHttpErrorCheck) `
    200 'First-campaign isolation').Content | ConvertFrom-Json
if ($unchanged.characters.Count -ne 1) { throw 'Another campaign changed the first character list.' }

$invitation = (Expect (Send-Json "$identity/admin/invitations" 'POST' `
    @{ productId = 'janus-campaigns' } $admin $identity) 200 'Invitation').Content | ConvertFrom-Json
$inviteQuery = [System.Web.HttpUtility]::ParseQueryString(([uri]$invitation.url).Query)
$null = Expect (Send-Json "$identity/account/register" 'POST' `
    @{ invitation = $inviteQuery['invite']; userName = $secondName; email = $secondEmail;
       password = $secondPassword } $null $identity) 200 'Second-user registration'
$inbox = Invoke-RestMethod "$identity/dev/inbox"
$verification = @($inbox | Where-Object { $_.recipient -eq $secondEmail })[0]
if (!$verification) { throw 'Second-user verification message was not captured.' }
$verifyQuery = [System.Web.HttpUtility]::ParseQueryString(([uri]$verification.actionUrl).Query)
$null = Expect (Send-Json "$identity/account/verify-email" 'POST' `
    @{ userId = $verifyQuery['verifyUser']; token = $verifyQuery['verifyToken'] } $null $identity) `
    200 'Second-user verification'

$other = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$null = Expect (Send-Json "$identity/account/login" 'POST' `
    @{ identifier = $secondName; password = $secondPassword; rememberMe = $false } $other $identity) `
    200 'Second-user login'
Open-CampaignSession $other
$null = Expect (Invoke-WebRequest "$campaign/campaigns/$($first.id)" -WebSession $other -SkipHttpErrorCheck) `
    404 'Other-user campaign view'
$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters" 'POST' `
    @{ name = 'Intruder'; kind = 'Pc' } $other $campaign) 404 'Other-user character addition'
$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters/$($pc.id)/kind" `
    'PATCH' @{ kind = 'Pc' } $other $campaign) 404 'Other-user reclassification'
$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters/$($pc.id)" `
    'DELETE' @{} $other $campaign) 404 'Other-user removal'
$otherList = (Expect (Invoke-WebRequest "$campaign/campaigns" -WebSession $other -SkipHttpErrorCheck) `
    200 'Other-user list').Content | ConvertFrom-Json
if (@($otherList | Where-Object { $_.id -eq $first.id -or $_.id -eq $second.id }).Count -ne 0) {
    throw 'Another user saw the administrator campaigns in their list.'
}

Write-Output 'Campaign creation, duplicate names, character maintenance, persistence, and owner isolation passed.'
