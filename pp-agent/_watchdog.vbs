Dim shell, wmi, agentDir
Set shell = CreateObject("WScript.Shell")
agentDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
Set wmi = GetObject("winmgmts:\\.\root\cimv2")

Do While True
    Dim ppRunning, agentRunning
    ppRunning = False
    agentRunning = False

    Dim ppProcs
    Set ppProcs = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name LIKE 'ProPresenter%'")
    ppRunning = (ppProcs.Count > 0)

    Dim nodeProcs, p
    Set nodeProcs = wmi.ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'node.exe'")
    For Each p In nodeProcs
        If InStr(LCase(p.CommandLine), "agent.js") > 0 Then
            agentRunning = True
        End If
    Next

    If ppRunning And Not agentRunning Then
        shell.CurrentDirectory = agentDir
        shell.Run "node agent.js", 0, False
    End If

    WScript.Sleep 5000
Loop
