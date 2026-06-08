$conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($null -ne $conns) {
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Output ("Stopped PID {0}" -f $pid)
    } catch {
      Write-Output ("Failed to stop PID {0}: {1}" -f $pid, $_.Exception.Message)
    }
  }
} else {
  Write-Output "No process found on port 3000"
}
