param(
    [Parameter(Mandatory)] [string] $Identifier,
    [Parameter(Mandatory)] [securestring] $Password,
    [string] $IdentityBaseUri = 'http://localhost:5186',
    [string] $CampaignBaseUri = 'http://localhost:5199',
    [switch] $ExerciseRevocation
)

$ErrorActionPreference = 'Stop'
$identity = $IdentityBaseUri.TrimEnd('/')
$campaign = $CampaignBaseUri.TrimEnd('/')
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

function Require-Status($Response, [int] $Expected, [string] $Step) {
    if ($Response.StatusCode -ne $Expected) {
        throw "$Step returned $($Response.StatusCode); expected $Expected."
    }
}

function Get-Redirect([string] $Uri) {
    $response = Invoke-WebRequest $Uri -WebSession $session -MaximumRedirection 0 `
        -SkipHttpErrorCheck -ErrorAction SilentlyContinue
    Require-Status $response 302 $Uri
    return $response.Headers.Location[0]
}

function Start-ProductSession([switch] $Silent) {
    $path = if ($Silent) { 'try-sign-in' } else { 'login' }
    $authorizationUri = Get-Redirect "$campaign/auth/$path"
    if (![uri]::IsWellFormedUriString($authorizationUri, [UriKind]::Absolute) `
        -or ([uri]$authorizationUri).AbsolutePath -ne '/connect/authorize') {
        throw 'The campaign host did not start an OpenID Connect authorization request.'
    }
    if ($Silent -and !([System.Web.HttpUtility]::ParseQueryString(([uri]$authorizationUri).Query)['prompt'] -eq 'none')) {
        throw 'Returning to campaigns did not request silent sign-in.'
    }
    $callbackUri = Get-Redirect $authorizationUri
    if (([uri]$callbackUri).AbsolutePath -ne '/signin-oidc') {
        throw 'Identity did not return an authorization code to the campaign host.'
    }
    $returnUri = Get-Redirect $callbackUri
    if (![uri]::IsWellFormedUriString($returnUri, [UriKind]::Absolute)) {
        throw 'The campaign callback did not return to the web app.'
    }
    $me = Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck
    Require-Status $me 200 'Campaign session check'
    $profile = $me.Content | ConvertFrom-Json
    if (!$profile.userId -or $profile.productId -ne 'janus-campaigns') {
        throw 'Campaign session returned an unexpected identity or product.'
    }
    return $profile
}

$discovery = Invoke-RestMethod "$identity/.well-known/openid-configuration"
if (!$discovery.code_challenge_methods_supported.Contains('S256')) {
    throw 'Identity discovery does not advertise S256 PKCE.'
}

$signedOut = Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck
Require-Status $signedOut 401 'Unauthenticated campaign check'
$anonymousAuthorization = Get-Redirect "$campaign/auth/try-sign-in"
$anonymousCallback = Get-Redirect $anonymousAuthorization
$anonymousReturn = Get-Redirect $anonymousCallback
if ([System.Web.HttpUtility]::ParseQueryString(([uri]$anonymousReturn).Query)['silent'] -ne 'done') {
    throw 'Silent sign-in without a shared login did not return to the campaign page.'
}

$passwordText = [System.Net.NetworkCredential]::new('', $Password).Password
try {
    $login = Invoke-WebRequest "$identity/account/login" -Method Post -WebSession $session `
        -ContentType 'application/json' -Body (@{
            identifier = $Identifier
            password = $passwordText
            rememberMe = $false
        } | ConvertTo-Json) -SkipHttpErrorCheck
    Require-Status $login 200 'Shared identity sign-in'
}
finally { $passwordText = $null }

$first = Start-ProductSession
$logout = Invoke-WebRequest "$campaign/auth/logout" -Method Post -WebSession $session `
    -Headers @{ Origin = $campaign } -SkipHttpErrorCheck
Require-Status $logout 200 'Campaign-only logout'
Require-Status (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
    401 'Logged-out campaign session'

# The shared identity cookie remains valid, so returning to the product needs no password.
$second = Start-ProductSession -Silent
if ($second.userId -ne $first.userId) {
    throw 'Returning to campaigns changed the authenticated user.'
}

if ($ExerciseRevocation) {
    $revoke = Invoke-WebRequest "$identity/admin/products/janus-campaigns/grants/$($second.userId)/revoke" `
        -Method Post -WebSession $session -Headers @{ Origin = $identity } -SkipHttpErrorCheck
    Require-Status $revoke 200 'Campaign grant revocation'
    Require-Status (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
        403 'Revoked campaign session'
}

Write-Output 'OpenID Connect sign-in, campaign-only logout, and password-free return passed.'
if ($ExerciseRevocation) { Write-Output 'Immediate product-session revocation passed.' }
