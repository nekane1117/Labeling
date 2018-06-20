/**
 * JSON用ディープコピーメソッド
 * @param       {Object} json コピー元オブジェクト
 * @return コピー結果
 */
function JsonDeepCopy(json, depth = 0) {
  switch (Object.prototype.toString.call(json)) {
    case "[object Object]":
      return Object.keys(json).reduce((a, c) => (a[c] = JsonDeepCopy(json[c], depth + 1), a), {});
    case "[object Array]":
      return json.map(x => JsonDeepCopy(x, depth + 1));
    default:
      // case "[object Boolean]":
      // case "[object Number]":
      // case "[object String]":
      // case "[object Null]":
      // case "[object Undefined]":
      return json;
  }
}
/**
 * 再帰的キー存在チェック
 * @param       {Object} obj  対象のオブジェクト
 * @param       {String} path 検索したいキーのパス
 * ドット表記法またはブラケット表記法どちらも可だが、ブラケットの場合はキーにダブルクォートをつけないこと
 * {"sample" : {"child" : {"Grandson" : [0,1,2]}}}
 * 上記の場合以下のようなものが使用可能
 * "sample.child[Grandson][0]"
 */
function RecursiveIn(obj, path) { // eslint-disable-line no-unused-vars
  if (!obj) {
    // objが存在していない場合false
    return false;
  }
  // ブランケットをドットに変換して区切る
  let keys = path.replace(/\[([^\]]+)\]/g, ".$1").split(".");
  let key = keys.shift();
  // キーリストの1つ目を取得してなければfalse
  if (key in obj) {
    // 最後まで存在していたらtrue
    if (keys.length === 0) {
      return true;
    } else {
      // 子キーを持っている場合は再起的に潜っていく
      return RecursiveIn(obj[key], keys.join("."));
    }
  } else {
    // 存在しない場合はfalse
    return false;
  }
}
/**
 * 再帰的取得処理
 * 取得した結果をキーとして取得しに行く
 * @param       {Object} obj     対象オブジェクト
 * @param       {String} key     キー
 * @param       {Number} depth   システム用の引数で、呼び出し時は指定しない
 * @constructor
 */
function RecursiveGet(obj, key, depth = 0) {
  if (obj[key]) {
    // キーの値が存在している
    // 新しいキーを取得する
    let newKey = JsonDeepCopy(obj[key]);
    // ディープコピーしてからループしないように使ったキーを削除する
    let newObj = JsonDeepCopy(obj);
    delete newObj[key];
    return RecursiveGet(newObj, newKey, 1);
  } else {
    // キーの値が存在しない
    if (depth === 0) {
      // 初回の場合はそもそも存在しない
      return undefined;
    } else {
      return key;
    }
  }
}
/**
 * ラベリング用差分対象マス
 * @return {[type]} [description]
 */
function getTarget() {
  return [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1]
  ];
}

function testdata(data) {
  let size = 0;
  if (Object.prototype.toString.call(data) == "[object Array]" && data.every(x => Object.prototype.toString.call(x) == "[object Array]") && data.every(y => y.every(x => Object.prototype.toString.call(x) == "[object Number]"))) {
    // 二次元数字のみ配列
    return data;
  } else if (Object.prototype.toString.call(data) == "[object Number]") {
    size = data;
  } else {
    size = 50;
  }
  let test = [];
  for (let i = 0; i < size; i++) {
    test.push((function() {
      let ret = [];
      for (let j = 0; j < size; j++) {
        ret.push(Math.random() <= 0.5 ? 1 : 0);
      }
      return ret;
    })());
  }
  return test;
}
/**
 * ラベリング用に初期化する
 * @param       {Array<Array<Number>>} table2D [description]
 */
function LabelInit(table2D) {
  let cnt = 0;
  return {
    "table2D": table2D.map(row => {
      // 行を跨ぐたびにカウンタをずらす
      cnt++;
      // 行の最初は0
      let flg = 0;
      return row.map(cell => {
        if (cell !== flg) {
          flg = (flg + 1) % 2;
          if (flg === 0) {
            // 立ち下がり判定インクリメント
            cnt++;
          }
        }
        return flg * cnt;
      });
    })
  };
}
/**
 * ラベリング処理
 * @param       {Array} json.table2D ラベリング初期化された２次元配列
 */
async function Labeling(json) {
  // 引数の保持用にDeepCopy
  json = JsonDeepCopy(json);
  // 返却用オブジェクトを作成
  let ret = {};
  // ラベルマップの作成
  let labelMap = {};
  for (let i = 0; i < json.table2D.length; i++) {
    for (let j = 0; j < json.table2D[i].length; j++) {
      getTarget().reduce((a, c) => {
        // ずらしたマスが存在する
        if (json.table2D[i + c[0]] && json.table2D[i + c[0]][j + c[1]]) {
          // ずらした場所と今の場所が違う
          // どちらも0でない
          if (json.table2D[i + c[0]][j + c[1]] !== 0 && json.table2D[i][j] !== 0 && json.table2D[i + c[0]][j + c[1]] !== json.table2D[i][j]) {
            // マップに存在しない
            if (!a[json.table2D[i + c[0]][j + c[1]]]) {
              a[json.table2D[i][j]] = json.table2D[i + c[0]][j + c[1]];
            }
          }
        }
        return a;
      }, labelMap);
    }
  }
  // 返却オブジェクトに格納
  ret.labelMap = labelMap;
  ret.table2D = json.table2D.map(row => row.map(cell => RecursiveGet(labelMap, cell) || cell));
  return ret;
}
/**
 * 表示処理
 * @param  {[type]} json [description]
 * @return {[type]}      [description]
 */
async function generateDisplay(json) {
  // 最大値を探す
  let max = json.table2D.reduce((ans, row) => {
    let rowMax = row.reduce((rowmax, cell) => {
      return rowmax >= cell ? rowmax : cell;
    }, -Infinity);
    return ans >= rowMax ? ans : rowMax;
  }, -Infinity);
  let resultDiv = document.getElementById("result");
  let resTable = document.createElement("table");
  //resTable.styel.tableLayout = "fixed";
  json.table2D.forEach((rowdata) => {
    let tr = document.createElement("tr");
    resTable.appendChild(tr);
    rowdata.forEach((cell) => {
      let td = document.createElement("td");
      td.innerHTML = cell;
      td.classList.add("Labeling_td");
      if (cell !== 0) {
        td.style.backgroundColor = "#" + colorChart(cell / max);
      }
      tr.appendChild(td);
    });
  });
  resultDiv.replaceChild(resTable, resultDiv.childNodes[0]);
  return resTable;
}
/**
 * 独自カラーチャート
 * @param  {Number} normalizeNum 0-1に正規化した数字
 * @return {String}              色文字列0xXXXXXX
 */
function colorChart(normalizeNum) {
  // fact1は倍速で減る
  let fact1 = 255 - Math.round(255 * 2 * normalizeNum);
  fact1 = fact1 < 0 ? 0 : fact1;
  // fact2 は山にする
  let fact2 = 0;
  if (normalizeNum < 0.5) {
    fact2 = Math.round(255 * 2 * normalizeNum);
  } else {
    fact2 = 255 - Math.round(255 * 2 * (normalizeNum - 0.5));
  }
  // fact3は0.5を超えたら倍の正比例になるようにする
  let fact3 = normalizeNum < 0.5 ? 0 : Math.round((255 * 2 * (normalizeNum - 0.5)));
  return paddingNum(fact3, 0, 2, "L", 16) + paddingNum(fact2, 0, 2, "L", 16) + paddingNum(fact1, 0, 2, "L", 16);
}
/**
 * 基数変換とパディング
 * @param  {Number} num        変換したい数字
 * @param  {String} pad        パディングする文字
 * @param  {Number} digit      変換後の桁数
 * @param  {String} [LorR="L"] 右詰か左詰
 * @param  {Number} [base=10]  変換後の基数
 * @return {String}            パディングされた文字列
 */
function paddingNum(num, pad, digit, LorR = "L", base = 10) {
  // 指定の基数で文字列にしたときに指定の桁数より長かった場合、
  // そちらを採用する
  digit = digit < num.toString(base).length ? num.toString(base).length : digit;
  if (LorR === "L") {
    return (pad.toString(10).repeat(digit) + num.toString(base)).slice(-1 * digit);
  } else {
    return (num.toString(base) + pad.toString(10).repeat(digit)).slice(0, digit);
  }
}

function step(json) {
  Labeling(json).then(function(json) {
    setTimeout(function(json) {
      generateDisplay(json);
      if (Object.keys(json.labelMap).length !== 0) {
        console.log("keys length : " + Object.keys(json.labelMap).length); // eslint-disable-line no-console
        console.dir(json.labelMap); // eslint-disable-line no-console
        step(json);
      } else {
        console.log("END"); // eslint-disable-line no-console
      }
    }, 1000, json);
  });
}
