const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreNum = document.getElementById('scoreNum');
const levelNum = document.getElementById('levelNum');
const paypalContainer = document.getElementById('paypal-button-container');
const unlockMsg = document.getElementById('unlock-msg');
const adBar = document.getElementById('ad-bar');
const bgMusic = document.getElementById('bgMusic');

let score = Number(localStorage.getItem('score')) || 0;
let level = Number(localStorage.getItem('level')) || 1;
scoreNum.textContent = score;
levelNum.textContent = level;

// Canvas resize
function resizeCanvas(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Images
const playerImg = new Image(); playerImg.src = 'player-lantern.png';
const floatingImg = new Image(); floatingImg.src = 'floating-lantern.png';
const obstacleImg = new Image(); obstacleImg.src = 'obstacle.png';
const bgImg = new Image(); bgImg.src = 'background.png';

// Player
let lantern = {x:canvas.width/2, y:canvas.height-80, width:100, height:100, speed:6};
let moveLeft=false, moveRight=false;
document.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') moveLeft=true; if(e.key==='ArrowRight') moveRight=true; });
document.addEventListener('keyup', e=>{ if(e.key==='ArrowLeft') moveLeft=false; if(e.key==='ArrowRight') moveRight=false; });

// Music
let musicStarted = false;
canvas.addEventListener('pointerdown', ()=>{
  if(!musicStarted){ bgMusic.volume=0.3; bgMusic.play().catch(()=>{}); musicStarted=true; }
});

// Floating Lanterns (3D depth + parallax)
class FloatingLantern{
  constructor(){
    this.x = Math.random()*(canvas.width-60)+30;
    this.y = Math.random()*canvas.height/2;
    this.z = Math.random()*200;
    this.width=60; this.height=60;
    this.connected=false;
    this.floatOffset=Math.random()*Math.PI*2;
    this.particles=[];
  }
  draw(){
    let scale = 1 - this.z/300;
    let floatY = this.y + Math.sin(Date.now()/500 + this.floatOffset)*8;
    ctx.save();
    ctx.translate(this.x, floatY);
    ctx.scale(scale, scale);
    ctx.drawImage(floatingImg, -this.width/2, -this.height/2, this.width, this.height);
    ctx.restore();
    this.updateParticles(floatY, scale);

    if(this.connected){
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,215,0,${0.7*scale})`;
      ctx.lineWidth = 3*scale;
      ctx.shadowColor = 'yellow';
      ctx.shadowBlur = 10;
      ctx.moveTo(lantern.x, lantern.y);
      ctx.lineTo(this.x, floatY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  updateParticles(y, scale){
    if(Math.random()<0.1) this.particles.push({x:this.x, y:y, alpha:1, size:(Math.random()*3+1)*scale});
    this.particles.forEach((p,i)=>{
      ctx.beginPath();
      ctx.fillStyle=`rgba(255,255,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.size,0,Math.PI*2);
      ctx.fill();
      p.y -= 0.5*scale; p.alpha -=0.02;
      if(p.alpha<=0) this.particles.splice(i,1);
    });
  }
}

// Obstacles (3D depth + parallax)
class Obstacle{
  constructor(){
    this.x = Math.random()*(canvas.width-100);
    this.y = -50;
    this.z = Math.random()*200;
    this.width = 80; this.height = 40;
    this.baseSpeed = 1 + level*0.2;
  }
  update(){
    let depthFactor = 1 - this.z/300;
    this.y += this.baseSpeed * depthFactor * (1 + level*0.1);
  }
  draw(){
    let scale = 1 - this.z/300;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.drawImage(obstacleImg, 0, 0, this.width, this.height);
    ctx.restore();
  }
}

// Background parallax layers
class BackgroundLayer{
  constructor(speed){ this.speed=speed; this.y=0; }
  draw(){
    if(bgImg.complete){
      this.y += this.speed;
      if(this.y>canvas.height) this.y=0;
      ctx.drawImage(bgImg,0,this.y-canvas.height,canvas.width,canvas.height);
      ctx.drawImage(bgImg,0,this.y,canvas.width,canvas.height);
    }
  }
}

const bgLayer = new BackgroundLayer(0.2);

// Initialize game
let floatingLanterns=[];
for(let i=0;i<5;i++) floatingLanterns.push(new FloatingLantern());
let obstacles=[];

// Animate
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Background
  bgLayer.draw();

  // Player
  if(moveLeft) lantern.x-=lantern.speed;
  if(moveRight) lantern.x+=lantern.speed;
  lantern.x = Math.min(Math.max(lantern.x, lantern.width/2), canvas.width-lantern.width/2);
  if(playerImg.complete) ctx.drawImage(playerImg, lantern.x-lantern.width/2, lantern.y-lantern.height/2, lantern.width, lantern.height);

  // Floating lanterns
  floatingLanterns.forEach((f,i)=>{
    f.draw();
    let floatY = f.y + Math.sin(Date.now()/500 + f.floatOffset)*8;
    let dx = lantern.x - f.x;
    let dy = lantern.y - floatY;
    if(Math.hypot(dx,dy)<lantern.width/2+f.width/2 && !f.connected){
      score++; f.connected=true;
      scoreNum.textContent=score; localStorage.setItem('score',score);
      if(score%5===0){
        level++; levelNum.textContent=level;
        localStorage.setItem('level',level);
        floatingLanterns.push(new FloatingLantern());
        obstacles.push(new Obstacle());
        // Increase difficulty
        obstacles.forEach(o=>o.baseSpeed += 0.2);
        if(level===5 && localStorage.getItem('adsRemoved')!=='true'){
          paypalContainer.classList.remove('hidden'); setupPayPal();
        }
      }
    }
  });

  // Obstacles
  obstacles.forEach((o,i)=>{
    o.update(); o.draw();
    if(lantern.x+lantern.width/2>o.x && lantern.x-lantern.width/2<o.x+o.width &&
       lantern.y+lantern.height/2>o.y && lantern.y-lantern.height/2<o.y+o.height){
      alert("💥 You hit an obstacle! Game Over.");
      score=0; level=1; localStorage.setItem('score',0); localStorage.setItem('level',1);
      scoreNum.textContent=score; levelNum.textContent=level;
      floatingLanterns=[]; for(let i=0;i<5;i++) floatingLanterns.push(new FloatingLantern());
      obstacles=[];
    }
    if(o.y>canvas.height) obstacles.splice(i,1);
  });

  requestAnimationFrame(animate);
}
animate();

// PayPal
function setupPayPal(){
  if(!window.paypal) return;
  paypal.Buttons({
    style:{layout:'vertical',color:'gold',shape:'rect',label:'paypal'},
    createOrder:(data,actions)=>actions.order.create({purchase_units:[{description:"Unlock Ad-Free Mode", amount:{value:"10.00"}}]}),
    onApprove:(data,actions)=>actions.order.capture().then(()=>{
      localStorage.setItem('adsRemoved','true'); paypalContainer.classList.add('hidden');
      unlockMsg.classList.remove('hidden'); adBar.style.display='none';
    }),
    onError:(err)=>console.error(err)
  }).render('#paypal-button-container');
}
