Set WshShell = CreateObject("WScript.Shell")
Set oLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\MyQawam.lnk")
oLink.TargetPath = WshShell.ExpandEnvironmentStrings("%WINDIR%") & "\System32\wscript.exe"
oLink.Arguments = """" & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\MyQawam.vbs"""
oLink.WorkingDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
oLink.IconLocation = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\logo.ico, 0"
oLink.Description = "MyQawam - Tableau de bord de vie"
oLink.Save
WScript.Echo "Raccourci créé sur le bureau !"
