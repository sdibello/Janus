param(
    [Parameter(Mandatory)] [string] $AdminIdentifier,
    [Parameter(Mandatory)] [string] $AdminEmail,
    [Parameter(Mandatory)] [securestring] $AdminPassword,
    [string] $IdentityBaseUri = 'http://localhost:5186',
    [string] $CampaignBaseUri = 'http://localhost:5199',
    [string] $ProofBaseUri = 'http://localhost:5201'
)

$ErrorActionPreference = 'Stop'
$identity = $IdentityBaseUri.TrimEnd('/')
$campaign = $CampaignBaseUri.TrimEnd('/')
$proof = $ProofBaseUri.TrimEnd('/')
$sessionA = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$sessionB = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$originalPassword = [System.Net.NetworkCredential]::new('', $AdminPassword).Password
$changedPassword = "Changed passphrase $([guid]::NewGuid().ToString('N'))"
$resetPassword = "Reset passphrase $([guid]::NewGuid().ToString('N'))"

function Expect($Response, [int] $Status, [string] $Step) {
    if ($Response.StatusCode -ne $Status) {
        throw "$Step returned $($Response.StatusCode); expected $Status. $($Response.Content)"
    }
    return $Response
}

function Post-Json([string] $Uri, $Body, $Session) {
    Invoke-WebRequest $Uri -Method Post -WebSession $Session -Headers @{ Origin = $identity } `
        -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Compress) -SkipHttpErrorCheck
}

function Start-Product([string] $Base, [string] $ProductId, $Session) {
    $challenge = Expect (Invoke-WebRequest "$Base/auth/try-sign-in" -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Product challenge'
    $authorization = Expect (Invoke-WebRequest $challenge.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Identity authorization'
    $null = Expect (Invoke-WebRequest $authorization.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Product callback'
    $profile = (Expect (Invoke-WebRequest "$Base/auth/me" -WebSession $Session -SkipHttpErrorCheck) `
        200 'Product profile').Content | ConvertFrom-Json
    if ($profile.productId -ne $ProductId -or !$profile.userId) {
        throw 'Product session returned the wrong user or product.'
    }
    return $profile
}

function Expect-SilentDenied([string] $Base, $Session) {
    $challenge = Expect (Invoke-WebRequest "$Base/auth/try-sign-in" -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Revoked session challenge'
    $authorization = Expect (Invoke-WebRequest $challenge.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Revoked identity authorization'
    $null = Expect (Invoke-WebRequest $authorization.Headers.Location[0] -WebSession $Session `
        -MaximumRedirection 0 -SkipHttpErrorCheck -ErrorAction SilentlyContinue) 302 'Revoked product callback'
    $null = Expect (Invoke-WebRequest "$Base/auth/me" -WebSession $Session -SkipHttpErrorCheck) `
        403 'Revoked product remains inaccessible'
}

try {
    $null = Expect (Post-Json "$identity/account/login" @{
        identifier = $AdminIdentifier; password = $originalPassword; rememberMe = $true
    } $sessionA) 200 'Remembered first login'
    $null = Expect (Post-Json "$identity/account/login" @{
        identifier = $AdminIdentifier; password = $originalPassword; rememberMe = $false
    } $sessionB) 200 'Second login'

    $account = (Expect (Invoke-WebRequest "$identity/account/me" -WebSession $sessionA -SkipHttpErrorCheck) `
        200 'Shared profile').Content | ConvertFrom-Json
    if ($account.email -ne $AdminEmail) { throw 'The supplied email does not match the signed-in account.' }

    $registered = Invoke-WebRequest "$identity/products/janus-session-proof" -SkipHttpErrorCheck
    if ($registered.StatusCode -eq 404) {
        $null = Expect (Post-Json "$identity/admin/products" @{
            id = 'janus-session-proof'; name = 'Session proof'
        } $sessionA) 201 'Register proof product'
    } else { $null = Expect $registered 200 'Proof product metadata' }

    $access = Invoke-WebRequest "$identity/account/access/janus-session-proof" -WebSession $sessionA -SkipHttpErrorCheck
    if ($access.StatusCode -eq 403) {
        $request = (Expect (Post-Json "$identity/products/janus-session-proof/access-requests" @{} $sessionA) `
            201 'Request proof access').Content | ConvertFrom-Json
        $null = Expect (Post-Json "$identity/admin/access-requests/$($request.id)/approve" @{} $sessionA) `
            200 'Approve proof access'
    } else { $null = Expect $access 200 'Existing proof access' }

    foreach ($session in @($sessionA, $sessionB)) {
        $campaignProfile = Start-Product $campaign 'janus-campaigns' $session
        $proofProfile = Start-Product $proof 'janus-session-proof' $session
        if ($campaignProfile.userId -ne $account.id -or $proofProfile.userId -ne $account.id) {
            throw 'Product sessions do not share the signed-in identity.'
        }
    }

    $null = Expect (Post-Json "$identity/account/change-password" @{
        currentPassword = $originalPassword; newPassword = $changedPassword
    } $sessionA) 200 'Change password'
    $null = Expect (Invoke-WebRequest "$identity/account/me" -WebSession $sessionA -SkipHttpErrorCheck) `
        200 'Current identity session retained'
    $null = Expect (Invoke-WebRequest "$identity/account/me" -WebSession $sessionB -SkipHttpErrorCheck) `
        401 'Other identity session revoked'
    foreach ($session in @($sessionA, $sessionB)) {
        $null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
            403 'Old campaign token revoked by change'
        $null = Expect (Invoke-WebRequest "$campaign/campaigns" -WebSession $session -SkipHttpErrorCheck) `
            403 'Old campaign data request revoked by change'
        $null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
            403 'Old proof token revoked by change'
    }
    foreach ($product in @(@($campaign, 'janus-campaigns'), @($proof, 'janus-session-proof'))) {
        $profile = Start-Product $product[0] $product[1] $sessionA
        if ($profile.userId -ne $account.id) { throw 'Current session renewal changed identity.' }
        Expect-SilentDenied $product[0] $sessionB
    }

    $null = Expect (Post-Json "$identity/account/request-password-reset" @{ email = $AdminEmail } `
        ([Microsoft.PowerShell.Commands.WebRequestSession]::new())) 200 'Request password reset'
    $messages = Invoke-RestMethod "$identity/dev/inbox"
    $message = @($messages | Where-Object {
        $_.recipient -eq $AdminEmail -and $_.subject -eq 'Reset your Janus password'
    })[0]
    if (!$message) { throw 'Password reset message missing from local test inbox.' }
    $query = [System.Web.HttpUtility]::ParseQueryString(([uri] $message.actionUrl).Query)
    $null = Expect (Post-Json "$identity/account/reset-password" @{
        userId = $query['resetUser']; token = $query['resetToken']; newPassword = $resetPassword
    } ([Microsoft.PowerShell.Commands.WebRequestSession]::new())) 200 'Reset password'

    foreach ($session in @($sessionA, $sessionB)) {
        $null = Expect (Invoke-WebRequest "$identity/account/me" -WebSession $session -SkipHttpErrorCheck) `
            401 'Identity session revoked by reset'
        $null = Expect (Invoke-WebRequest "$campaign/auth/me" -WebSession $session -SkipHttpErrorCheck) `
            403 'Campaign session revoked by reset'
        $null = Expect (Invoke-WebRequest "$proof/auth/me" -WebSession $session -SkipHttpErrorCheck) `
            403 'Proof session revoked by reset'
    }
    Expect-SilentDenied $campaign $sessionA
    Expect-SilentDenied $proof $sessionA
    $null = Expect (Post-Json "$identity/account/login" @{
        identifier = $AdminIdentifier; password = $changedPassword; rememberMe = $false
    } ([Microsoft.PowerShell.Commands.WebRequestSession]::new())) 401 'Changed password no longer works'
    $null = Expect (Post-Json "$identity/account/login" @{
        identifier = $AdminIdentifier; password = $resetPassword; rememberMe = $false
    } ([Microsoft.PowerShell.Commands.WebRequestSession]::new())) 200 'Reset password works'
    Write-Output 'Password change and reset revoked both products; current-session silent renewal passed.'
}
finally {
    $originalPassword = $null
    $changedPassword = $null
    $resetPassword = $null
}
