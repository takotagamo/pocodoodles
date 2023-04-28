@setlocal
    @call :main %*
@endlocal

@goto :eof


:init
    @rem // change this to installed dir //
    @set pocodoodles_dir=%~pd0\..\
    @set cls=%~2

    @goto :eof
:help
    @echo scenes2form proj_dir MainClassName
    @echo scenes2form script_file ClassName

    @goto :eof
:main
    @if "%~2" == "" goto :help
    @call :init "%~1" "%~2"

    @if "%~x1" == ".json" goto :ss_file
    @if exist "%~pdn1\scenes.json" goto :ss_proj

    @goto :help

    @goto :eof

:ss_one
    @python "%pocodoodles_dir%\pocodoodles.py" "%~1" "%~pd1\" form "%~2" start ./image/

    @goto :eof

:ss_proj
    @call :ss_one "%~pdn1\scenes.json" "%~2"
    @csc -t:winexe -out:"%~pdn1\%~2.exe" "%~pdn1\scenes.cs" %pocodoodles_dir%\runtime\form\runtime.cs

    @goto :eof

:eof
