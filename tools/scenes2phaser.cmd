@setlocal
    @call :main %*
@endlocal

@goto :eof


:init
    @rem // change this to installed dir //
    @set pocodoodles_dir=%~pd0\..\

    @goto :eof
:help
    @echo scenes2phaser proj_dir
    @echo scenes2phaser script_file [scene_array_name] [scene_prefix]

    @goto :eof
:main
    @if "%~1" == "" goto :help
    @call :init "%~1"

    @if "%~x1" == ".json" goto :ss_one
    @if exist "%~pdn1\scenes.json" goto :ss_proj

    @goto :help

    @goto :eof

:ss_one
    @python "%pocodoodles_dir%\pocodoodles.py" "%~1" "%~pdn1\" phaser "%~2" "%~3" ./image/
    @goto :eof

:ss_proj
    @call :ss_one "%~pdn1\scenes.json" "scenes" ""
    @mkdir "%~pdn1\dist\"
    @mkdir "%~pdn1\dist\js"
    @mkdir "%~pdn1\dist\scenes"
    @mkdir "%~pdn1\dist\image"
    @copy "%~pdn1\scenes.json" "%~pdn1\dist\scenes\"
    @copy "%~pdn1\image\*.*" "%~pdn1\dist\image\"
    @copy "%pocodoodles_dir%\runtime\phaser\js\phaser.min.js" "%~pdn1\dist\js\"
    @copy "%pocodoodles_dir%\runtime\phaser\index.html" "%~pdn1\dist\"

    @goto :eof

:eof
