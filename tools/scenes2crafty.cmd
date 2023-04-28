@setlocal
    @call :main %*
@endlocal

@goto :eof


:init
    @rem // change this to installed dir //
    @set pocodoodles_dir=%~pd0\..\

    @goto :eof
:help
    @echo scenes2crafty proj_dir\

    @goto :eof
:main
    @if "%~1" == "" goto :help
    @call :init "%~1"

    @if exist "%~pdn1\scenes.json" goto :ss_proj

    @goto :help

    @goto :eof

:ss_proj
    @mkdir "%~pdn1\dist\"
    @mkdir "%~pdn1\dist\js"
    @mkdir "%~pdn1\dist\scenes"
    @mkdir "%~pdn1\dist\image"
    @copy "%~pdn1\scenes.json" "%~pdn1\dist\scenes\"
    @copy "%~pdn1\image\*.*" "%~pdn1\dist\image\"
    @copy "%pocodoodles_dir%\loader\crafty\js\crafty-min.js" "%~pdn1\dist\js\"
    @copy "%pocodoodles_dir%\loader\crafty\js\pocodoodles-crafty.loader.js" "%~pdn1\dist\js\"
    @copy "%pocodoodles_dir%\loader\crafty\index.html" "%~pdn1\dist\"

    @goto :eof

:eof
