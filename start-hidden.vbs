Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root
node = "C:\Program Files\nodejs\node.exe"
If Not fso.FileExists(node) Then node = "node"
sh.Run """" & node & """ watch-server.js", 0, False
