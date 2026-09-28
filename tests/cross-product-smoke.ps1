param(
    [Parameter(Mandatory)] [string] $AdminIdentifier,
    [Parameter(Mandatory)] [securestring] $AdminPassword,
    [string] $IdentityBaseUri = 'http://localhost:5186',
    [string] $CampaignBaseUri = 'http://localhost:5199',
    [string] $ProofBaseUri = 'http://localhost:5201'
)

$ErrorActionPreference = 'Stop'
$identity = $IdentityBaseUri.TrimEnd('/')
$campaign = $CampaignBaseUri.TrimEnd('/')
$proof = $ProofBaseUri.TrimEnd('/')
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

function Expect($Response, [int] $Status, [string] $Step) {
    if ($Response.StatusCode -ne $Status) {
        throw "$Step returned $($Response.StatusCode); expected $Status. $($Response.Content)"
    }
    return $Response
}

function Post-Json([string] $Uri, $Body) {
    return Invoke-WebRequest $Uri -Method Post -WebSession $session `
        -Headers @{ Origin = $identity } -ContentType 'application/json' `
        -Body ($Body | ConvertTo-Json) -SkipHttpErrorCheck
}

function Start-Product([string] $Base, [string] $ExpectedProduct, [switch] $Silent) {
    $path = if ($Silent) { 'try-sign-in' } else { 'login' }
    $challenge = Expect (Invoke-WebRequest "$Base/auth/$path" -WebSession $session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Product challenge'
    $authorization = Expect (Invoke-WebRequest $challenge.Headers.Location[0] -WebSession $session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Identity authorization'
    $callback = Expect (Invoke-WebRequest $authorization.Headers.Location[0] -WebSession $session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Product callback'
    $profile = (Expect (Invoke-WebRequest "$Base/auth/me" -WebSession $session -SkipHttpErrorCheck) `
        200 'Product profile').Content | ConvertFrom-Json
    if ($profile.productId -ne $ExpectedProduct -or !$profile.userId) {
        throw 'The product session returned a different identity or product.'
    }
    return $profile
}

$passwordText = [System.Net.NetworkCredential]::new('', $AdminPassword).Password
try {
    $null = Expect (Post-Json "$identity/account/login" `
        @{ identifier = $AdminIdentifier; password = $passwordText; rememberMe = $false }) `
        200 'Shared login'
}
finally { $passwordText = $null }

$campaignProfile = Start-Product $campaign 'janus-campaigns'
$registered = Invoke-WebRequest "$identity/products/janus-session-proof" -SkipHttpErrorCheck
if ($registered.StatusCode -eq 404) {
    $null = Expect (Post-Json "$identity/admin/products" `
        @{ id = 'janus-session-proof'; name = 'Session proof' }) 201 'Register proof product'
} else { $null = Expect $registered 200 'Proof product metadata' }

$deniedChallenge = Expect (Invoke-WebRequest "$proof/auth/try-sign-in" -WebSession $session `
    -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Proof challenge before grant'
$deniedAuthorization = Expect (Invoke-WebRequest $deniedChallenge.Headers.Location[0] -WebSession $session `
    -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Proof authorization denied'
$deniedCallback = Expect (Invoke-WebRequest $deniedAuthorization.Headers.Location[0] -WebSession $session `
    -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Proof denied callback'
$null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    401 'No proof grant'

$request = (Expect (Post-Json "$identity/products/janus-session-proof/access-requests" @{}) `
    201 'Request proof access').Content | ConvertFrom-Json
$null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    401 'Pending access grants no proof session'
$null = Expect (Post-Json "$identity/admin/access-requests/$($request.id)/approve" @{}) `
    200 'Approve proof access'

$proofProfile = Start-Product $proof 'janus-session-proof' -Silent
if ($proofProfile.userId -ne $campaignProfile.userId) {
    throw 'Products did not share the same user ID.'
}
$null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    200 'Campaign remains signed in'

$null = Expect (Invoke-WebRequest "$proof/auth/logout" -Method Post -WebSession $session `
    -Headers @{ Origin = $proof } -SkipHttpErrorCheck) 200 'Proof-only logout'
$null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    401 'Proof logout invalidates proof session'
$null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    200 'Proof logout leaves campaigns signed in'
$returned = Start-Product $proof 'janus-session-proof' -Silent
if ($returned.userId -ne $campaignProfile.userId) { throw 'Silent product return changed user ID.' }

$null = Expect (Post-Json "$identity/admin/products/janus-session-proof/grants/$($returned.userId)/revoke" @{}) `
    200 'Revoke proof grant'
$null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    403 'Revocation blocks existing proof session'
$null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    200 'Proof revocation leaves campaigns signed in'

Write-Output 'Shared sign-in, independent product logout, and product-scoped revocation passed.'
