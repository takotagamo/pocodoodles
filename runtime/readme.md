# ランタイム

## C# + System.Windows.Forms.Form

出力と一緒にruntime.csをコンパイルしてください。

## 吉里吉里2 + KAG3

clickable.ksを出力と同じ場所においてください。

## MS-DOS

画像のファイル形式を変更する場合は、出力末尾の

%include "pckload.inc"
imgload: jmp pckload

を書き換えてください。
bmpを使うなら

%include "bmpload.inc"
imgload: jmp bmpload

