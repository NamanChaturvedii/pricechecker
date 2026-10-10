' Starts Price Checker in the background (no console window) and opens the dashboard.
' "/background" (used by the Windows-startup shortcut) starts it without opening the browser.
Const URL = "http://localhost:3939"
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir
background = WScript.Arguments.Count > 0
If background Then
  If LCase(WScript.Arguments(0)) <> "/background" Then background = False
End If

Function IsUp()
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 2000, 2000, 2000, 2000
  http.open "GET", URL & "/login", False
  http.send
  IsUp = (Err.Number = 0 And http.status = 200)
  On Error GoTo 0
End Function

If Not IsUp() Then
  sh.Run """" & dir & "\Start.bat"" hidden", 0, False
  For i = 1 To 120
    WScript.Sleep 1000
    If IsUp() Then Exit For
  Next
End If

If IsUp() Then
  If Not background Then sh.Run URL
ElseIf Not background Then
  MsgBox "Price Checker did not start." & vbCrLf & vbCrLf & _
         "Please send this file to the developer:" & vbCrLf & dir & "\data\launcher.log", vbExclamation, "Price Checker"
End If
