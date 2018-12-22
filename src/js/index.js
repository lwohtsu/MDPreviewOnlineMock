$(function(){
    
    var dh = window.innerHeight ;
    var tabh = $('.nav-wrapper').height();
    $('#expage-preview').height(dh- tabh);
    
    window.onresize = function(){
        var dh = window.innerHeight ;
        var tabh = $('.nav-wrapper').height();
        $('#expage-preview').height(dh- tabh);        
    }

    // エディタエリアの開閉
    // $('#markdown-editor').hide();    
    $('#editor-bar').click(function(){
        $('#markdown-editor').toggle();
    });

    // エディタ初期化
    var editor = ace.edit('markdown-editor');
    editor.setTheme('ace/theme/twilight');
    editor.getSession().setMode('ace/mode/markdown');
    // これを入れないと日本語入力時に警告が出まくる
    editor.$blockScrolling = Infinity;
    editor.getSession().setUseWrapMode(true);
    editor.setValue(mdsrctext);
    editor.getSession().setTabSize(4);
    editor.getSession().setUseSoftTabs(true);

    var timer = setTimeout(function(){
        renderMD(mdsrctext);
    }, 500);
    
    // // モーダル初期化
    // $('.modal').modal();

    // 変更監視
    var mdchange = false;
    editor.on("change", function(){
        mdchange = true;
        console.log("changed");
    });

    function loop(){
        if(mdchange){
            mdsrc = editor.getValue();
            renderMD(mdsrc);    
            mdchange = false;
        }
        var timer = setTimeout(loop, 2000);
    };
    loop();

});


function renderMD(mdtext){
    var marked_options = {
    // renderer: renderer2,
    gfm: true,        //GitHub Flavored Markdown
    tables: true,     //表組み対応
    breaks: false,    //GFMページブレーク対応
    pedantic: false,
    sanitize: false,  //HTMLタグのエスケープ（svgなどを通したいので無効に）
    smartLists: true,
    smartypants: false,
    // // コードハイライト用の関数を当てる
    // highlight: function(code, lang){
    //     var out = code;
    //     // ```言語名 での指定があればそれを使う
    //     try {
    //     out = hljs.highlight(lang, code).value;
    //     } catch (e){
    //     out = hljs.highlightAuto(code).value;
    //     }
    //     return out;
    // }
    };

    // console.log(html);
    var exiframe =  $('#expage-preview');
    var exbody = exiframe.contents().find('body');
    // console.log(exbody);
    // mdtext = svgimg(mdtext);
    var html = marked(mdtext, marked_options);

    // リプレースリストの置換
    for(var i=0; i<postReplaceList.length; i++){
        html = html.replace(new RegExp(postReplaceList[i].f, 'g'), 
                postReplaceList[i].r);
    }


    exbody.html(html);

    // 画像の処理
    exbody.find("img").each(function(){
        if(this.src.indexOf('?svgimg=') < 0) return;
        // console.log(this.src);
        svgimg2(this);
    });

}

// オンラインデモ用にSVGIMGを作り直したもの
function svgimg2(img){
    // 解像度からmmを得るための値を求めておく
    var density = 72;
    var dpi2mm = 25.4 / density;

    var img2 = new Image();
    var $1 = img.src;
    img2.src = $1;
    img2.onload = function(){
        var nativewidth = img2.width;
        var nativeheight = img2.height;

        // strはマッチテキスト全体、$1はファイル名
        var s = $1.indexOf('?svgimg=');
        if(s<0) return str;

        var scale = 1;
        var trimW = 0, trimH = 0;
        var shiftX = 0, shiftY=0;
        var params = $1.substring($1.indexOf('=')+1).split(',');
        if(params.length < 1) return str;  // パラメータ不正
        scale = parseFloat(params[0]) / 100;
        if(params.length > 1 && params[1].length > 0) trimW = parseFloat(params[1]);  
        if(params.length > 2 && params[2].length > 0) trimH = parseFloat(params[2]);  
        if(params.length > 3 && params[3].length > 0) shiftX = parseFloat(params[3]);  
        if(params.length > 4 && params[4].length > 0) shiftY = parseFloat(params[4]);  
        // console.log(scale + ', ' + trimW + ', ' + trimH + ', ' + shiftX + ', ' + shiftY);
        // サイズを取得
        var printW = nativewidth * dpi2mm;
        var printH = nativeheight * dpi2mm;
        // 小数点第三位までにしておく
        printW = Math.round(printW * 1000) / 1000;
        printH = Math.round(printH * 1000) / 1000;
        // 拡大縮小を反映
        var newscale = scale;
        var scaleW = printW * newscale;
        var scaleH = printH * newscale;
        // 小数点第三位までにしておく
        newscale = Math.round(newscale * 1000) / 1000;
        scaleW = Math.round(scaleW * 1000) / 1000;
        scaleH = Math.round(scaleH * 1000) / 1000;
        if(trimW == 0) trimW = scaleW;
        if(trimH == 0) trimH = scaleH;
        // svg生成
        var result = '<svg width="' + trimW + 'mm" height="' + trimH + 'mm" ' 
                + 'viewBox="0 0 ' + trimW + ' ' + trimH + '">\n';
        result += '<image width="' + printW + '" height="' + printH + '" ' 
                + 'xlink:href="' + $1.substring(0, s) + '" '
                + 'transform="translate('+ shiftX + ','+ shiftY + ') '
                + 'scale(' + newscale + ')"> \n';
        result += '</svg> \n';
        // console.log(result);
        $(img).replaceWith(result);
    }
}


// クエリ文字列（?svgimg=倍率,幅トリム,高さトリム,縦シフト,横シフト）SVG
// 倍率以外は省略可
function svgimg(mdtext){
    // console.log('svgimg');
    // 解像度からmmを得るための値を求めておく
    var density = 72;
    var dpi2mm = 25.4 / density;
    // 置換実行
    var mdsvgtext = mdtext.replace(/!\[[^\]]*\]\(([^\)]+)\)/g, function(str, $1){
    // strはマッチテキスト全体、$1はファイル名
    // クエリ文字列?svgimg=を含まない場合は置換しない
    var s = $1.indexOf('?svgimg=');
    if(s<0) return str;
    // ElectronのnativeImageが使えないのでデモ用の処理
    var img = new Image();
    img.src = "sample/" + $1;
    // var imgpath = path.join(workfolder, $1.substring(0, s));
    // console.log(imgpath);
    // var img = nativeImage.createFromPath(imgpath);
    // 読み込めない場合は変換せずにそのまま返す
    // console.log(img.isEmpty());
    // if(img.isEmpty()) return str;
    // パラメータを取得
    var scale = 1;
    var trimW = 0, trimH = 0;
    var shiftX = 0, shiftY=0;
    var params = $1.substring($1.indexOf('=')+1).split(',');
    if(params.length < 1) return str;  // パラメータ不正
    scale = parseFloat(params[0]) / 100;
    if(params.length > 1 && params[1].length > 0) trimW = parseFloat(params[1]);  
    if(params.length > 2 && params[2].length > 0) trimH = parseFloat(params[2]);  
    if(params.length > 3 && params[3].length > 0) shiftX = parseFloat(params[3]);  
    if(params.length > 4 && params[4].length > 0) shiftY = parseFloat(params[4]);  
    // console.log(scale + ', ' + trimW + ', ' + trimH + ', ' + shiftX + ', ' + shiftY);
    // サイズを取得
    var size = {width: img.width, height: img.height}; //getSize();
    var printW = size.width * dpi2mm;
    var printH = size.height * dpi2mm;
    // 小数点第三位までにしておく
    printW = Math.round(printW * 1000) / 1000;
    printH = Math.round(printH * 1000) / 1000;
    // 拡大縮小を反映
    var newscale = scale;
    var scaleW = printW * newscale;
    var scaleH = printH * newscale;
    // 小数点第三位までにしておく
    newscale = Math.round(newscale * 1000) / 1000;
    scaleW = Math.round(scaleW * 1000) / 1000;
    scaleH = Math.round(scaleH * 1000) / 1000;
    if(trimW == 0) trimW = scaleW;
    if(trimH == 0) trimH = scaleH;
    // svg生成
    var result = '<svg width="' + trimW + 'mm" height="' + trimH + 'mm" ' 
            + 'viewBox="0 0 ' + trimW + ' ' + trimH + '">\n';
    result += '<image width="' + printW + '" height="' + printH + '" ' 
            + 'xlink:href="' + $1.substring(0, s) + '" '
            + 'transform="translate('+ shiftX + ','+ shiftY + ') '
            + 'scale(' + newscale + ')"> \n';
    result += '</svg> \n';
    // console.log(result);
    return result;
    });
    
    return mdsvgtext;
}
