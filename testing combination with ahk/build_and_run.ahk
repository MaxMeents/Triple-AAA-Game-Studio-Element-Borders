#Requires AutoHotkey v2.0
; =========================================================================
;  AAA Borders — Single-File Bundler
; -------------------------------------------------------------------------
;  Reads src/index.html, inlines every referenced <link rel="stylesheet">
;  and <script src="…"> into the document, writes out `bundle.html` in
;  this folder, and opens it in the default browser.
;
;  Run this script (double-click or from AHK v2):
;
;      AutoHotkey.exe build_and_run.ahk
;
;  Produces:
;      bundle.html   — single self-contained file (HTML + CSS + JS)
;
;  No dependencies outside the `src/` folder.
; =========================================================================

SrcDir  := A_ScriptDir "\src"
OutFile := A_ScriptDir "\bundle.html"
LogFile := A_ScriptDir "\build.log"

Main()

Main() {
    Log("==== AAA Borders bundler · " FormatTime(,"yyyy-MM-dd HH:mm:ss") " ====")

    if !DirExist(SrcDir) {
        MsgBox "Source folder missing:`n" SrcDir, "Bundler", 16
        ExitApp 1
    }

    ; 1. Load the template HTML.
    tplPath := SrcDir "\index.html"
    if !FileExist(tplPath) {
        MsgBox "index.html not found in src/", "Bundler", 16
        ExitApp 1
    }
    html := FileRead(tplPath, "UTF-8")
    Log("Loaded template: " tplPath " (" StrLen(html) " chars)")

    ; 2. Inline every <link rel="stylesheet" href="…">
    cssCount := 0
    html := InlineTags(html,
        'i)<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',
        "css", &cssCount)
    Log("Inlined " cssCount " stylesheet(s)")

    ; 3. Inline every <script src="…"></script>
    jsCount := 0
    html := InlineTags(html,
        'is)<script\s+src="([^"]+)"\s*>\s*</script\s*>',
        "js", &jsCount)
    Log("Inlined " jsCount " script(s)")

    ; 4. Annotate the bundle (banner at top of <head>).
    banner := "<!-- Bundled by build_and_run.ahk on "
           .  FormatTime(,"yyyy-MM-dd HH:mm:ss")
           .  " · " cssCount " css + " jsCount " js files -->`n"
    html := RegExReplace(html, "i)(<head[^>]*>)", "$1`n" banner,, 1)

    ; 5. Write output.
    if FileExist(OutFile)
        FileDelete(OutFile)
    FileAppend(html, OutFile, "UTF-8")
    Log("Wrote bundle: " OutFile " (" FileGetSize(OutFile) " bytes)")

    ; 6. Launch in default browser.
    try {
        Run(OutFile)
        Log("Launched browser")
    } catch Error as e {
        Log("Launch failed: " e.Message)
        MsgBox "Bundle written but could not launch:`n" OutFile
                . "`n`n" e.Message, "Bundler", 48
    }

    ; Optional toast — uncomment to confirm visually.
    ; TrayTip "Bundle ready", cssCount " css + " jsCount " js → bundle.html", 1
}

; -------------------------------------------------------------------------
;  InlineTags — scans `html` for matches of `pattern` whose first capture
;  group is a path relative to SrcDir.  Replaces each match with either
;  <style>…</style> (kind="css") or <script>…</script> (kind="js") using
;  the referenced file's contents.
;
;  Missing files are replaced with an HTML comment and logged so the
;  bundle still loads.
; -------------------------------------------------------------------------
InlineTags(html, pattern, kind, &count) {
    count := 0
    pos := 1
    Loop {
        if !RegExMatch(html, pattern, &m, pos)
            break

        rel  := m[1]
        file := SrcDir "\" StrReplace(rel, "/", "\")

        if FileExist(file) {
            body := FileRead(file, "UTF-8")
            if (kind = "css")
                repl := "<style>`n/* " rel " */`n" body "`n</style>"
            else
                repl := "<script>`n/* " rel " */`n" body "`n</script>"
            count += 1
            Log("  + " rel " (" StrLen(body) " chars)")
        } else {
            repl := "<!-- MISSING " kind " FILE: " rel " -->"
            Log("  ! missing: " rel)
        }

        ; Splice the replacement in place of the matched tag.
        html := SubStr(html, 1, m.Pos - 1) . repl . SubStr(html, m.Pos + m.Len)
        ; Advance past the newly-inserted content so we don't re-scan it.
        pos := m.Pos + StrLen(repl)
    }
    return html
}

; -------------------------------------------------------------------------
;  Helpers
; -------------------------------------------------------------------------
Log(msg) {
    try FileAppend(msg "`n", LogFile, "UTF-8")
}

FileGetSize(path) {
    f := FileOpen(path, "r")
    if !f
        return 0
    sz := f.Length
    f.Close()
    return sz
}
