const ROWS = 12;
const COLS = 16;

const board = document.getElementById("board");
const w = board.clientWidth / COLS;
const h = board.clientHeight / ROWS;

// 2D array
// data[row][col] has meaning
// 0  -> empty
// 1  -> balloon
// 0xe0~e7 -> laser with direction
// 0xf0~0xf7 -> repeater with direction
const ALT = 0x1;
const LASER = 0xe;
const REPEATER = 0xf;

let map = [];
let game = null;

function getItemAtPosition(x, y) {
    // 获取指定位置上的物体代码（如果超出边界则返回undefined）
    if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) {
        return undefined;
    } else {
        return map[y][x];
    }
}

function getNextPosition(x, y, dir) {
    switch (dir) {
        case 0: return [x + 1, y];
        case 1: return [x + 1, y + 1];
        case 2: return [x, y + 1];
        case 3: return [x - 1, y + 1];
        case 4: return [x - 1, y];
        case 5: return [x - 1, y - 1];
        case 6: return [x, y - 1];
        default: return [x + 1, y - 1];
    }
}


function traceLight() {
    const lights = [];
    let balloon = 0;
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            let v = map[y][x];
            if ((v >> 4) == LASER) lights.push([x, y, v & 0xf]);
            if (v == 1) balloon++;
        }
    }

    const path = [];
    lights.forEach(light => {
        path.push(light);

        let [x, y, dir] = light;
        while (true) {
            // get next
            [x, y] = getNextPosition(x, y, dir);

            // check next is already visited
            let visited = false;
            path.forEach(it => {
                if (it[0] == x && it[1] == y) visited = true;
            });

            // item?
            let item = getItemAtPosition(x, y);
            if (item === undefined) break;
            if ((item >> 4) >= LASER) dir = item & 0xf;

            // add to path
            path.push([x, y, dir]);

            if (item == 1 && !visited) balloon--;
            if ((item >> 4) < LASER) continue;
            if (visited) {
                // remove the last duplicate
                path.length = path.length - 1;
                break;
            }
        }
    });

    // insert balloon count to the first item
    path.splice(0, 0, balloon);
    return path;
}

function update() {
    let ctx = board.getContext("2d");

    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, board.clientWidth, board.clientHeight);

    ctx.font = "bold 24px verdana, sans-serif";
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "blue";
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.fillRect(w * c + 1, h * r + 1, w - 2, h - 2);
            let v = map[r][c];
            if (v != 0) {
                ctx.save();
                ctx.globalAlpha = 1;
                ctx.translate(w * (c + 0.5), h * (r + 0.5));

                let t = 'X';
                if (v == 1) {
                    ctx.fillStyle = "black";
                    t = 'O';
                } else if ((v >> 4) == LASER) {
                    ctx.fillStyle = "red";
                    t = '}';
                    ctx.rotate((v & 0xf) * Math.PI / 4);
                } else if ((v >> 4) == REPEATER) {
                    t = '>';
                    ctx.rotate((v & 0xf) * Math.PI / 4);
                    ctx.fillStyle = "green";
                } else if ((v >> 4) >= ALT) {
                    t = v - (ALT << 4);
                    ctx.fillStyle = "yellow";
                }

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(t, 0, 0);
                ctx.restore();
            }
        }
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'red';
    let path = traceLight();
    let ox = 0;
    let oy = 0;
    path.forEach(it => {
        if (!Array.isArray(it)) return;
        let [x, y, dir] = it;
        let item = map[y][x];
        if ((item >> 4) == LASER) {
            ox = (x + 0.5) * w;
            oy = (y + 0.5) * h;
        }
        ctx.beginPath();
        switch (dir) {
            case 0: x = (x + 1) * w - 1; y = (y + 0.5) * h; break;
            case 1: x = (x + 1) * w - 1; y = (y + 1) * h - 1; break;
            case 2: x = (x + 0.5) * w; y = (y + 1) * h - 1; break;
            case 3: x = x * w + 1; y = (y + 1) * h - 1; break;
            case 4: x = x * w + 1; y = (y + 0.5) * h; break;
            case 5: x = x * w + 1; y = y * h + 1; break;
            case 6: x = (x + 0.5) * w; y = y * h + 1; break;
            default: x = (x + 1) * w - 1; y = y * h + 1; break;
        }
        ctx.moveTo(ox, oy);
        ctx.lineTo(x, y);
        ox = x;
        oy = y;
        ctx.stroke();
    });

    const result = document.getElementById("result");
    if (path[0] === 0) {
        result.style.color = 'green';
        result.innerText = 'You WIN!';
    } else {
        result.style.color = 'red';
        result.innerText = `Remaining: ${path[0]}`;
    }
}

let focusTd = null;
function click(e) {
    e.preventDefault();

    const x = Math.floor((e.clientX - board.offsetLeft) / w);
    const y = Math.floor((e.clientY - board.offsetTop) / h);

    if (e.button > 0) {
        if (focusTd != null) {
            focusTd.innerText = `${x},${y}`;
        }
        return;
    }

    let v = map[y][x];
    if ((v >> 4) == LASER) {
        v = (((v & 0xf) + 2) % 8) + (LASER << 4);
    }
    else if ((v >> 4) == REPEATER) {
        v = (((v & 0xf) + 1) % 8) + (REPEATER << 4);
    } else if ((v >> 4) >= ALT) {

    }
    map[y][x] = v;

    update();
}

const rowHtml = `<td>
    <select>
    <option value="r">Repeater</option>
    <option value="l">Laser</option>
    <option value="b">Balloon</option>
    </select>
</td>
<td width=40 contenteditable="true" onfocus="focusTd=this;">0,0</td>
<td width=40 contenteditable="true" onfocus="focusTd=this;"></td>
<td width=40 contenteditable="true" onfocus="focusTd=this;"></td>
<td width=40 contenteditable="true" onfocus="focusTd=this;"></td>
<td class="button-group">
    <button onclick="rotate(this, true)">&lt;</button>
    <button onclick="rotate(this, false)">&gt;</button>
    <button onclick="deleteRow(this)">X</button>
</td>`;


function addRow() {
    let tbody = document.getElementById("editable-table-body");
    let newRow = document.createElement("tr");
    newRow.innerHTML = rowHtml;
    tbody.appendChild(newRow);
}

function deleteRow(button) {
    let row = button.closest("tr");
    row.remove();
}

function rotate(button, left) {
    let row = button.closest("tr");
    let cells = row.querySelectorAll("td");
    let end = cells[1];
    let last = cells[1];
    for (let i = 2; i < cells.length; i++) {
        end = cells[i];
        if (!cells[i].isContentEditable || cells[i].innerText == '') break;
        last = cells[i];
    }
    if (left)
        row.insertBefore(cells[1], end);
    else
        row.insertBefore(last, cells[1]);
}


function clear() {
    map = [];
    for (let y = 0; y < ROWS; y++) {
        let t = [];
        for (let x = 0; x < COLS; x++) t[x] = 0;
        map[y] = t;
    }
}

const types = [['b', 1], ['l', LASER << 4], ['r', REPEATER << 4]];

function updateMap() {
    clear();
    types.forEach(t => {
        let [type, value] = t;
        for (let k = 0; k < game[type].length; k++) {
            let it = game[type][k];

            map[it[1]][it[0]] = value;
            for (let i = 2; i < it.length; i += 2) {
                map[it[i + 1]][it[i]] = k + (ALT << 4);
            }
        }
    })
    update();
}

function updateGame() {
    game = { 'l': [], 'b': [], 'r': [] };

    let tbody = document.getElementById("editable-table-body");
    tbody.querySelectorAll('tr').forEach(tr => {
        let type = tr.querySelector('select').value;
        let tds = tr.querySelectorAll('td');

        let ts = [];
        for (let i = 1; i < 5; i++) {
            let v = tds[i].innerText;
            if (v == "") continue;
            [x, y] = v.split(',');
            ts.push(x, y);
        }
        game[type].push(ts);
    });
}

function show(path) {
    let info = path[0];
    for (let i = 1; i < path.length; i++) {
        let [x, y] = path[i];
        if ((map[y][x] >> 4) != REPEATER) continue;
        info = `${info} > ${x},${y},${map[y][x] & 7}`;
    }
    console.log(info);
}

function cal(rs) {
    while (true) {
        let path = traceLight();
        if (path[0] == 0) {
            update();
            return true;
        }
        //show(path);

        let i = path.length - 1;
        while (i > 0) {
            let [x, y] = path[i];
            i -= 1;
            if ((map[y][x] >> 4) != REPEATER) continue;
            map[y][x] = (map[y][x] + 1) & 0xff7;
            if ((map[y][x] & 7) != 0) break;
        }
        if (i == 0) break;
    }
    return false;
}

function calGame() {
    let rs = game['r'];
    let rc = [];
    let ri = [];
    for (let i = 0; i < rs.length; i++) {
        rc.push(rs[i].length / 2);
        ri.push(0);
    }
    while (true) {
        //console.log(JSON.stringify(ri));
        for (let i = 0; i < rs.length; i++) {
            for (let j = 0; j < rc[i]; j++) {
                let x = rs[i][j * 2];
                let y = rs[i][j * 2 + 1];
                if (j == ri[i]) {
                    map[y][x] = REPEATER << 4;
                } else {
                    map[y][x] = 0;
                }
            }
        }
        if (cal(rs)) return;

        let i = 0;
        while (i < rs.length) {
            ri[i] = (ri[i] + 1) % rc[i];
            if (ri[i] != 0) break;
            i += 1;
        }
        if (i == rs.length) break;
    }
}

function saveGame() {
    const result = document.getElementById("result");
    const name = document.getElementById("game").value;
    const words = /^[a-z0-9_-]{2,16}$/;
    if (!words.test(name)) {
        result.style.color = 'red';
        result.innerText = 'E: invalid game name';
        return;
    }

    updateGame();

    localStorage.setItem(name, JSON.stringify(game));
    result.style.color = 'green';
    result.innerText = 'Game saved';
}

function loadGame() {
    let tbody = document.getElementById("editable-table-body");
    tbody.innerHTML = '';

    types.forEach(t => {
        let [type, value] = t;
        for (let k = 0; k < game[type].length; k++) {
            let it = game[type][k];

            let tr = document.createElement("tr");
            tr.innerHTML = rowHtml;
            tr = tbody.appendChild(tr);

            let select = tr.querySelector('select');
            select.value = type;

            let tds = tr.querySelectorAll('td');
            for (let i = 0; i < it.length; i += 2) {
                tds[i / 2 + 1].innerText = `${it[i]},${it[i + 1]}`;
            }
        }
    })

    updateMap();
}

function loadGames() {
    localStorage.setItem('default', JSON.stringify({
        "b": [[0, 2]],
        "l": [[1, 1]],
        "r": [[15, 1], [15, 11], [0, 11]],
    }));

    const gameElement = document.getElementById("game");
    const gamesElement = document.getElementById("games");
    gamesElement.innerHTML = '';

    let option = document.createElement('option');
    option.value = option.text = '*Empty';
    gamesElement.appendChild(option);

    Object.entries(localStorage).forEach(it => {
        let [n, v] = it;
        let g = JSON.parse(v);
        if (g === null) return;

        let option = document.createElement('option');
        option.value = option.text = n;
        if (map.length == 0) {
            gameElement.value = n;
            option.selected = true;
            game = g;
            loadGame();
        }
        gamesElement.appendChild(option);
    })
}

function select() {
    let name = document.getElementById("game").value;

    console.log("select", name);

    Object.entries(localStorage).forEach(it => {
        let [n, v] = it;
        if (n != name) return;
        game = JSON.parse(v);
        if (game === null) return;
        loadGame();
        name = '';
    });

    if (name != '') {
        game = { 'l': [], 'b': [], 'r': [] };
        loadGame();
    }
}

board.addEventListener("click", click);
board.addEventListener("contextmenu", click);
window.addEventListener("load", loadGames);
