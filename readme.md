# pocodoodles

シンプルで静的でクロスプラットフォームなポイント&クリックアドベンチャーを作成するための。  
ターゲットによっては別のゲームに埋め込める出力になる。  
仕様(特に出力の仕様)は変更の可能性あり。  
名称poco部分はBing chatによる提案。  

## 仕様

背景画像1枚のみに透明なボタン複数を配置しただけの画面間を相互に行き来する形に。  
非常に簡単な動作のみ。画像と経路を工夫すればそれなりのものが作れる。  
絵本風のものに向く？  

## スクリプトの仕様

JSONになってる。  
中身は画面を表すオブジェクトの配列で、デフォルトではname=startのものが最初の画面。  

(0,0)-(64,64)の範囲をクリックすると画面が変わる例。  

```JSON
[
    {
        "name": "start",
        "bg": "bg.png",
        "buttons": [
            {
                "x": 0, "y": 0,
                "w": 64, "h":64,
                "next": "bye"
            }
        ]
    },
    {
        "name": "bye",
        "bg": "bye.png"
    }
]
```

buttonが複数のbuttonが重なっている場合、後から書いたものが優先される。  

### 未実装機能(今のところcanvas版でのみ動作)

他の環境でも対応予定。map版では対応予定無し。  

buttonとして次のようなオブジェクトが使え、後から書いたものほど手前に表示される。  

``` json
    {
        "x": 0, "y": 0,
        "image": "cup.png",
        "next": "scene2"
    }
```

buttonsとは別にimagesという配列を用意でき、これは機能を持たないスプライトとして使える。  
これらは画像ボタンより後ろに表示される。  

``` json
{
    "name": "start",
    "bg": "bg.png",
    "images": [
        { "x": 0, "y": 0, "image": "chair.png" },
        { "x": 0, "y": 0, "image": "table.png" }
    ],
    "buttons": [
        { "x": 0, "y": 0, "image": "cup.png", "next": "scene2" }
    ]
}
```

## ターゲット固有機能

### HTML + map のみの機能

buttonのnextに任意のURLを指定可能。  

### TyranoScript | 吉里吉里2 + KAG3 のみの機能

buttonのfileプロパティで外部ksファイルを指定可能(拡張子は省略)。
この場合、nextの値がラベルとみなされる。

## サンプルスクリプトの使い方 (windowsで)

サンプルの構成  

``` list
example/scenes.json  
example/image/*.png
```

配置 (共通)  

``` bat
copy example\image\*.png scenes\image\
```

### ターゲット = HTML + map

スクリプトの変換 (example/scenes.json -> scenes/html/*.html)  

``` bat
python example\scenes.json scenes\html\ map "" ../image
```

実行に必要なもの  

``` list
scenes/html/*.html
scenes/image/*.png
```

### ターゲット = HTML5 + JavaScript + Canvas

スクリプトの変換 (example/scenes.json -> scenes/canvas/scenes/scenes.js)  

``` bat
python example\scenes.json scenes\canvas\scenes\ canvas
```

ランタイムのビルド (runtime/ts/*.ts -> scenes/canvas/js/pocodoodles.js) (要TypeScript)  

``` bat
cd runtime\ts\
tsc
copy js\pocodoodles.js ..\..\scenes\canvas\js\
```

実行に必要なもの  

``` list
scenes/canvas/index.html
scenes/canvas/js/pocodoodles.js
scenes/canvas/scenes/scenes.js
scenes/image/*.png
```

### ターゲット = HTML5 + JavaScript + Phaser

GameConfigのsceneに割り当てられるScene配列を拡張するコードを生成。

### ターゲット = HTML5 + JavaScript + enchant.js

jsonローダーのみ。  

### ターゲット = HTML5 + JavaScript + kontra.js

jsonローダーのみ。  

### ターゲット = 吉里吉里2 + KAG3

スクリプトの変換 (json/scenes.json -> scenes/krkr/data/scenario/first.ks)  

``` bat
python pocodoodles.py example\scenes.json scenes\krkr\data\scenario\ krkr .\image\
ren scenes\scenes.ks scenes\first.ks
```

仮配置  

``` bat
copy .\example\image\*.png .\scenes\krkr\data\image\
copy .\runtime\krkr\clickable.ks .\scenes\krkr\data\scenario\
```

実行に必要なもの (これをkrkr.exeの階層に上書き)  

``` list
scenes/krkr/data/scenario/first.ks
scenes/krkr/data/scenario/clickable.ks
scenes/krkr/data/image/*.png
```

### ターゲット = Tyranoscript + KAG

吉里吉里2と大体同じ

### ターゲット = C# + Windows.Forms.Form

出力はMyGame.exeにする想定。  

スクリプトの変換 (example/scenes.json -> scenes/form/scenes.cs)  

``` bat
python pocodoodles.py example\scenes.json scenes\form\ form MyGame start ../image/
ren scenes\form\scenes.cs scenes\form\MyGame.cs
```

ビルド (要C#コンパイラ)  

``` bat
csc -out:MyGame.exe scenes\form\MyGame.cs runtime\form\runtime.cs
```

実行に必要なファイル  

``` list
scenes\form\MyGame.exe
scenes\image\*.png
```

### ターゲット = MS-DOS + VGA + MOUSE.EXE

未完成  

## 予定

整理する。  
簡単なエディタを付ける。  
