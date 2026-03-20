const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// ROLE
const role = new URLSearchParams(window.location.search).get('role') || 'beta';
document.getElementById('role').innerText = role;

// CANVAS
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// MAP
const map = [
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
[1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
[1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1],
[1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,1],
[1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = map.length;
const COLS = map[0].length;
const CELL = Math.min(canvas.width / COLS, canvas.height / ROWS);

// STATE
let fox = {x:1,y:13, dx:0, dy:0};
let hunters = [
    {x:9, y:1, type:'chaser'},
    {x:17, y:7, type:'ambush'},
    {x:1, y:7, type:'random'}
];

let score = 0;
let running = true;

// HELPERS
function canMove(x,y){
    return map[y] && map[y][x] === 0;
}

// FOX
function moveFox(dx,dy){
    if(!running) return;

    let nx = fox.x + dx;
    let ny = fox.y + dy;

    if(canMove(nx,ny)){
        fox.x = nx;
        fox.y = ny;
        fox.dx = dx;
        fox.dy = dy;
        score++;
        updateUI();
    }
}

// AI
function moveHunters(){
    hunters.forEach(h => {

        let options = [
            {x:h.x+1,y:h.y},
            {x:h.x-1,y:h.y},
            {x:h.x,y:h.y+1},
            {x:h.x,y:h.y-1}
        ].filter(p => canMove(p.x,p.y));

        if (!options.length) return;

        let target;

        // 🔴 преследователь
        if (h.type === 'chaser') {
            target = {x: fox.x, y: fox.y};
        }

        // 🟡 перехват
        if (h.type === 'ambush') {
            target = {
                x: fox.x + fox.dx * 2,
                y: fox.y + fox.dy * 2
            };
        }

        // 🟢 случайный
        if (h.type === 'random') {
            if (Math.random() < 0.5) {
                let r = options[Math.floor(Math.random()*options.length)];
                h.x = r.x;
                h.y = r.y;
                return;
            }
            target = {x: fox.x, y: fox.y};
        }

        // выбор лучшего шага
        options.sort((a,b)=>
            (Math.abs(a.x-target.x)+Math.abs(a.y-target.y)) -
            (Math.abs(b.x-target.x)+Math.abs(b.y-target.y))
        );

        h.x = options[0].x;
        h.y = options[0].y;
    });
}

// CHECK
function check(){
    for(let h of hunters){
        if(h.x===fox.x && h.y===fox.y){
            end(false);
        }
    }

    if(fox.x===17 & fox.y===1){
        end(true);
    }
}

function end(win){
    running = false;
    document.getElementById('msg').innerText =
        win ? '🎉 ПОБЕДА!' : '💀 ПОЙМАН!';
}

// DRAW
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let y=0;y<ROWS;y++){
        for(let x=0;x<COLS;x++){
            if(map[y][x]===1){
                ctx.fillStyle="#022";
                ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
            }
        }
    }

    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText("🕳️",17*CELL+CELL/2,1*CELL+CELL/2);
    ctx.fillText("🦊",fox.x*CELL+CELL/2,fox.y*CELL+CELL/2);

    hunters.forEach(h=>{
        ctx.fillText("🔴",h.x*CELL+CELL/2,h.y*CELL+CELL/2);
    });
}

// UI
function updateUI(){
    document.getElementById('score').innerText = score;
    document.getElementById('hunters').innerText = hunters.length;
}

// LOOP
let last = 0;
function loop(t){
    if(t - last > 250 && running){
        moveHunters();
        check();
        last = t;
    }

    draw();
    requestAnimationFrame(loop);
}

// BUTTONS
document.getElementById('up').onclick = ()=>moveFox(0,-1);
document.getElementById('down').onclick = ()=>moveFox(0,1);
document.getElementById('left').onclick = ()=>moveFox(-1,0);
document.getElementById('right').onclick = ()=>moveFox(1,0);

// SWIPE
let sx, sy;

canvas.addEventListener('touchstart', e=>{
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
});

canvas.addEventListener('touchend', e=>{
    let dx = e.changedTouches[0].clientX - sx;
    let dy = e.changedTouches[0].clientY - sy;

    if(Math.abs(dx) > Math.abs(dy)){
        dx>0 ? moveFox(1,0) : moveFox(-1,0);
    } else {
        dy>0 ? moveFox(0,1) : moveFox(0,-1);
    }
});

// START
updateUI();
requestAnimationFrame(loop);