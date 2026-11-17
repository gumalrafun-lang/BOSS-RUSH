// HUNTER PROTOCOL - clean full game script
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = clamp(player.x, player.radius, canvas.width - player.radius);
    player.y = clamp(player.y, player.radius, canvas.height - player.radius);
}

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

let gameStarted = false;
let gameOver = false;
let clearScreen = false;
let battleState = "START";
let bossNumber = 1;
let bossSpawned = false;
let bossDefeated = false;
let warningUntil = 0;
let lastTime = performance.now();

const enemies = [];
const bullets = [];
const enemyBullets = [];
const grenades = [];
const freezeShots = [];
const particles = [];
const texts = [];

const player = {
    x: canvas.width / 2,
    y: canvas.height - 150,
    radius: 18,
    speed: 4,
    hp: 550,
    maxHp: 550,
    ammo: 25,
    maxAmmo: 25,
    damage: 12,
    fireRate: 135,
    lastShot: 0,
    reloading: false,
    reloadEnd: 0,
    dashDistance: 250,
    dashDuration: 120,
    dashCooldown: 2500,
    lastDash: -2500,
    dashing: false,
    dashStart: 0,
    dashFromX: 0,
    dashFromY: 0,
    dashToX: 0,
    dashToY: 0,
    frozenUntil: 0
};

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let lastGrenade = -999999;
let lastFreeze = -999999;
const grenadeCooldown = 7500;
const freezeCooldown = 6500;

let ultimateDamage = 0;
const ultimateMaxDamage = 800;
let ultimateActive = false;
let ultimateEnd = 0;

const upgradeScreen = document.getElementById("upgradeScreen");
const upgradeButtons = document.querySelectorAll(".upgradeCard");
const skillQ = document.getElementById("skillQ");
const skillE = document.getElementById("skillE");
const skillShift = document.getElementById("skillShift");
const skillF = document.getElementById("skillF");
const skillQTimer = document.getElementById("skillQTimer");
const skillETimer = document.getElementById("skillETimer");
const skillShiftTimer = document.getElementById("skillShiftTimer");
const skillFTimer = document.getElementById("skillFTimer");
const skillFProgress = document.getElementById("skillFProgress");
const ultimateTimer = document.getElementById("ultimateTimer");
const nextBossButton = document.getElementById("nextBossButton");

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }
function addText(x, y, text, color = "white") {
    texts.push({x, y, text, color, life: 700});
}
function burst(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        particles.push({x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 450});
    }
}

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === "Shift") keys.shift = true;

    if (e.key.toLowerCase() === "r") reload();
    if (e.key.toLowerCase() === "q") useGrenade();
    if (e.key.toLowerCase() === "e") useFreeze();
    if (e.key.toLowerCase() === "f") useUltimate();
    if (e.key === "Shift") dash();

    if (!gameStarted && e.key === "Enter") startGame();
});
window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === "Shift") keys.shift = false;
});
canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * canvas.width / r.width;
    mouse.y = (e.clientY - r.top) * canvas.height / r.height;
});
canvas.addEventListener("mousedown", e => {
    if (e.button === 0) {
        mouse.down = true;
        if (!gameStarted) startGame();
    }
});
window.addEventListener("mouseup", e => {
    if (e.button === 0) mouse.down = false;
});

function resetPlayer() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
    player.hp = player.maxHp;
    player.ammo = player.maxAmmo;
    player.reloading = false;
    player.frozenUntil = 0;
    player.lastDash = -player.dashCooldown;
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    gameOver = false;
    clearScreen = false;
    bossNumber = 1;
    battleState = "MINIONS";
    bossSpawned = false;
    bossDefeated = false;
    warningUntil = 0;
    enemies.length = 0;
    bullets.length = 0;
    enemyBullets.length = 0;
    grenades.length = 0;
    freezeShots.length = 0;
    particles.length = 0;
    texts.length = 0;
    resetPlayer();
    spawnBlade(player.x - 100, player.y);
    spawnBlade(player.x + 100, player.y);
    spawnBlade(player.x, player.y - 100);
    hideUpgrade();
    upgradeButtons.forEach(b => { b.disabled = false; b.classList.remove("disabled", "selected"); });
    nextBossButton.disabled = true;
    nextBossButton.classList.add("hidden");
}

function spawnBlade(x, y, boss3 = false) {
    enemies.push({
        type: "BLADE",
        x, y,
        size: 30,
        hp: boss3 ? 50 : 30,
        maxHp: boss3 ? 50 : 30,
        speed: 1.8,
        damage: 15,
        attackRange: 40,
        attackCooldown: 900,
        lastAttack: 0,
        frozenUntil: 0
    });
}

function spawnFreezer(x, y, boss3 = false) {
    enemies.push({
        type: "FREEZER",
        x, y,
        size: 28,
        hp: boss3 ? 30 : 10,
        maxHp: boss3 ? 30 : 10,
        speed: 1.1,
        damage: 0,
        attackCooldown: 2200,
        lastAttack: 0,
        frozenUntil: 0
    });
}

function spawnHunter() {
    enemies.push({
        type: "HUNTER-01",
        x: canvas.width / 2,
        y: 130,
        size: 72,
        hp: 2000,
        maxHp: 2000,
        speed: 1.15,
        damage: 50,
        chargeDamage: 50,
        chargeSpeed: 14,
        chargeDuration: 500,
        chargeCooldown: 3000,
        lastCharge: -3000,
        chargePrepareDuration: 700,
        chargePreparing: false,
        chargeStartTime: 0,
        charging: false,
        chargeHit: false,
        chargeDirectionX: 0,
        chargeDirectionY: 0,
        phaseTriggered: false,
        frozenUntil: 0
    });
}

function spawnSentinel() {
    enemies.push({
        type: "SENTINEL-02",
        x: canvas.width / 2,
        y: 130,
        size: 78,
        hp: 2500,
        maxHp: 2500,
        attackCooldown: 2100,
        lastAttack: -2100,
        phaseTriggered: false,
        frozenUntil: 0
    });
}

function spawnOmega() {
    enemies.push({
        type: "OMEGA",
        x: canvas.width / 2,
        y: 120,
        size: 92,
        hp: 3500,
        maxHp: 3500,
        phase: 1,
        phase2Spawned: false,
        phase3Spawned: false,
        chargePreparing: false,
        chargeStart: 0,
        charging: false,
        chargeHit: false,
        dirX: 0,
        dirY: 0,
        lastCharge: -3000,
        lastBullet: -2000,
        lastBite: 0,
        frozenUntil: 0
    });
}

function reload() {
    if (!gameStarted || gameOver || ultimateActive || player.reloading || player.ammo >= player.maxAmmo) return;
    player.reloading = true;
    player.reloadEnd = performance.now() + 1000;
}

function shoot() {
    if (!gameStarted || gameOver || clearScreen || player.reloading || performance.now() < player.lastShot) return;
    if (!ultimateActive && player.ammo <= 0) {
        reload();
        return;
    }
    const now = performance.now();
    player.lastShot = now + (ultimateActive ? 70 : player.fireRate);
    if (!ultimateActive) player.ammo--;

    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    bullets.push({
        x: player.x + Math.cos(a) * 24,
        y: player.y + Math.sin(a) * 24,
        vx: Math.cos(a) * 12,
        vy: Math.sin(a) * 12,
        damage: player.damage,
        life: 900
    });
}

function dash() {
    if (!gameStarted || gameOver || performance.now() - player.lastDash < player.dashCooldown || player.dashing) return;
    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    player.lastDash = performance.now();
    player.dashing = true;
    player.dashStart = performance.now();
    player.dashFromX = player.x;
    player.dashFromY = player.y;
    player.dashToX = clamp(player.x + Math.cos(a) * player.dashDistance, player.radius, canvas.width - player.radius);
    player.dashToY = clamp(player.y + Math.sin(a) * player.dashDistance, player.radius, canvas.height - player.radius);
}

function useGrenade() {
    if (!gameStarted || gameOver || performance.now() - lastGrenade < grenadeCooldown) return;
    lastGrenade = performance.now();
    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const tx = player.x + Math.cos(a) * 210;
    const ty = player.y + Math.sin(a) * 210;
    for (let i = -1; i <= 1; i++) {
        grenades.push({
            x: player.x,
            y: player.y,
            tx: tx + Math.cos(a + Math.PI/2) * i * 28,
            ty: ty + Math.sin(a + Math.PI/2) * i * 28,
            start: performance.now(),
            end: performance.now() + 450,
            damage: 35,
            hit: new Set()
        });
    }
}

function useFreeze() {
    if (!gameStarted || gameOver || performance.now() - lastFreeze < freezeCooldown) return;
    lastFreeze = performance.now();
    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    freezeShots.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 10,
        vy: Math.sin(a) * 10,
        life: 1000
    });
}

function useUltimate() {
    if (!gameStarted || gameOver || ultimateActive || ultimateDamage < ultimateMaxDamage) return;
    ultimateActive = true;
    ultimateEnd = performance.now() + 10000;
    ultimateDamage = 0;
}

function damageEnemy(enemy, amount) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.hp -= amount;
    ultimateDamage = Math.min(ultimateMaxDamage, ultimateDamage + amount);
    addText(enemy.x, enemy.y - enemy.size - 8, `-${amount}`, "yellow");
    burst(enemy.x, enemy.y, 3);
    if (enemy.hp <= 0) {
        burst(enemy.x, enemy.y, 16);
    }
}

function updatePlayer(now, dt) {
    if (player.reloading && now >= player.reloadEnd) {
        player.reloading = false;
        player.ammo = player.maxAmmo;
    }
    if (ultimateActive && now >= ultimateEnd) ultimateActive = false;

    if (player.dashing) {
        const p = clamp((now - player.dashStart) / player.dashDuration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        player.x = player.dashFromX + (player.dashToX - player.dashFromX) * eased;
        player.y = player.dashFromY + (player.dashToY - player.dashFromY) * eased;
        if (p >= 1) player.dashing = false;
        return;
    }

    if (now < player.frozenUntil) return;

    let dx = 0, dy = 0;
    if (keys.w) dy--;
    if (keys.s) dy++;
    if (keys.a) dx--;
    if (keys.d) dx++;
    if (dx || dy) {
        const l = Math.hypot(dx, dy);
        dx /= l; dy /= l;
        player.x += dx * player.speed * dt * 60;
        player.y += dy * player.speed * dt * 60;
    }
    player.x = clamp(player.x, player.radius, canvas.width - player.radius);
    player.y = clamp(player.y, player.radius, canvas.height - player.radius);

    if (mouse.down) shoot();
}

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt * 60;
        b.y += b.vy * dt * 60;
        b.life -= dt * 1000;
        let hit = false;
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            if (dist(b.x,b.y,e.x,e.y) < e.size/2 + 5) {
                damageEnemy(e, b.damage);
                hit = true;
                break;
            }
        }
        if (hit || b.life <= 0 || b.x < -20 || b.x > canvas.width+20 || b.y < -20 || b.y > canvas.height+20) bullets.splice(i,1);
    }
}

function updateGrenades(now) {
    for (let i = grenades.length - 1; i >= 0; i--) {
        const g = grenades[i];
        const p = clamp((now - g.start) / (g.end - g.start), 0, 1);
        g.x += (g.tx - g.x) * p;
        g.y += (g.ty - g.y) * p;
        for (const e of enemies) {
            if (e.hp <= 0 || g.hit.has(e)) continue;
            if (dist(g.x,g.y,e.x,e.y) < e.size/2 + 16) {
                damageEnemy(e, g.damage);
                g.hit.add(e);
            }
        }
        if (p >= 1) {
            for (const e of enemies) {
                if (e.hp > 0 && dist(g.tx,g.ty,e.x,e.y) < 75 && !g.hit.has(e)) {
                    damageEnemy(e, g.damage);
                }
            }
            burst(g.tx,g.ty,10);
            grenades.splice(i,1);
        }
    }
}

function updateFreezeShots(dt) {
    for (let i = freezeShots.length - 1; i >= 0; i--) {
        const s = freezeShots[i];
        s.x += s.vx * dt * 60;
        s.y += s.vy * dt * 60;
        s.life -= dt * 1000;
        let hit = false;
        for (const e of enemies) {
            if (e.hp <= 0) continue;
            if (dist(s.x,s.y,e.x,e.y) < e.size/2 + 7) {
                e.frozenUntil = performance.now() + 4000;
                addText(e.x,e.y-e.size,"FROZEN","cyan");
                hit = true;
                break;
            }
        }
        if (hit || s.life <= 0) freezeShots.splice(i,1);
    }
}

function fireSentinelPattern(enemy) {
    const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const count = 7;
    for (let i=0;i<count;i++) {
        const a = base + (i - (count-1)/2) * 0.22;
        enemyBullets.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a)*3.2, vy: Math.sin(a)*3.2,
            damage: 50, life: 2800
        });
    }
}

function fireOmegaBullets(enemy) {
    const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    for (let i=0;i<8;i++) {
        const a = base + i * Math.PI/4;
        enemyBullets.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a)*3.0, vy: Math.sin(a)*3.0,
            damage: 50, life: 3000
        });
    }
}

function updateEnemyBullets(dt) {
    const now = performance.now();
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx * dt * 60;
        b.y += b.vy * dt * 60;
        b.life -= dt * 1000;

        if (dist(b.x, b.y, player.x, player.y) < player.radius + 8 && !player.dashing) {
            if (b.freeze) {
                player.frozenUntil = now + 2000;
                addText(player.x, player.y - 30, "FROZEN", "cyan");
            } else {
                player.hp -= b.damage;
            }
            enemyBullets.splice(i, 1);
            continue;
        }

        if (b.life <= 0 || b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
            enemyBullets.splice(i, 1);
        }
    }
}

function updateBlade(e, now, dt) {
    if (now < e.frozenUntil) return;
    const a = Math.atan2(player.y-e.y,player.x-e.x);
    const d = dist(e.x,e.y,player.x,player.y);
    if (d > e.attackRange) {
        e.x += Math.cos(a)*e.speed*dt*60;
        e.y += Math.sin(a)*e.speed*dt*60;
    } else if (now-e.lastAttack >= e.attackCooldown) {
        if (now >= player.frozenUntil) player.hp -= e.damage;
        e.lastAttack = now;
    }
}

function updateHunter(e, now, dt) {
    if (now < e.frozenUntil) return;
    if (e.chargePreparing) {
        if (now-e.chargeStartTime >= e.chargePrepareDuration) {
            e.chargePreparing = false;
            e.charging = true;
            e.chargeStartTime = now;
            e.chargeHit = false;
        }
        return;
    }
    if (e.charging) {
        e.x += e.chargeDirectionX * e.chargeSpeed * dt * 60;
        e.y += e.chargeDirectionY * e.chargeSpeed * dt * 60;
        if (!e.chargeHit && dist(e.x,e.y,player.x,player.y) < e.size/2+player.radius) {
            if (now >= player.frozenUntil) player.hp -= e.chargeDamage;
            e.chargeHit = true;
        }
        if (now-e.chargeStartTime >= e.chargeDuration) {
            e.charging = false;
            e.lastCharge = now;
        }
        return;
    }
    const d = dist(e.x,e.y,player.x,player.y);
    const a = Math.atan2(player.y-e.y,player.x-e.x);
    if (d > 170) {
        e.x += Math.cos(a)*e.speed*dt*60;
        e.y += Math.sin(a)*e.speed*dt*60;
    }
    if (now-e.lastCharge >= e.chargeCooldown) {
        e.chargeDirectionX = Math.cos(a);
        e.chargeDirectionY = Math.sin(a);
        e.chargePreparing = true;
        e.chargeStartTime = now;
    }
}

function updateSentinel(e, now) {
    if (now < e.frozenUntil) return;
    if (now-e.lastAttack >= e.attackCooldown) {
        fireSentinelPattern(e);
        e.lastAttack = now;
    }
}

function updateOmega(e, now, dt) {
    if (now < e.frozenUntil) return;

    const ratio = e.hp/e.maxHp;
    if (ratio <= 0.30 && e.phase < 3) {
        e.phase = 3;
        if (!e.phase3Spawned) {
            e.phase3Spawned = true;
            spawnBlade(e.x-110,e.y+80,true);
            spawnBlade(e.x+110,e.y+80,true);
            spawnBlade(e.x,e.y+130,true);
            spawnFreezer(e.x-150,e.y+130,true);
            spawnFreezer(e.x+150,e.y+130,true);
            addText(e.x,e.y-120,"PHASE 3","red");
        }
    } else if (ratio <= 0.70 && e.phase < 2) {
        e.phase = 2;
        if (!e.phase2Spawned) {
            e.phase2Spawned = true;
            spawnFreezer(e.x-100,e.y+100,true);
            spawnFreezer(e.x+100,e.y+100,true);
            spawnFreezer(e.x,e.y+150,true);
            addText(e.x,e.y-120,"PHASE 2","cyan");
        }
    }

    if (e.phase === 1 || e.phase === 3) {
        updateHunterLike(e,now,dt);
        if (now-e.lastBullet >= 2300) {
            fireOmegaBullets(e);
            e.lastBullet = now;
        }
    }
    if (e.phase >= 2) {
        if (now-e.lastBite >= 1600 && dist(e.x,e.y,player.x,player.y) < 105) {
            if (now >= player.frozenUntil) {
                player.hp -= 35;
                e.hp = Math.min(e.maxHp,e.hp+30);
                addText(player.x,player.y-30,"BITE -35","red");
                addText(e.x,e.y-60,"+30 HP","lime");
            }
            e.lastBite = now;
        }
    }
}

function updateHunterLike(e, now, dt) {
    if (e.chargePreparing) {
        if (now-e.chargeStart >= 650) {
            e.chargePreparing = false;
            e.charging = true;
            e.chargeStart = now;
            e.chargeHit = false;
        }
        return;
    }
    if (e.charging) {
        e.x += e.dirX*13*dt*60;
        e.y += e.dirY*13*dt*60;
        if (!e.chargeHit && dist(e.x,e.y,player.x,player.y) < e.size/2+player.radius) {
            if (now >= player.frozenUntil) player.hp -= 50;
            e.chargeHit = true;
        }
        if (now-e.chargeStart >= 500) {
            e.charging=false;
            e.lastCharge=now;
        }
        return;
    }
    const a = Math.atan2(player.y-e.y,player.x-e.x);
    const d = dist(e.x,e.y,player.x,player.y);
    if (d > 190) {
        e.x += Math.cos(a)*0.9*dt*60;
        e.y += Math.sin(a)*0.9*dt*60;
    }
    if (now-e.lastCharge >= 3000) {
        e.dirX=Math.cos(a); e.dirY=Math.sin(a);
        e.chargePreparing=true; e.chargeStart=now;
    }
}

function updateEnemies(now,dt) {
    for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (e.type === "BLADE") updateBlade(e,now,dt);
        else if (e.type === "FREEZER") updateFreezer(e,now,dt);
        else if (e.type === "HUNTER-01") updateHunter(e,now,dt);
        else if (e.type === "SENTINEL-02") updateSentinel(e,now);
        else if (e.type === "OMEGA") updateOmega(e,now,dt);
    }

    for (let i=enemies.length-1;i>=0;i--) {
        if (enemies[i].hp <= 0) enemies.splice(i,1);
    }
}

function updateFreezer(e,now,dt) {
    if (now < e.frozenUntil) return;
    const d=dist(e.x,e.y,player.x,player.y);
    const a=Math.atan2(player.y-e.y,player.x-e.x);
    if (d>260) {
        e.x += Math.cos(a)*e.speed*dt*60;
        e.y += Math.sin(a)*e.speed*dt*60;
    } else if (d<180) {
        e.x -= Math.cos(a)*e.speed*dt*60;
        e.y -= Math.sin(a)*e.speed*dt*60;
    }
    if (now-e.lastAttack >= e.attackCooldown && d<650) {
        enemyBullets.push({
            x:e.x,y:e.y,vx:Math.cos(a)*3.8,vy:Math.sin(a)*3.8,
            damage:0,life:2200,freeze:true
        });
        e.lastAttack=now;
    }
}

function handleSpecialEnemyBullets() {
    // FREEZER 탄의 빙결 처리는 updateEnemyBullets()에서 직접 처리한다.
}

function updateBossFlow(now) {
    if (battleState === "MINIONS" && enemies.length === 0 && !bossSpawned) {
        battleState = "WARNING";
        warningUntil = now + 1200;
    }
    if (battleState === "WARNING" && now >= warningUntil) {
        bossSpawned = true;
        if (bossNumber===1) spawnHunter();
        else if (bossNumber===2) spawnSentinel();
        else spawnOmega();
        battleState = "BOSS";
    }

    const boss = enemies.find(e => ["HUNTER-01","SENTINEL-02","OMEGA"].includes(e.type));
    if (battleState === "BOSS" && boss) {
        if (boss.type==="HUNTER-01" && boss.hp <= boss.maxHp*0.5 && !boss.phaseTriggered) {
            boss.phaseTriggered=true;
            spawnBlade(boss.x-70,boss.y+80);
            spawnBlade(boss.x+70,boss.y+80);
            spawnBlade(boss.x,boss.y+130);
        }
        if (boss.type==="SENTINEL-02" && boss.hp <= boss.maxHp*0.5 && !boss.phaseTriggered) {
            boss.phaseTriggered=true;
            spawnFreezer(boss.x-90,boss.y+100);
            spawnFreezer(boss.x+90,boss.y+100);
            spawnFreezer(boss.x,boss.y+140);
        }
    }

    if (battleState==="BOSS" && !boss && enemies.length===0) {
        if (bossNumber < 3) {
            battleState="UPGRADE";
            showUpgrade();
        } else {
            battleState="CLEAR";
            clearScreen=true;
            hideUpgrade();
        }
    }
}

function applyUpgrade(type) {
    if (battleState !== "UPGRADE") return;

    const button = Array.from(upgradeButtons).find(b => b.dataset.upgrade === type);
    if (!button || button.disabled) return;

    upgradeButtons.forEach(b => {
        b.classList.remove("selected");
        b.classList.add("disabled");
        b.disabled = true;
    });
    button.classList.remove("disabled");
    button.classList.add("selected");

    if (type === "damage") {
        player.damage += 5;
    } else if (type === "hp") {
        player.maxHp += 100;
        player.hp = player.maxHp;
    } else if (type === "fireRate") {
        player.fireRate = Math.max(50, player.fireRate - 20);
    }

    addText(player.x, player.y - 50, "UPGRADE!", "lime");
    nextBossButton.classList.remove("hidden");
    nextBossButton.disabled = false;
}

upgradeButtons.forEach(btn => {
    btn.addEventListener("click", () => applyUpgrade(btn.dataset.upgrade));
});

nextBossButton.addEventListener("click", () => {
    if (battleState !== "UPGRADE" || nextBossButton.disabled) return;

    bossNumber++;
    enemies.length = 0;
    enemyBullets.length = 0;
    bullets.length = 0;
    grenades.length = 0;
    freezeShots.length = 0;
    bossSpawned = false;
    bossDefeated = false;
    warningUntil = performance.now() + 1200;
    battleState = "WARNING";
    hideUpgrade();
});

function showUpgrade() {
    upgradeScreen.classList.remove("hidden");
    upgradeButtons.forEach(b => {
        b.disabled = false;
        b.classList.remove("disabled", "selected");
    });
    nextBossButton.disabled = true;
    nextBossButton.classList.add("hidden");
}

function hideUpgrade() {
    upgradeScreen.classList.add("hidden");
}

function updateSkillUI(now) {
    if (!skillQ || !skillE || !skillShift || !skillF) return;

    const qRemain = Math.max(0, grenadeCooldown - (now - lastGrenade));
    const eRemain = Math.max(0, freezeCooldown - (now - lastFreeze));
    const dashRemain = Math.max(0, player.dashCooldown - (now - player.lastDash));

    skillQTimer.textContent = qRemain > 0 ? (qRemain / 1000).toFixed(1) + "s" : "READY";
    skillETimer.textContent = eRemain > 0 ? (eRemain / 1000).toFixed(1) + "s" : "READY";
    skillShiftTimer.textContent = dashRemain > 0 ? (dashRemain / 1000).toFixed(1) + "s" : "READY";

    skillQ.classList.toggle("ready", qRemain <= 0);
    skillE.classList.toggle("ready", eRemain <= 0);
    skillShift.classList.toggle("ready", dashRemain <= 0);

    const charge = Math.min(1, ultimateDamage / ultimateMaxDamage);
    skillFProgress.style.width = `${charge * 100}%`;

    if (ultimateActive) {
        skillFTimer.textContent = `${Math.max(0, (ultimateEnd - now) / 1000).toFixed(1)}s`;
        skillF.classList.add("ready");
        ultimateTimer.textContent = `OVERDRIVE ${Math.max(0, (ultimateEnd - now) / 1000).toFixed(1)}s`;
    } else {
        skillFTimer.textContent = `${Math.floor(ultimateDamage)}/${ultimateMaxDamage}`;
        skillF.classList.toggle("ready", ultimateDamage >= ultimateMaxDamage);
        ultimateTimer.textContent = ultimateDamage >= ultimateMaxDamage ? "OVERDRIVE READY" : "";
    }
}

function drawBackground() {
    ctx.fillStyle="#0b1118";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="rgba(120,170,190,0.12)";
    for(let x=0;x<canvas.width;x+=120){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
    for(let y=0;y<canvas.height;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
    ctx.strokeStyle="rgba(0,220,255,0.16)";
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,240,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,170,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=1;
}

function drawPlayer() {
    const a=Math.atan2(mouse.y-player.y,mouse.x-player.x);
    ctx.save();
    ctx.translate(player.x,player.y);
    ctx.rotate(a);
    ctx.fillStyle=nowFrozen()?"#55ddff":"#e9eef5";
    ctx.beginPath();ctx.arc(0,0,player.radius,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#303943";
    ctx.fillRect(5,-5,30,10);
    ctx.fillStyle="#111";
    ctx.fillRect(13,-3,24,6);
    ctx.restore();
}

function nowFrozen(){ return performance.now()<player.frozenUntil; }

function drawEnemies() {
    for(const e of enemies){
        if(e.hp<=0) continue;
        ctx.save();
        ctx.translate(e.x,e.y);
        const frozen = performance.now() < e.frozenUntil;
        if(frozen) ctx.globalAlpha=0.78;
        if(e.type==="BLADE"){
            ctx.fillStyle="#d33";ctx.beginPath();ctx.arc(0,0,e.size/2,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-18,-18);ctx.lineTo(18,18);ctx.stroke();
        } else if(e.type==="FREEZER"){
            ctx.fillStyle="#4bd7ff";ctx.beginPath();ctx.arc(0,0,e.size/2,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle="#dfffff";ctx.strokeRect(-12,-12,24,24);
        } else if(e.type==="HUNTER-01"){
            ctx.fillStyle="#f04";ctx.fillRect(-e.size/2,-e.size/2,e.size,e.size);
            ctx.strokeStyle="#ff9";ctx.lineWidth=3;ctx.strokeRect(-e.size/2,-e.size/2,e.size,e.size);
            if (e.chargePreparing) {
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = "#ff4455";
                ctx.lineWidth = 8;
                ctx.setLineDash([18, 14]);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(e.chargeDirectionX * 320, e.chargeDirectionY * 320);
                ctx.stroke();
                ctx.restore();
            }
        } else if(e.type==="SENTINEL-02"){
            ctx.fillStyle="#8a4dff";ctx.beginPath();ctx.arc(0,0,e.size/2,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle="#d9c5ff";ctx.lineWidth=4;ctx.stroke();
        } else if(e.type==="OMEGA"){
            ctx.fillStyle="#ff6b00";ctx.beginPath();ctx.arc(0,0,e.size/2,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle="#fff0a0";ctx.lineWidth=5;ctx.stroke();
        }
        if (frozen) {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = "rgba(70,220,255,0.45)";
            ctx.beginPath();
            ctx.arc(0,0,e.size*0.62,0,Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = "#8ff3ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0,0,e.size*0.72,0,Math.PI*2);
            ctx.stroke();
            for (let k=0;k<6;k++) {
                const a = k * Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a)*e.size*0.72, Math.sin(a)*e.size*0.72);
                ctx.lineTo(Math.cos(a)*e.size*0.95, Math.sin(a)*e.size*0.95);
                ctx.stroke();
            }
        }
        ctx.restore();

        const w=Math.max(50,e.size*1.5);
        ctx.fillStyle="#300";ctx.fillRect(e.x-w/2,e.y-e.size/2-14,w,6);
        ctx.fillStyle="#4f4";ctx.fillRect(e.x-w/2,e.y-e.size/2-14,w*Math.max(0,e.hp/e.maxHp),6);
    }
}

function drawProjectiles() {
    ctx.fillStyle="#ffe66d";
    for(const b of bullets){ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#ff8";
    for(const b of enemyBullets){
        ctx.fillStyle=b.freeze?"#55ddff":"#ff6666";
        ctx.beginPath();ctx.arc(b.x,b.y,6,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="#8ff";
    for(const s of freezeShots){ctx.beginPath();ctx.arc(s.x,s.y,7,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#ffb84d";
    for(const g of grenades){ctx.beginPath();ctx.arc(g.x,g.y,8,0,Math.PI*2);ctx.fill();}
}

function drawUI(now) {
    ctx.fillStyle="white";
    ctx.font="16px Arial";
    ctx.fillText(`HP ${Math.ceil(player.hp)}/${player.maxHp}`,20,28);
    ctx.fillText(ultimateActive?"AMMO ∞":`AMMO ${player.ammo}/${player.maxAmmo}`,20,52);
    if(player.reloading) ctx.fillText("RELOADING...",20,76);

    if(battleState==="WARNING"){
        ctx.fillStyle="#ff5555";
        ctx.font="bold 30px Arial";
        ctx.textAlign="center";
        ctx.fillText("⚠ BOSS INCOMING ⚠",canvas.width/2,55);
        ctx.textAlign="left";
    }

    const boss=enemies.find(e=>["HUNTER-01","SENTINEL-02","OMEGA"].includes(e.type));
    if(boss){
        ctx.textAlign="center";
        ctx.fillStyle="white";
        ctx.font="bold 22px Arial";
        ctx.fillText(boss.type,canvas.width/2,90);
        ctx.fillStyle="#300";ctx.fillRect(canvas.width/2-300,100,600,16);
        ctx.fillStyle="#f33";ctx.fillRect(canvas.width/2-300,100,600*Math.max(0,boss.hp/boss.maxHp),16);
        ctx.textAlign="left";
    }
}

function drawStartScreen(){
    drawBackground();
    ctx.fillStyle="white";
    ctx.textAlign="center";
    ctx.font="bold 58px Arial";
    ctx.fillText("HUNTER PROTOCOL",canvas.width/2,250);
    ctx.font="bold 30px Arial";
    ctx.fillText("BOSS RUSH",canvas.width/2,300);
    ctx.font="18px Arial";
    ctx.fillText("WASD MOVE  |  MOUSE AIM  |  LEFT CLICK FIRE",canvas.width/2,350);
    ctx.fillText("Q GRENADE  |  E FREEZE  |  SHIFT DASH  |  F OVERDRIVE",canvas.width/2,382);
    ctx.fillText("CLICK TO START",canvas.width/2,450);
    ctx.textAlign="left";
}

function drawClear(){
    drawBackground();
    ctx.textAlign="center";
    ctx.fillStyle="#fff";
    ctx.font="bold 72px Arial";
    ctx.fillText("MISSION CLEAR",canvas.width/2,300);
    ctx.font="28px Arial";
    ctx.fillText("OMEGA DEFEATED",canvas.width/2,350);
    ctx.font="18px Arial";
    ctx.fillText("HUNTER PROTOCOL COMPLETE",canvas.width/2,395);
    ctx.textAlign="left";
}

function updateEffects(dt){
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.life-=dt*1000;
        if(p.life<=0) particles.splice(i,1);
    }
    for(let i=texts.length-1;i>=0;i--){
        const t=texts[i];t.y-=dt*20;t.life-=dt*1000;
        if(t.life<=0) texts.splice(i,1);
    }
}
function drawEffects(){
    for(const p of particles){ctx.fillStyle="#fff";ctx.fillRect(p.x,p.y,3,3);}
    for(const t of texts){ctx.globalAlpha=Math.max(0,t.life/700);ctx.fillStyle=t.color;ctx.font="bold 14px Arial";ctx.fillText(t.text,t.x,t.y);ctx.globalAlpha=1;}
}

function gameLoop(now){
    const dt=Math.min(0.033,(now-lastTime)/1000);
    lastTime=now;

    if(!gameStarted){
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }
    if(clearScreen){
        drawClear();
        requestAnimationFrame(gameLoop);
        return;
    }

    updatePlayer(now,dt);
    updateBullets(dt);
    updateGrenades(now);
    updateFreezeShots(dt);
    updateEnemies(now,dt);
    updateEnemyBullets(dt);
    handleSpecialEnemyBullets();
    updateBossFlow(now);
    updateEffects(dt);

    if(player.hp<=0){
        player.hp=0;
        gameOver=true;
    }

    drawBackground();
    drawProjectiles();
    drawEnemies();
    drawPlayer();
    drawEffects();
    drawUI(now);
    updateSkillUI(now);

    if(gameOver){
        ctx.fillStyle="rgba(0,0,0,0.78)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.textAlign="center";
        ctx.fillStyle="#f44";
        ctx.font="bold 64px Arial";
        ctx.fillText("GAME OVER",canvas.width/2,330);
        ctx.fillStyle="white";
        ctx.font="20px Arial";
        ctx.fillText("Refresh to restart",canvas.width/2,375);
        ctx.textAlign="left";
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
