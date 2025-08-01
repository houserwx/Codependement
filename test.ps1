# PowerShell script to list all files in a directory

# Get all files in the current directory
Get-ChildItem -Path . -File

# Alternative: Get all files in a specific directory
# Get-ChildItem -Path "C:\YourDirectoryPath" -File

# Get all files including hidden ones
# Get-ChildItem -Path . -File -Force

# Get all files with specific extension (e.g., .txt)
# Get-ChildItem -Path . -Filter "*.txt"
