param(
    [Parameter(Mandatory)] [string] $Identifier,
    [Parameter(Mandatory)] [securestring] $Password,
    [string] $IdentityBaseUri = 'http://localhost:5186'
)

$ErrorActionPreference = 'Stop'
$identity = $IdentityBaseUri.TrimEnd('/')
$origin = ([uri] $identity).GetLeftPart([System.UriPartial]::Authority)
$passwordText = [System.Net.NetworkCredential]::new('', $Password).Password

function Login([bool] $Remember) {
    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $response = Invoke-WebRequest "$identity/account/login" -Method Post -WebSession $session `
        -Headers @{ Origin = $origin } -ContentType 'application/json' `
        -Body (@{ identifier = $Identifier; password = $passwordText; rememberMe = $Remember } | ConvertTo-Json) `
        -SkipHttpErrorCheck
    if ($response.StatusCode -ne 200) { throw "Login failed: $($response.StatusCode)" }
    return $session
}

function Session-Cookie($Session) {
    $cookie = $Session.Cookies.GetCookies([uri] $identity) |
        Where-Object { $_.Name -eq '.AspNetCore.Identity.Application' } |
        Select-Object -First 1
    if (!$cookie) { throw 'Identity cookie was not issued.' }
    return $cookie
}

try {
    $ordinary = Login $false
    $ordinaryCookie = Session-Cookie $ordinary
    if (!$ordinaryCookie.Expires.Equals([datetime]::MinValue)) {
        throw 'A non-remembered login issued a persistent browser cookie.'
    }
    $ordinaryActivity = Invoke-WebRequest "$identity/account/activity" -Method Post `
        -WebSession $ordinary -Headers @{ Origin = $origin } -SkipHttpErrorCheck
    if ($ordinaryActivity.StatusCode -ne 204) { throw 'Non-remembered activity failed.' }
    if (!(Session-Cookie $ordinary).Expires.Equals([datetime]::MinValue)) {
        throw 'Activity made a non-remembered cookie persistent.'
    }

    $remembered = Login $true
    $initialExpiry = (Session-Cookie $remembered).Expires
    if ($initialExpiry -lt [datetime]::UtcNow.AddDays(29) -or
        $initialExpiry -gt [datetime]::UtcNow.AddDays(31)) {
        throw 'Remembered login did not issue a roughly 30-day cookie.'
    }
    Start-Sleep -Seconds 2
    $passive = Invoke-WebRequest "$identity/account/me" -WebSession $remembered -SkipHttpErrorCheck
    if ($passive.StatusCode -ne 200) { throw 'Passive profile request failed.' }
    $passiveExpiry = (Session-Cookie $remembered).Expires
    if ($passiveExpiry -ne $initialExpiry) {
        throw 'A passive profile request extended the remembered cookie.'
    }
    $activity = Invoke-WebRequest "$identity/account/activity" -Method Post `
        -WebSession $remembered -Headers @{ Origin = $origin } -SkipHttpErrorCheck
    if ($activity.StatusCode -ne 204) { throw 'Remembered activity failed.' }
    if ((Session-Cookie $remembered).Expires -le $initialExpiry) {
        throw 'User activity did not extend the remembered cookie.'
    }
    Write-Output 'Browser-session and user-activity-only remembered renewal passed.'
}
finally { $passwordText = $null }
