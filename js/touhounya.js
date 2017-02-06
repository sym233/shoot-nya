// 0
// +-------------------> x
// |
// |  canvas
// |
// |
// |
// |
// |
// v y
//

try{
	let a = 1;
	const b = x => x;
	let c = 2;
	[a, c] = [c, a];
	Array.from({length:7}).fill(1).filter(x=>x);
}
catch(e){
	document.write('你的浏览器不支持es6，请更新或更换浏览器');
	throw '错误:你的浏览器不支持es6，请更新或更换浏览器';
}


// DOM操作
const div_content = document.getElementsByClassName('content')[0];
const canvas_height = Math.round(div_content.offsetHeight * 0.9);
const canvas_width = Math.round(canvas_height );
const canvas_main = document.getElementById('canvas-main');
canvas_main.height = canvas_height;
canvas_main.width = canvas_width;
const fps_dis = document.getElementById('fps-display');

// 原始大小和缩放
const ori_pix = 1400;
const scala = canvas_height / ori_pix;

// 按键操作


const keys_map = {
	// 按键映射
	'ArrowUp': 0,
	'ArrowDown': 1,
	'ArrowLeft': 2,
	'ArrowRight': 3,
	'ShiftLeft': 4,
	'KeyZ': 5,
}
const keys_status = Array.of(6).fill(false);
// 按键状态，false为未按下
// [up, down , left, right, slow, shoot]

function key_down_fn(ev){
	if(ev.code in keys_map){
		keys_status[keys_map[ev.code]] = true;
	}
}
function key_up_fn(ev){
	if(ev.code in keys_map){
		keys_status[keys_map[ev.code]] = false;
	}
}
const body = document.body;
body.addEventListener('keydown', key_down_fn);
body.addEventListener('keyup', key_up_fn);

//


// 初始化canvas
const ctxm = canvas_main.getContext('2d');

// 载入音效
const se_biu = new Audio('./se/se_pldead00.wav');

// 载入图形
const img_judging_radius_1 = new Image();
img_judging_radius_1.src = './img/jiki/judging_radius_1.png';

const img_bullet_round_n_1 = new Image();
img_bullet_round_n_1.src = './img/danmaku/bullet_round_n_1.png';
const img_enm_n_1 = new Image();
img_enm_n_1.src = './img/enemies/e1.png';

const img_jiki_bullet_1 = new Image();
img_jiki_bullet_1.src = './img/jiki/bullet/b1.png';

// 敌机弹幕列表
let danmaku = [];
// 自机弹幕列表
let jiki_dmk = [];

// 敌机列表
// 还未出场的敌机
let enemy_base = [];
// 在场上的敌机
let enemies = [];

// 几个path函数
function straight_down(frame){
	let speed = 10;
	let x = 0;
	let y = frame * speed * scala;
	return [x, y];
}

function straight_up(frame){
	let speed = 20;
	let x = 0;
	let y = -frame * speed * scala;
	return [x, y];
}

function rand_spe_straight_down(speed_y, speed_x){
	return function(frame){
		let x = frame * speed_x * 0.5 * scala;
		let y = frame * speed_y * 0.5 * scala;
		return [x, y];
	}
}

function round_to_cent_1(frame){
	let cx = canvas_width / 2;
	let cy = canvas_height * 0.2;
	let dx = -Math.cos(frame/200) * cx - Math.exp(-frame/100)*cx;
	let dy = -Math.sin(frame/200) * 0.7 * cy;
	return [dx, dy];
}

function ray(start_x, start_y, end_x, end_y, v){
	let l = Math.sqrt((start_x-end_x)*(start_x-end_x) + (start_y-end_y)*(start_y-end_y));
	let t = l / (v * scala);
	return function(frame){
		let x = start_x * (1-frame/t) + end_x * (frame/t);
		let y = start_y * (1-frame/t) + end_y * (frame/t);
		return [x, y];
	}
}

// 子弹 
function Bullet_Round_n(start_x, start_y, start_frame, radius, pathf){
	// 圆形固定弹，初始位置x、y，从第几帧开始出现，半径，路径函数
	this.x = start_x | 0;
	this.y = start_y | 0;
	this.radius = scala * radius;

	this.remove = false;
	// remove为true时该子弹会被移除

	this.get_posi = function(frame){
		// 获取目前的位置
		if(frame < start_frame){
			return false;
		}else{
			let dx, dy;
			[dx, dy] = pathf(frame - start_frame);
			this.x = start_x + dx;
			this.y = start_y + dy;

			if(this.is_out() === false){
				return [this.x, this.y];
			}else{
				this.remove = true;
				return false;
			}
		}
	}
	this.is_out = function(){
		// 子弹是否在屏幕外
		return 0 - this.x > this.radius 
			|| this.x - canvas_width > this.radius 
			|| 0 - this.y > this.radius
			|| this.y - canvas_height > this.radius;
	}
	this.hit = function(jiki_x, jiki_y, jiki_r){
		// 判断是否射中自机，输入自机的x、y、半径
		let dx = Math.abs(jiki_x - this.x);
		let mindcenter = jiki_r + this.radius;
		if(dx < mindcenter){
			// x间距小于半径
			let dy = Math.abs(jiki_y - this.y);
			if(dy < mindcenter){
				// y间距小于半径
				return dx*dx + dy*dy < mindcenter*mindcenter;
			}
		}
		return false;
	}
	this.get_img = function(){
		return {
			'img': img_bullet_round_n_1,
			'cx': this.radius,
			'cy': this.radius,
			'width': this.radius * 2,
			'height': this.radius * 2,
		};
	}
}

function Jiki_Bullet_1(start_x, start_y, start_frame, width, pathf){
	this.x = start_x;
	this.y = start_y;
	this.width = width * scala;
	this.height = width / 5 * 30 * scala;
	this.remove = false;
	this.damage = 2;
	// 击中的伤害
	this.get_posi = function(frame){
		// 获取目前的位置
		if(frame < start_frame){
			return false;
		}else{
			let dx, dy;
			[dx, dy] = pathf(frame - start_frame);
			this.x = start_x + dx;
			this.y = start_y + dy;

			if(this.is_out() === false){
				return [this.x, this.y];
			}else{
				this.remove = true;
				return false;
			}
		}
	}
	this.is_out = function(){
		// 子弹是否在屏幕外 
		return 0 - this.x > this.width 
			|| this.x - canvas_width > this.width 
			|| 0 - this.y > this.height
			|| this.y - canvas_height > this.height;
	}

	this.get_img = function(){
		return {
			'img': img_jiki_bullet_1,
			'cx': this.width / 2,
			'cy': 0,
			'width': this.width,
			'height': this.height,
		};
	}
}

// 敌机
function Enemy_n_1(start_x, start_y, start_frame, pathf){
	this.x = start_x;
	this.y = start_y;
	this.maxhp = 1000;
	this.hp = this.maxhp;
	this.show_hp = true;
	// show_hp为true时，显示血条（圈
	this.size = 80;

	this.remove = false;

	this.start_frame = start_frame;
	this.hurt = function(points){
		this.hp -= points;
		if(this.hp <= 0){
			this.hp = 0;
			this.remove = true;
		}
	}
	this.is_shot = function(){
		// 判断是否被射中
		jiki_dmk.forEach(bullet=>{
			if(Math.abs(bullet.x-this.x) < this.size/2 + bullet.width/2){
				if(Math.abs(bullet.y-this.y) < this.size/2){
					this.hurt(bullet.damage);
					bullet.remove = true;
				}
			}
		});
	}
	this.get_posi = function(frame){
		// 获取目前的位置
		if(frame < start_frame){
			return false;
		}else{
			let dx, dy;
			[dx, dy] = pathf(frame - start_frame);
			this.x = start_x + scala*dx;
			this.y = start_y + scala*dy;
			return [this.x, this.y];
		}
	}
	this.get_img = function(){
		return {
			'img': img_enm_n_1,
			'cx': this.size/2,
			'cy': this.size/2,
			'width': this.size,
			'height': this.size,
		};
	}
	this.shoot_jikinerai = function(target_x, target_y, start_frame, bullet_type){
		// 自機狙い弾
		let bullet = new Bullet_Round_n(0, 0, start_frame, 15, ray(this.x, this.y, jiki.x, jiki.y, 15));
		danmaku.push(bullet);

	}
}

function Jiki(){
	// 自机
	this.x = Math.round(canvas_width / 2);
	this.y = Math.round(canvas_height * 0.9);

	this.judging_radius = 10 * scala;
	this.speed = 15 * scala;
	this.slow_speed = 5 * scala;
	this.size = 40 * scala;

	this.get_img = function(){
		return {
			'img': img_judging_radius_1,
			'cx': this.judging_radius,
			// cx: the x-coordinate of image center
			'cy': this.judging_radius,
			'width': this.judging_radius * 2,
			'height': this.judging_radius * 2,
		};
	}
	this.move_x = function(dir, slow){
		// x轴移动
		if(slow){
			this.x += dir * this.slow_speed;
		}else{
			this.x += dir * this.speed;
		}
		if(this.x > canvas_width){
			this.x = canvas_width;
		}else{
			if(this.x < 0){
				this.x = 0;
			}
		}
	}
	this.move_y = function(dir, slow){
		// y轴移动
		if(slow){
			this.y += dir * this.slow_speed;
		}else{
			this.y += dir * this.speed;
		}
		if(this.y > canvas_height){
			this.y = canvas_height;
		}else{
			if(this.y < 0){
				this.y = 0;
			}
		}
	}

	this.last_shot = 0;
	this.shoot = function(frame){
		if(frame - this.last_shot >= 10){
			this.last_shot = frame;
			jiki_dmk.push(
				new Jiki_Bullet_1(this.x-0.2*this.size, this.y-this.size, frame, 0.4*this.size, straight_up),
				new Jiki_Bullet_1(this.x+0.2*this.size, this.y-this.size, frame, 0.4*this.size, straight_up));
		}
	}
}

let jiki = new Jiki();
let prev_fra_ts = Date.now(); // previous frame time stamp
let frames_count = 0;
let frames_total = 0;
function frame_draw(){
	frames_total++;

	// 判断按键，刷新自机位置
	if(keys_status[0]){
		// up
		jiki.move_y(-1, keys_status[4]);
	}
	if(keys_status[1]){
		// down
		jiki.move_y(1, keys_status[4]);
	}
	if(keys_status[2]){
		// left
		jiki.move_x(-1, keys_status[4]);
	}
	if(keys_status[3]){
		// right
		jiki.move_x(1, keys_status[4]);
	}
	if(keys_status[5]){
		jiki.shoot(frames_total);
	}
	
	ctxm.clearRect(0, 0, canvas_width, canvas_height);

	// 刷新敌机位置
	if(frames_total === 300){
		enemies.push(new Enemy_n_1(canvas_width / 2, canvas_height * 0.2, 300, round_to_cent_1));
	}
	enemies.forEach(enemy=>{
		enemy.get_posi(frames_total);
		const img_enemy = enemy.get_img();
		// 画敌机
		ctxm.drawImage(img_enemy.img, 
				enemy.x - img_enemy.cx, 
				enemy.y - img_enemy.cy, 
				img_enemy.width, 
				img_enemy.height);

		// 敌机定时发射自机狙弹幕
		if(frames_total % 50 < 10){
			enemy.shoot_jikinerai(jiki.x, jiki.y, frames_total, Bullet_Round_n);
			
			// 敌机到自机的辅助线
			// ctxm.beginPath();
			// ctxm.moveTo(enemy.x, enemy.y);
			// ctxm.lineTo(jiki.x, jiki.y);
			// ctxm.stroke();
			// ctxm.closePath();
		}
		// 是否被击中
		enemy.is_shot();

		if(enemy.show_hp){
			// 画hp圈
			ctxm.strokeStyle = 'rgba(230, 72, 72, 0.7';
			ctxm.lineWidth = 15 * scala;
			ctxm.beginPath();
			ctxm.arc(enemy.x, enemy.y, enemy.size*0.7, -Math.PI/2, -2*Math.PI*enemy.hp/enemy.maxhp-Math.PI/2, true);
			ctxm.stroke();
			ctxm.closePath();
		}
	});

	enemies = enemies.filter(enemy=>(enemy.remove===false));

	// 定时创造弹幕 
	if(frames_total-200 >= 0 && frames_total%4 === 0){
		let x = canvas_width * Math.random();
		let y = canvas_height * 0.2;
		let bullet = new Bullet_Round_n(x, y, frames_total, 20, rand_spe_straight_down(5+Math.random()*10, 5-Math.random()*10));
		danmaku.push(bullet);
	}

	danmaku.forEach(bullet=>{
		// 刷新弹幕位置，并绘制弹幕
		bullet.get_posi(frames_total);
		if(bullet.remove === false){
			// old 画弹幕
			// ctxm.beginPath();
			// ctxm.fillStyle = '#ff0';
			// ctxm.strokeStyle = '#000';
			// ctxm.arc(bullet.x, bullet.y, bullet.radius, 0, 2*Math.PI);
			// ctxm.closePath();
			// ctxm.fill();
			// ctxm.stroke();

			// new 画弹幕
			const img_bullet = bullet.get_img();
			ctxm.drawImage(img_bullet.img, 
				bullet.x - img_bullet.cx, 
				bullet.y - img_bullet.cy, 
				img_bullet.width, 
				img_bullet.height);

			// 判断中弹
			if(bullet.hit(jiki.x, jiki.y, jiki.judging_radius)){
				se_biu.currentTime = 0;
				se_biu.play();

				// 击中后删除该弹
				bullet.remove = true;
			}
		}

	});
	danmaku = danmaku.filter(bullet=>(bullet.remove === false));
	// 删除置为null的弹幕

	jiki_dmk.forEach(bullet=>{
		// 同理，刷新自机弹幕位置，并绘制弹幕
		bullet.get_posi(frames_total);
		if(bullet.remove === false){

			// new 画弹幕
			const img_bullet = bullet.get_img();
			ctxm.drawImage(img_bullet.img, 
				bullet.x - img_bullet.cx, 
				bullet.y - img_bullet.cy, 
				img_bullet.width, 
				img_bullet.height);

		}

	});
	jiki_dmk = jiki_dmk.filter(bullet=>(bullet.remove === false));

	// old 画自机
	// ctxm.beginPath();
	// ctxm.fillStyle = '#000';
	// ctxm.strokeStyle = '#EE2';
	// ctxm.arc(jiki.x, jiki.y, 1, 0, 2*Math.PI);
	// ctxm.closePath();
	// ctxm.fill();
	// ctxm.stroke();

	// new 画自机
	const img_jiki = jiki.get_img();
	ctxm.drawImage(img_jiki.img, 
		jiki.x - img_jiki.cx, 
		jiki.y - img_jiki.cy, 
		img_jiki.width, 
		img_jiki.height);
	
	// 算fps
	frames_count++;
	let cur_fra_ts = Date.now(); // current frame time stamp
	let dt = cur_fra_ts - prev_fra_ts;
	if(dt >= 1000){
		// 每秒计算一次
		let fps = 1000 * frames_count / dt;
		fps_dis.innerHTML = fps.toFixed(2);
		prev_fra_ts = cur_fra_ts;
		frames_count = 0;

		// console.log(danmaku);
	}
}

const set_fps = 60;

let main_interval = window.setInterval(frame_draw, 1000 / set_fps);