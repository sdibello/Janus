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

function Expect($Response, [int] $Status, [string] $Step) {
    if ($Response.StatusCode -ne $Status) {
        throw "$Step returned $($Response.StatusCode); expected $Status. $($Response.Content)"
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
$passwordText = [System.Net.NetworkCredential]::new('', $AdminPassword).Password
try {
    $null = Expect (Send-Json "$identity/account/login" 'POST' `
        @{ identifier = $AdminIdentifier; password = $passwordText; rememberMe = $false } $admin $identity) `
        200 'Administrator login'
}
finally { $passwordText = $null }
Open-CampaignSession $admin

$campaignRecord = (Expect (Send-Json "$campaign/campaigns" 'POST' `
    @{ name = "HP smoke $suffix" } $admin $campaign) 201 'Create campaign').Content | ConvertFrom-Json
$campaignBase = "$campaign/campaigns/$($campaignRecord.id)"
$pc = (Expect (Send-Json "$campaignBase/characters" 'POST' `
    @{ name = 'Hera'; kind = 'Pc' } $admin $campaign) 201 'Create PC').Content | ConvertFrom-Json
$npc = (Expect (Send-Json "$campaignBase/characters" 'POST' `
    @{ name = 'Ash'; kind = 'Npc' } $admin $campaign) 201 'Create NPC').Content | ConvertFrom-Json
$encounter = (Expect (Send-Json "$campaignBase/encounters" 'POST' `
    @{ name = 'HP boundaries' } $admin $campaign) 201 'Create encounter').Content | ConvertFrom-Json
$base = "$campaignBase/encounters/$($encounter.id)"
$encounter = (Expect (Send-Json "$base/participants" 'POST' `
    @{ revision = $encounter.revision; characterId = $pc.id; initiative = '18' } $admin $campaign) `
    200 'Add PC without HP').Content | ConvertFrom-Json
$pcEntry = @($encounter.participants | Where-Object { $_.characterId -eq $pc.id })[0]
$null = Expect (Send-Json "$base/participants/$($pcEntry.id)/damage" 'POST' `
    @{ revision = $encounter.revision; amount = '1' } $admin $campaign) 409 'Reject damage without HP'
$encounter = (Expect (Send-Json "$base/participants" 'POST' `
    @{ revision = $encounter.revision; characterId = $npc.id; initiative = '12'; currentHp = '0.000' } `
    $admin $campaign) 200 'Add NPC at zero HP').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.characterId -eq $npc.id })[0]
if ($pcEntry.currentHp -ne $null -or $npcEntry.currentHp -ne '0' -or $npcEntry.status -ne $null) {
    throw 'Missing HP, zero HP, or zero status was incorrect.'
}
$encounter = (Expect (Send-Json "$base/participants" 'POST' `
    @{ revision = $encounter.revision; mobName = 'Goblin'; initiative = '5'; currentHp = '5' } `
    $admin $campaign) 200 'Add mob at five HP').Content | ConvertFrom-Json
$mob = @($encounter.participants | Where-Object { $_.kind -eq 'Mob' })[0]
$encounter = (Expect (Send-Json "$base/participants" 'POST' `
    @{ revision = $encounter.revision; mobName = 'Goblin'; initiative = '1' } $admin $campaign) `
    200 'Add same-name mob without HP').Content | ConvertFrom-Json
$otherMob = @($encounter.participants | Where-Object { $_.kind -eq 'Mob' -and $_.id -ne $mob.id })[0]
if ($otherMob.currentHp -ne $null) { throw 'Same-name mob inherited HP.' }

$big = '999999999999999999999999.05'
$encounter = (Expect (Send-Json "$base/participants/$($pcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = $big } $admin $campaign) `
    200 'Set large fractional HP').Content | ConvertFrom-Json
$null = Expect (Send-Json "$base/participants/$($pcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = 'not a number' } $admin $campaign) `
    400 'Reject invalid HP'
$encounter = (Expect (Send-Json "$base/participants/$($pcEntry.id)/heal" 'POST' `
    @{ revision = $encounter.revision; amount = '.02' } $admin $campaign) `
    200 'Exact large HP healing').Content | ConvertFrom-Json
$pcEntry = @($encounter.participants | Where-Object { $_.id -eq $pcEntry.id })[0]
if ($pcEntry.currentHp -ne '999999999999999999999999.07') { throw 'Fractional Heal lost precision.' }
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = '-9' } $admin $campaign) `
    200 'Set Unconscious HP').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.status -ne 'Unconscious') { throw '-9 HP should be Unconscious.' }
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/damage" 'POST' `
    @{ revision = $encounter.revision; amount = '1' } $admin $campaign) `
    200 'Damage to -10').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '-10' -or $npcEntry.status -ne 'AliveAdjacent') {
    throw '-10 HP should be alive adjacent.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/damage" 'POST' `
    @{ revision = $encounter.revision; amount = '4' } $admin $campaign) `
    200 'Damage below -10').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '-14' -or $npcEntry.status -ne 'AliveAdjacent') {
    throw 'Negative HP was clamped or status changed incorrectly.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/heal" 'POST' `
    @{ revision = $encounter.revision; amount = '9' } $admin $campaign) `
    200 'Heal to -5').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '-5' -or $npcEntry.status -ne 'Unconscious') {
    throw 'Healing did not restore Unconscious status.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/heal" 'POST' `
    @{ revision = $encounter.revision; amount = '5' } $admin $campaign) `
    200 'Heal to zero').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '0' -or $npcEntry.status -ne $null) {
    throw 'Zero HP retained a negative-HP status.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = '-0.5' } $admin $campaign) `
    200 'Set fractional Unconscious HP').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '-0.5' -or $npcEntry.status -ne 'Unconscious') {
    throw 'Fractional negative HP should be Unconscious.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = '-10.5' } $admin $campaign) `
    200 'Set fractional alive-adjacent HP').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '-10.5' -or $npcEntry.status -ne 'AliveAdjacent') {
    throw 'HP below -10 should be alive adjacent.'
}
$encounter = (Expect (Send-Json "$base/participants/$($npcEntry.id)/hp" 'PATCH' `
    @{ revision = $encounter.revision; currentHp = '5' } $admin $campaign) `
    200 'Clear status through direct HP edit').Content | ConvertFrom-Json
$npcEntry = @($encounter.participants | Where-Object { $_.id -eq $npcEntry.id })[0]
if ($npcEntry.currentHp -ne '5' -or $npcEntry.status -ne $null) {
    throw 'Direct positive HP edit did not clear status.'
}

$encounter = (Expect (Send-Json "$base/fight" 'POST' @{ revision = $encounter.revision } $admin $campaign) `
    200 'Begin Fight with optional HP').Content | ConvertFrom-Json
$active = $encounter.activeParticipantId
$beforeOrder = @($encounter.participants | ForEach-Object { $_.id })
$mob = @($encounter.participants | Where-Object { $_.id -eq $mob.id })[0]
$encounter = (Expect (Send-Json "$base/participants/$($mob.id)/damage" 'POST' `
    @{ revision = $encounter.revision; amount = '-.25' } $admin $campaign) `
    200 'Subtract signed fractional damage').Content | ConvertFrom-Json
$mob = @($encounter.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.currentHp -ne '5.25') { throw 'Signed Damage amount was not subtracted exactly.' }
$encounter = (Expect (Send-Json "$base/participants/$($mob.id)/heal" 'POST' `
    @{ revision = $encounter.revision; amount = '-.25' } $admin $campaign) `
    200 'Add signed fractional healing').Content | ConvertFrom-Json
$mob = @($encounter.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.currentHp -ne '5') { throw 'Signed Heal amount was not added exactly.' }
$encounter = (Expect (Send-Json "$base/participants/$($mob.id)/damage" 'POST' `
    @{ revision = $encounter.revision; amount = '8' } $admin $campaign) `
    200 'Damage non-active mob').Content | ConvertFrom-Json
$mob = @($encounter.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.currentHp -ne '-3' -or $mob.status -ne 'Unconscious' `
    -or $encounter.activeParticipantId -ne $active `
    -or (@($encounter.participants | ForEach-Object { $_.id }) -join ',') -ne ($beforeOrder -join ',')) {
    throw 'Damage changed turn order, active participant, or status incorrectly.'
}
$encounter = (Expect (Send-Json "$base/participants" 'POST' `
    @{ revision = $encounter.revision; mobName = 'New mob'; currentHp = '-20' } $admin $campaign) `
    200 'Add mob with HP during Fight').Content | ConvertFrom-Json
$newMob = @($encounter.participants | Where-Object { $_.name -eq 'New mob' })[0]
if ($encounter.participants[0].id -ne $active -or $newMob.status -ne 'AliveAdjacent' `
    -or $newMob.initiative -ne $null -or $encounter.activeParticipantId -ne $active) {
    throw 'Fight mob starting HP, status, insertion, or active highlight was incorrect.'
}
$reloaded = (Expect (Invoke-WebRequest $base -WebSession $admin -SkipHttpErrorCheck) `
    200 'Reload Fight HP').Content | ConvertFrom-Json
$mob = @($reloaded.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.currentHp -ne '-3' -or $mob.status -ne 'Unconscious') {
    throw 'HP status did not restore from the saved value.'
}
$encounter = (Expect (Send-Json "$base/active" 'POST' `
    @{ revision = $reloaded.revision; participantId = $mob.id } $admin $campaign) `
    200 'Make Unconscious mob active').Content | ConvertFrom-Json
$encounter = (Expect (Send-Json "$base/next" 'POST' @{ revision = $encounter.revision } $admin $campaign) `
    200 'Advance Unconscious mob').Content | ConvertFrom-Json
$mob = @($encounter.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.turnCount -ne 1 -or $encounter.activeParticipantId -eq $mob.id) {
    throw 'Unconscious participant was skipped or removed from turn order.'
}
$finished = (Expect (Send-Json "$base/end" 'POST' @{ revision = $encounter.revision } $admin $campaign) `
    200 'Finish HP encounter').Content | ConvertFrom-Json
$null = Expect (Send-Json "$base/participants/$($mob.id)/hp" 'PATCH' `
    @{ revision = $finished.revision; currentHp = '99' } $admin $campaign) `
    409 'Reject HP edit after End'
$final = (Expect (Invoke-WebRequest $base -WebSession $admin -SkipHttpErrorCheck) `
    200 'Reload final HP').Content | ConvertFrom-Json
$mob = @($final.participants | Where-Object { $_.id -eq $mob.id })[0]
if ($mob.currentHp -ne '-3' -or $mob.status -ne 'Unconscious') {
    throw 'Finished encounter lost HP or status.'
}

$fresh = (Expect (Send-Json "$campaignBase/encounters" 'POST' `
    @{ name = 'Fresh HP' } $admin $campaign) 201 'Create second encounter').Content | ConvertFrom-Json
$fresh = (Expect (Send-Json "$campaignBase/encounters/$($fresh.id)/participants" 'POST' `
    @{ revision = $fresh.revision; characterId = $pc.id; initiative = '1' } $admin $campaign) `
    200 'Reuse PC with fresh HP').Content | ConvertFrom-Json
if ($fresh.participants[0].currentHp -ne $null -or $fresh.participants[0].status -ne $null) {
    throw 'HP carried over between encounters.'
}

$secondName = "hpuser$suffix"
$secondEmail = "$secondName@example.test"
$secondPassword = "HP smoke passphrase $([guid]::NewGuid().ToString('N'))"
$invitation = (Expect (Send-Json "$identity/admin/invitations" 'POST' `
    @{ productId = 'janus-campaigns' } $admin $identity) 200 'Invitation').Content | ConvertFrom-Json
$inviteQuery = [System.Web.HttpUtility]::ParseQueryString(([uri]$invitation.url).Query)
$null = Expect (Send-Json "$identity/account/register" 'POST' `
    @{ invitation = $inviteQuery['invite']; userName = $secondName; email = $secondEmail;
       password = $secondPassword } $null $identity) 200 'Second-user registration'
$inbox = Invoke-RestMethod "$identity/dev/inbox"
$verification = @($inbox | Where-Object { $_.recipient -eq $secondEmail })[0]
$verifyQuery = [System.Web.HttpUtility]::ParseQueryString(([uri]$verification.actionUrl).Query)
$null = Expect (Send-Json "$identity/account/verify-email" 'POST' `
    @{ userId = $verifyQuery['verifyUser']; token = $verifyQuery['verifyToken'] } $null $identity) `
    200 'Second-user verification'
$other = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$null = Expect (Send-Json "$identity/account/login" 'POST' `
    @{ identifier = $secondName; password = $secondPassword; rememberMe = $false } $other $identity) `
    200 'Second-user login'
Open-CampaignSession $other
$null = Expect (Send-Json "$campaignBase/encounters/$($fresh.id)/participants/$($fresh.participants[0].id)/hp" `
    'PATCH' @{ revision = $fresh.revision; currentHp = '1' } $other $campaign) 404 'Reject other-user HP change'

Write-Output 'Exact HP, Damage, Heal, status boundaries, persistence, isolation, and authorization passed.'
