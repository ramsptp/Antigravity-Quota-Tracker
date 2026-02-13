$ErrorActionPreference = "Stop"

try {
    # 1. Find the Antigravity Language Server process
    $proc = Get-CimInstance Win32_Process -Filter "name='language_server_windows_x64.exe'" | Select-Object -First 1
    if (!$proc) { 
        Write-Output '{"error": "Process not found", "message": "The Antigravity language server is not running. Please open a project in VS Code with Antigravity enabled."}'
        exit 0
    }

    # 2. Extract Credentials from Command Line
    $cmd = $proc.CommandLine
    $tokenMatch = [regex]::Match($cmd, "--csrf_token[=\s]+([a-f0-9\-]+)")
    if (!$tokenMatch.Success) {
        Write-Output '{"error": "Token not found", "message": "Could not extract CSRF token from the process command line."}'
        exit 0
    }
    $token = $tokenMatch.Groups[1].Value
    $pid_val = $proc.ProcessId

    # 3. Find Listening Ports
    $ports = Get-NetTCPConnection -OwningProcess $pid_val -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort
    if (!$ports) {
        Write-Output '{"error": "No ports found", "message": "The language server process is running but not listening on any ports."}'
        exit 0
    }

    # 4. Iterate Ports and Fetch Data
    "Trying ports: $($ports -join ', ')" | Out-File "debug_quota.log" -Append -Encoding utf8
    foreach ($p in $ports) {
        try {
            "Testing port $p" | Out-File "debug_quota.log" -Append -Encoding utf8
            $uri = "http://127.0.0.1:$p/exa.language_server_pb.LanguageServerService/GetUserStatus"
            $body = '{"metadata":{"ideName":"antigravity","extensionName":"antigravity","locale":"en"}}'
            
            $res = Invoke-RestMethod -Uri $uri -Method Post -Headers @{
                "Content-Type" = "application/json"
                "X-Codeium-Csrf-Token" = $token
                "Connect-Protocol-Version" = "1"
                "Origin" = "http://127.0.0.1"
                "User-Agent" = "VSCode/1.0"
            } -Body $body -TimeoutSec 5 -ErrorAction Stop
            
            # Success! Output the raw JSON response
            "Success on port $p" | Out-File "debug_quota.log" -Append -Encoding utf8
            $json = $res | ConvertTo-Json -Depth 10 -Compress
            Write-Output $json
            exit 0
        } catch {
            "Failed on port $p : $($_.Exception.Message)" | Out-File "debug_quota.log" -Append -Encoding utf8
            continue
        }
    }

    # If loop finishes without success
    "All ports failed" | Out-File "debug_quota.log" -Append -Encoding utf8
    Write-Output '{"error": "Connection failed", "message": "Could not connect to the API on any discoverable port."}'
    exit 0

} catch {
    $errMessage = $_.Exception.Message -replace '"', '\"'
    Write-Output "{`"error`": `"Script Error`", `"message`": `"$errMessage`"}"
    exit 1
}
