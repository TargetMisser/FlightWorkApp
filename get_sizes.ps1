Get-ChildItem -Directory -Force | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{
        Name = $_.Name
        SizeGB = [Math]::Round($size / 1GB, 2)
    }
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
