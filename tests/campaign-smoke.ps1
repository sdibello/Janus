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

$encounterBase = "$campaign/campaigns/$($first.id)/encounters"
$null = Expect (Send-Json $encounterBase 'POST' @{ name = '  ' } $admin $campaign) `
    400 'Blank encounter name'
$encounter = (Expect (Send-Json $encounterBase 'POST' @{ name = 'Bridge' } $admin $campaign) `
    201 'Create encounter').Content | ConvertFrom-Json
$emptyEncounter = (Expect (Invoke-WebRequest "$encounterBase/$($encounter.id)" -WebSession $admin `
    -SkipHttpErrorCheck) 200 'Empty encounter').Content | ConvertFrom-Json
if ($emptyEncounter.phase -ne 'Prepare' -or $emptyEncounter.round -ne 1 `
    -or @($emptyEncounter.participants).Count -ne 0) { throw 'New encounter state was incorrect.' }
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/fight" 'POST' `
    @{ revision = $emptyEncounter.revision } $admin $campaign) 400 'Reject empty Fight'
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $emptyEncounter.revision; characterId = $pc.id; initiative = '12' } $admin $campaign) `
    200 'Add campaign character'
$prepared = (Expect (Invoke-WebRequest "$encounterBase/$($encounter.id)" -WebSession $admin `
    -SkipHttpErrorCheck) 200 'Reload Prepare').Content | ConvertFrom-Json
if (@($prepared.participants).Count -ne 1 -or $prepared.participants[0].characterId -ne $pc.id) {
    throw 'Prepare participant did not persist.'
}
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; characterId = $pc.id } $admin $campaign) `
    409 'Duplicate character in encounter'
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; characterId = $pc.id; mobName = 'Invalid' } $admin $campaign) `
    400 'Ambiguous participant'
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; mobName = 'Invalid'; initiative = '1.5' } $admin $campaign) `
    400 'Fractional initiative'
$otherCharacter = (Expect (Invoke-WebRequest "$campaign/campaigns/$($second.id)" -WebSession $admin `
    -SkipHttpErrorCheck) 200 'Second campaign view').Content | ConvertFrom-Json
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; characterId = $otherCharacter.characters[0].id } $admin $campaign) `
    404 'Cross-campaign encounter character'
$bigInitiative = '1234567890123456789012345678901234567890'
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; mobName = 'Goblin'; initiative = $bigInitiative } $admin $campaign) `
    200 'Add high-initiative mob').Content | ConvertFrom-Json
if ($prepared.participants[0].initiative -ne $bigInitiative) { throw 'Large initiative was not ordered first.' }
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; mobName = 'Goblin'; initiative = $bigInitiative } $admin $campaign) `
    200 'Add same-name mob').Content | ConvertFrom-Json
if (@($prepared.participants).Count -ne 3 -or $prepared.participants[0].id -eq $prepared.participants[1].id) {
    throw 'Same-name mobs were not saved independently.'
}
$secondMobId = $prepared.participants[1].id
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$secondMobId/move-tie" `
    'POST' @{ revision = $prepared.revision; direction = 'up' } $admin $campaign) `
    200 'Reorder initiative tie').Content | ConvertFrom-Json
if ($prepared.participants[0].id -ne $secondMobId) { throw 'Initiative tie order was not saved.' }
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$secondMobId/initiative" `
    'PATCH' @{ revision = $prepared.revision; initiative = '-1.5' } $admin $campaign) `
    400 'Reject fractional initiative edit'
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$secondMobId/initiative" `
    'PATCH' @{ revision = $prepared.revision; initiative = '-9' } $admin $campaign) `
    200 'Set negative initiative').Content | ConvertFrom-Json
if ($prepared.participants[-1].id -ne $secondMobId) { throw 'Negative initiative was not ordered last.' }
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$secondMobId/remove" `
    'POST' @{ revision = 0 } $admin $campaign) 409 'Reject stale removal'
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$secondMobId/remove" `
    'POST' @{ revision = $prepared.revision } $admin $campaign) `
    200 'Remove encounter mob').Content | ConvertFrom-Json
if (@($prepared.participants).Count -ne 2) { throw 'Removing one mob removed another entry.' }
$persisted = (Expect (Invoke-WebRequest "$encounterBase/$($encounter.id)" -WebSession $admin `
    -SkipHttpErrorCheck) 200 'Reload edited Prepare').Content | ConvertFrom-Json
if ($persisted.revision -ne $prepared.revision -or @($persisted.participants).Count -ne 2) {
    throw 'Encounter Prepare edits did not persist.'
}
$null = Expect (Send-Json "$campaign/campaigns/$($first.id)/characters/$($pc.id)" `
    'DELETE' @{} $admin $campaign) 409 'Prevent referenced character removal'
$null = Expect (Invoke-WebRequest "$encounterBase/$($encounter.id)" -WebSession $other `
    -SkipHttpErrorCheck) 404 'Other-user encounter view'
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; mobName = 'Intruder' } $other $campaign) `
    404 'Other-user encounter change'
$null = Expect (Invoke-WebRequest $encounterBase -WebSession $other -SkipHttpErrorCheck) `
    404 'Other-user encounter list'

$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants" 'POST' `
    @{ revision = $prepared.revision; mobName = 'Scout' } $admin $campaign) `
    200 'Add mob without initiative').Content | ConvertFrom-Json
$scoutId = $prepared.participants[-1].id
$null = Expect (Send-Json "$encounterBase/$($encounter.id)/fight" 'POST' `
    @{ revision = $prepared.revision } $admin $campaign) 400 'Reject missing initiative'
$prepared = (Expect (Send-Json "$encounterBase/$($encounter.id)/participants/$scoutId/initiative" `
    'PATCH' @{ revision = $prepared.revision; initiative = '5' } $admin $campaign) `
    200 'Complete initiative').Content | ConvertFrom-Json
$fight = (Expect (Send-Json "$encounterBase/$($encounter.id)/fight" 'POST' `
    @{ revision = $prepared.revision } $admin $campaign) 200 'Begin Fight').Content | ConvertFrom-Json
if ($fight.phase -ne 'Fight' -or $fight.round -ne 1 -or $fight.activeParticipantId -ne $fight.participants[0].id `
    -or @($fight.participants | Where-Object { $_.turnCount -ne 0 }).Count -ne 0) {
    throw 'Fight did not begin with the first participant and zero counters.'
}
$fightBase = "$encounterBase/$($encounter.id)"
$firstActive = $fight.activeParticipantId
$null = Expect (Send-Json "$fightBase/fight" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    409 'Reject return to Prepare'
$null = Expect (Send-Json "$fightBase/participants/$scoutId/remove" 'POST' `
    @{ revision = $fight.revision } $admin $campaign) 409 'Reject Fight removal'
$null = Expect (Send-Json "$fightBase/next" 'POST' @{ revision = $fight.revision } $other $campaign) `
    404 'Reject other-user Next'
$fight = (Expect (Send-Json "$fightBase/next" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    200 'First Next').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $fight.participants[1].id -or $fight.round -ne 1 `
    -or $fight.participants[0].turnCount -ne 1) { throw 'Next did not advance or increment Turn.' }
$fight = (Expect (Send-Json "$fightBase/skip" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    200 'Skip middle participant').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $fight.participants[2].id -or $fight.round -ne 1 `
    -or $fight.participants[1].turnCount -ne 0) { throw 'Skip changed a counter or wrong active participant.' }
$fight = (Expect (Send-Json "$fightBase/next" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    200 'Next wraps').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $firstActive -or $fight.round -ne 2 `
    -or $fight.participants[2].turnCount -ne 1) { throw 'Next wrap did not increment Round and Turn.' }
$beforeOrder = @($fight.participants | ForEach-Object { $_.id })
$reorderedIds = @($beforeOrder[2], $beforeOrder[0], $beforeOrder[1])
$null = Expect (Send-Json "$fightBase/reorder" 'POST' `
    @{ revision = $fight.revision; orderedIds = @($beforeOrder[0], $beforeOrder[0], $beforeOrder[1]) } `
    $admin $campaign) 400 'Reject invalid reorder'
$reordered = (Expect (Send-Json "$fightBase/reorder" 'POST' `
    @{ revision = $fight.revision; orderedIds = $reorderedIds } $admin $campaign) `
    200 'Reorder Fight').Content | ConvertFrom-Json
if ($reordered.activeParticipantId -ne $beforeOrder[1] -or $reordered.round -ne 2 `
    -or $reordered.participants[0].id -ne $beforeOrder[2] `
    -or $reordered.participants[1].id -ne $beforeOrder[0]) {
    throw 'Reorder did not use the old active successor or persist the new order.'
}
$noOp = (Expect (Send-Json "$fightBase/reorder" 'POST' `
    @{ revision = $reordered.revision; orderedIds = $reorderedIds } $admin $campaign) `
    200 'No-op reorder').Content | ConvertFrom-Json
if ($noOp.revision -ne $reordered.revision -or $noOp.activeParticipantId -ne $reordered.activeParticipantId) {
    throw 'No-op reorder changed the encounter.'
}
$fight = (Expect (Send-Json "$fightBase/skip" 'POST' @{ revision = $reordered.revision } $admin $campaign) `
    200 'Skip last participant').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $reorderedIds[0] -or $fight.round -ne 2) {
    throw 'Skip from last participant incremented Round.'
}
$fight = (Expect (Send-Json "$fightBase/active" 'POST' `
    @{ revision = $fight.revision; participantId = $reorderedIds[2] } $admin $campaign) `
    200 'Set active participant').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $reorderedIds[2] -or $fight.round -ne 2) {
    throw 'Manual active selection failed.'
}
$fight = (Expect (Send-Json "$fightBase/next" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    200 'Next after manual selection').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $reorderedIds[0] -or $fight.round -ne 3) {
    throw 'Next did not use the current order after manual selection.'
}
$activeBeforeInsert = $fight.activeParticipantId
$fight = (Expect (Send-Json "$fightBase/participants" 'POST' `
    @{ revision = $fight.revision; mobName = 'Goblin' } $admin $campaign) `
    200 'Add mob during Fight').Content | ConvertFrom-Json
if ($fight.participants[0].name -ne 'Goblin' -or $fight.participants[0].initiative -ne $null `
    -or $fight.participants[1].id -ne $activeBeforeInsert `
    -or $fight.activeParticipantId -ne $activeBeforeInsert -or $fight.round -ne 3) {
    throw 'Fight addition did not insert before and preserve the active participant.'
}
$fightReloaded = (Expect (Invoke-WebRequest $fightBase -WebSession $admin -SkipHttpErrorCheck) `
    200 'Reload running Fight').Content | ConvertFrom-Json
if ($fightReloaded.revision -ne $fight.revision -or $fightReloaded.activeParticipantId -ne $activeBeforeInsert `
    -or @($fightReloaded.participants).Count -ne 4) { throw 'Fight state did not persist.' }
$orderBeforeMove = @($fight.participants | ForEach-Object { $_.id })
$activeIndex = [array]::IndexOf($orderBeforeMove, $activeBeforeInsert)
$expectedSuccessor = $orderBeforeMove[($activeIndex + 1) % $orderBeforeMove.Count]
$movedOrder = @($orderBeforeMove | Where-Object { $_ -ne $activeBeforeInsert }) + @($activeBeforeInsert)
$turnSumBeforeMove = ($fight.participants | Measure-Object -Property turnCount -Sum).Sum
$fight = (Expect (Send-Json "$fightBase/reorder" 'POST' `
    @{ revision = $fight.revision; orderedIds = $movedOrder } $admin $campaign) `
    200 'Move active participant').Content | ConvertFrom-Json
if ($fight.activeParticipantId -ne $expectedSuccessor -or $fight.round -ne 3 `
    -or ($fight.participants | Measure-Object -Property turnCount -Sum).Sum -ne $turnSumBeforeMove) {
    throw 'Moving the active participant changed counters or chose the wrong successor.'
}
$finished = (Expect (Send-Json "$fightBase/end" 'POST' @{ revision = $fight.revision } $admin $campaign) `
    200 'End encounter').Content | ConvertFrom-Json
if ($finished.phase -ne 'Finished' -or $finished.activeParticipantId -ne $null `
    -or $finished.round -ne 3) { throw 'Ending Fight did not preserve final state.' }
$null = Expect (Send-Json "$fightBase/next" 'POST' @{ revision = $finished.revision } $admin $campaign) `
    409 'Reject Next after End'
$null = Expect (Send-Json "$fightBase/participants" 'POST' `
    @{ revision = $finished.revision; mobName = 'Too late' } $admin $campaign) `
    409 'Reject addition after End'
$finalReload = (Expect (Invoke-WebRequest $fightBase -WebSession $admin -SkipHttpErrorCheck) `
    200 'Reload finished encounter').Content | ConvertFrom-Json
if ($finalReload.phase -ne 'Finished' -or @($finalReload.participants).Count -ne 4 `
    -or $finalReload.round -ne 3) { throw 'Finished encounter did not persist.' }

$solo = (Expect (Send-Json $encounterBase 'POST' @{ name = 'Solo' } $admin $campaign) `
    201 'Create single-participant encounter').Content | ConvertFrom-Json
$soloBase = "$encounterBase/$($solo.id)"
$solo = (Expect (Send-Json "$soloBase/participants" 'POST' `
    @{ revision = $solo.revision; mobName = 'Solo mob'; initiative = '0' } $admin $campaign) `
    200 'Add solo mob').Content | ConvertFrom-Json
$solo = (Expect (Send-Json "$soloBase/fight" 'POST' @{ revision = $solo.revision } $admin $campaign) `
    200 'Begin solo Fight').Content | ConvertFrom-Json
$soloId = $solo.activeParticipantId
$solo = (Expect (Send-Json "$soloBase/skip" 'POST' @{ revision = $solo.revision } $admin $campaign) `
    200 'Skip solo participant').Content | ConvertFrom-Json
if ($solo.activeParticipantId -ne $soloId -or $solo.round -ne 1 `
    -or $solo.participants[0].turnCount -ne 0) { throw 'Solo Skip changed a counter.' }
$solo = (Expect (Send-Json "$soloBase/next" 'POST' @{ revision = $solo.revision } $admin $campaign) `
    200 'Next solo participant').Content | ConvertFrom-Json
if ($solo.activeParticipantId -ne $soloId -or $solo.round -ne 2 `
    -or $solo.participants[0].turnCount -ne 1) { throw 'Solo Next did not increment both counters.' }

Write-Output 'Campaign, character, Prepare, Fight, persistence, and owner isolation passed.'
