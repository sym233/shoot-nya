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
"use strict";

try{
	// 好像感觉这么try并不管用……
	let a = 1;
	const b = x => x;
	let c = 2;
	[a, c] = [c, a];
	let s = `233${a}`;
	Array.from({length:7}).fill(1).filter(x=>x);
	class A{
		constructor(){
		}
	}
	class B extends A{
		constructor(){
			super();
		}
	}
	a = new A();
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
const miss_dis = document.getElementById('miss-display');
const graze_dis = document.getElementById('graze-display');

const canvas_bg = document.getElementById('canvas-bg');
canvas_bg.width = canvas_width;
canvas_bg.height = canvas_height;
canvas_bg.style.left = `${canvas_main.offsetLeft}px`;
canvas_bg.style.top = `${canvas_main.offsetTop}px`;

const hidden_div = document.getElementById('hidden-div');
const cnvs_jiki_img = document.getElementById('cnvs_jiki_img');

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
	'Escape': 6,
}
const keys_num = 7;
const keys_status = Array.from({length: keys_num}).fill(false);
const keys_count = Array.from({length: keys_num}).fill(0);
const keys_last_fires = Array.from({length: keys_num}).fill(0);
let game_paused = false;
// 按键状态，false为未按下
// [up, down , left, right, slow, shoot, esc]

function key_down_fn(ev){
	if(ev.code in keys_map){
		keys_status[keys_map[ev.code]] = true;
		keys_last_fires[keys_map[ev.code]] = Date.now();
		if(ev.code === 'Escape'){
			game_paused = !game_paused;
		}
	}
}
function key_up_fn(ev){
	if(ev.code in keys_map){
		keys_status[keys_map[ev.code]] = false;
		// keys_count[keys_map[ev.code]]++;
	}
}

const body = document.body;
body.addEventListener('keydown', key_down_fn);
body.addEventListener('keyup', key_up_fn);
//


// 初始化canvas
const ctxm = canvas_main.getContext('2d');
const ctx_jiki = cnvs_jiki_img.getContext('2d');
const ctxbg = canvas_bg.getContext('2d');

const lo = new Aloader();
console.log(lo);
// lo.onchange = function(){
// 	ctxm.clearRect(0, 0, canvas_width, canvas_height);
// 	ctxm.font = '80px sans-serif';
// 	ctxm.fillText(`loading ${this.succ}/${this.tot}...`, 10, 100)
// 	console.log(`loading ${this.succ}/${this.tot}...`);
// };

// 载入音效
// const se_biu = new Audio('./se/se_pldead00.wav');
lo.add('./se/se_pldead00.wav', 'audio', 'se_biu');

// 载入图形
lo.add('./img/jiki/judging_radius_1.png', 'image', 'img_judging_radius_1');
// const img_judging_radius_1 = new Image();
// img_judging_radius_1.src = './img/jiki/judging_radius_1.png';

// const img_bullet_round_n_1 = new Image();
// img_bullet_round_n_1.src = './img/danmaku/bullet_round_n_1.png';
lo.add('./img/danmaku/bullet_round_n_1.png', 'image', 'img_bullet_round_n_1');

// const img_enm_n_1 = new Image();
// img_enm_n_1.src = './img/enemies/e1.png';
lo.add('./img/enemies/e1.png', 'image', 'img_enm_n_1');

// const img_jiki_bullet_1 = new Image();
// img_jiki_bullet_1.src = './img/jiki/bullet/b1.png';
lo.add('./img/jiki/bullet/b1.png', 'image', 'img_jiki_bullet_1')

// const img_jiki_pusheen_1 = new Image();
// img_jiki_pusheen_1.src = './img/jiki/jiki_pusheen1.png';
lo.add('./img/jiki/jiki_pusheen1.png', 'image', 'img_jiki_pusheen_1');

let se_biu;
let img_judging_radius_1;
let img_bullet_round_n_1;
let img_enm_n_1;
let img_jiki_bullet_1;
let img_jiki_pusheen_1;

lo.endadd(()=>{
	console.log('finish');
	se_biu = lo.aud['se_biu'];
	img_judging_radius_1 = lo.img['img_judging_radius_1'];
	img_bullet_round_n_1 = lo.img['img_bullet_round_n_1'];
	img_enm_n_1 = lo.img['img_enm_n_1'];
	img_jiki_bullet_1 = lo.img['img_jiki_bullet_1']
	img_jiki_pusheen_1 = lo.img['img_jiki_pusheen_1'];


});

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

function straight_line(speed_x, speed_y){
	// 给出x、y速度的直线运动
	// 相对坐标
	return function(frame){
		let x = frame * speed_x * scala;
		let y = frame * speed_y * scala;
		return [x, y];
	}
}

function round_to_cent_1(frame){
	// 敌机的轨迹，渐进的椭圆形
	// 相对坐标
	let cx = canvas_width / 2;
	let cy = canvas_height * 0.2;
	let dx = -Math.cos(frame/200) * cx - Math.exp(-frame/100)*cx;
	let dy = -Math.sin(frame/200) * 0.7 * cy;
	return [dx, dy];
}

function ray(start_x, start_y, end_x, end_y, v){
	// 根据起始点和终点确定直线轨迹
	// 绝对坐标
	let l = Math.sqrt((start_x-end_x)*(start_x-end_x) + (start_y-end_y)*(start_y-end_y));
	let t = l / (v * scala);
	return function(frame){
		let x = start_x * (1-frame/t) + end_x * (frame/t);
		let y = start_y * (1-frame/t) + end_y * (frame/t);
		return [x, y];
	}
}

// 子弹
class Bullet{
	constructor(start_x, start_y, start_frame, width, height, pathf, img){
		this.x = this.start_x = start_x;
		this.y = this.start_y = start_y;
		this.start_frame = start_frame;
		this.width = width * scala;
		this.height = height * scala;
		this.pathf = pathf;
		this.img = img;

		this.remove = false;
		// remove为true时该子弹会被移除
		this.grazed = false;
		// 是否被擦弹过
	}
	
	get_img(){
		return {
			'img': this.img,
			'cx': this.width/2,
			'cy': this.height/2,
			'width': this.width,
			'height': this.width,
		};
	}

	is_out(){
		// 子弹是否在屏幕外
		return 0 - this.x > this.width
			|| this.x - canvas_width > this.width 
			|| 0 - this.y > this.height
			|| this.y - canvas_height > this.height;
	}

	get_posi(frame){
		// 获取目前的位置
		if(frame < this.start_frame){
			return false;
		}else{
			let dx, dy;
			[dx, dy] = this.pathf(frame - this.start_frame);
			this.x = this.start_x + dx;
			this.y = this.start_y + dy;

			if(this.is_out() === false){
				return [this.x, this.y];
			}else{
				this.remove = true;
				return false;
			}
		}
	}
}

class Bullet_Round_n extends Bullet{
	// 用class改写
	constructor(start_x, start_y, start_frame, radius, pathf, img){
		// 圆形固定弹，初始位置x、y，从第几帧开始出现，半径，路径函数，贴图
		
		super(start_x, start_y, start_frame, radius*2, radius*2, pathf, img);
		// 从Bullet中继承

		this.radius = scala * radius;

	}

	hit(jiki_x, jiki_y, jiki_r){
		// 判断是否射中自机，输入自机的x、y、半径
		let dx = Math.abs(jiki_x - this.x);
		let dy = Math.abs(jiki_y - this.y);
		let min_d_center = jiki_r + this.radius;

		// if(this.grazed === false && dx*dx + dy*dy < 9*min_d_center*min_d_center){
		// 	// 判断擦弹
		// 	this.grazed = true;
		// 	jiki.grazes++;
		// }
		// if(dx*dx + dy*dy < min_d_center*min_d_center){
		// 	jiki.misses ++;
		// 	// miss数+1
		// 	return true;
		// }else{
		// 	return false;
		// }

		let grazed = !this.grazed && (dx*dx + dy*dy < 9*min_d_center*min_d_center);
		let hit = dx*dx + dy*dy < min_d_center*min_d_center;

		return [grazed, hit];

		// if(dx < min_d_center){
		// 	// x间距小于半径
		// 	let dy = Math.abs(jiki_y - this.y);
		// 	if(dy < min_d_center){
		// 		// y间距小于半径

		// 		jiki.misses ++;
		// 		// miss数+1
		// 		return dx*dx + dy*dy < min_d_center*min_d_center;
		// 	}
		// }
		// return false;
	}
}

class Jiki_Bullet_1 extends Bullet{
	constructor(start_x, start_y, start_frame, width, pathf, img){
		super(start_x, start_y, start_frame, width, width / 5 * 30, pathf, img);

		this.damage = 2;
	}

	get_img(){
		return {
			'img': this.img,
			'cx': this.width / 2,
			'cy': 0,
			'width': this.width,
			'height': this.height,
		};
	}
}

// 敌机
class Enemy{
	constructor(start_x, start_y, start_frame, width, height, maxhp, pathf, img){
		this.x = this.start_x = start_x;
		this.y = this.start_y = start_y;
		this.start_frame = start_frame;
		this.width = width * scala;
		this.height = height * scala;
		this.pathf = pathf;
		this.img = img;

		this.maxhp = this.hp = maxhp
		this.remove = false;
	}

	hurt(points){
		// 受到攻击
		this.hp -= points;
		if(this.hp <= 0){
			this.hp = 0;
			this.remove = true;
		}
	}

	get_posi(frame){
		// 获取目前的位置
		if(frame < this.start_frame){
			return false;
		}else{
			let dx, dy;
			[dx, dy] = this.pathf(frame - this.start_frame);
			this.x = this.start_x + scala * dx;
			this.y = this.start_y + scala * dy;
			return [this.x, this.y];
		}
	}

	get_img(){
		return {
			'img': this.img,
			'cx': this.width/2,
			'cy': this.height/2,
			'width': this.width,
			'height': this.height,
		};
	}
}

class Enemy_n_1 extends Enemy{
	constructor(start_x, start_y, start_frame, pathf){
		super(start_x, start_y, start_frame, 180, 180, 1000, pathf, img_enm_n_1);

		this.show_hp = true;
     	// show_hp为true时，显示血条（圈
	}

	is_shot(){
		// 判断是否被射中
		jiki_dmk.forEach(bullet=>{
			if(Math.abs(bullet.x-this.x) < this.width/2 + bullet.width/2){
				if(Math.abs(bullet.y-this.y) < this.height/2){
					this.hurt(bullet.damage);
					bullet.remove = true;
				}
			}
		});
	}

	shoot(frame){
		if(frame % 50 < 10){
			// 敌机定时发射自机狙弹幕
			this.shoot_jikinerai(jiki.x, jiki.y, frame, Bullet_Round_n);
		}
	}


	shoot_jikinerai(target_x, target_y, start_frame, bullet_type){
		// 自機狙い弾
		let bullet = new Bullet_Round_n(
			0,
			0,
			start_frame,
			15,
			ray(this.x, this.y, jiki.x, jiki.y, 15),
			img_bullet_round_n_1
		);
		danmaku.push(bullet);
	}
}

class Jiki{
	// 自机
	constructor(){
		this.x = Math.round(canvas_width / 2);
		this.y = Math.round(canvas_height * 0.9);

		this.judging_radius = 7 * scala;
		this.speed = 15 * scala;
		this.slow_speed = 5 * scala;

		this.width = 100 * scala;
		this.height = this.width / 124 * 150; 

		this.last_shot = 0;

		this.misses = 0;
		// miss数
		this.grazes = 0;
		// 擦弹数

		// 设置自机图形宽高
		cnvs_jiki_img.width = this.width;
		cnvs_jiki_img.height = this.height;

	}

	get_img(slow){
		// 自机贴图
		ctx_jiki.drawImage(img_jiki_pusheen_1, 0, 0, this.width, this.height);

		if(slow){
			// 绘制判定点
			ctx_jiki.drawImage(img_judging_radius_1,
				this.width/2 - this.judging_radius,
				this.height/2 - this.judging_radius,
				this.judging_radius * 2,
				this.judging_radius * 2
			);
		}else{

		}
		return {
		// cx: the x-coordinate of image center
			'img': cnvs_jiki_img,
			'cx': this.width / 2,
			'cy': this.height / 2,
			'width': this.width,
			'height': this.height,
		};
		
	}

	move_x(dir, slow){
		// x轴移动
		if(slow){
			this.x += dir * this.slow_speed;
		}else{
			this.x += dir * this.speed;
		}
		if(this.x > canvas_width - this.width / 2){
			this.x = canvas_width - this.width / 2;
		}else{
			if(this.x < this.width / 2){
				this.x = this.width / 2;
			}
		}
	}

	move_y(dir, slow){
		// y轴移动
		if(slow){
			this.y += dir * this.slow_speed;
		}else{
			this.y += dir * this.speed;
		}
		if(this.y > canvas_height - this.height / 2){
			this.y = canvas_height - this.height / 2;
		}else{
			if(this.y < this.height / 2){
				this.y = this.height / 2;
			}
		}
	}

	shoot(frame){
		if(frame - this.last_shot >= 10){
			this.last_shot = frame;
			jiki_dmk.push(
				new Jiki_Bullet_1(
					this.x - 0.2 * this.width,
					this.y - this.height / 2,
					frame,
					0.2 * this.width,
					straight_line(0, -20),
					img_jiki_bullet_1
				),
				new Jiki_Bullet_1(
					this.x + 0.2 * this.width,
					this.y - this.height / 2,
					frame,
					0.2 * this.width,
					straight_line(0, -20),
					img_jiki_bullet_1
				)
			);
		}
	}
}

let jiki = new Jiki();
let prev_fra_ts = Date.now(); // previous frame time stamp
let frames_count = 0;
let frames_total = 0;
let pause_layer;

function read_key(){
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
		// shoot
		jiki.shoot(frames_total);
	}
}

function fresh_enm(frame){
	// 刷新敌机位置
	
	enemies.forEach(enemy=>{
		enemy.get_posi(frame);
		const img_enemy = enemy.get_img();
		// 画敌机
		ctxm.drawImage(
			img_enemy.img, 
			enemy.x - img_enemy.cx, 
			enemy.y - img_enemy.cy, 
			img_enemy.width, 
			img_enemy.height
		);

		// 发射弹幕
		enemy.shoot(frame);

		// 是否被击中
		enemy.is_shot();

		if(enemy.show_hp){
			// 画hp圈
			ctxm.strokeStyle = 'rgba(230, 72, 72, 0.6)';
			ctxm.lineWidth = 15 * scala;
			ctxm.beginPath();
			ctxm.arc(enemy.x, enemy.y, enemy.width*0.7, -Math.PI/2, -2*Math.PI*enemy.hp/enemy.maxhp-Math.PI/2, true);
			ctxm.stroke();
			ctxm.closePath();
		}
	});

	enemies = enemies.filter(enemy=>(enemy.remove===false));
}

function fresh_dmk(frame){
	danmaku = danmaku.filter(bullet=>{
		// 将弹幕的foreach遍历和filter合并
		// 刷新弹幕位置，并绘制弹幕
		bullet.get_posi(frame);
		if(bullet.remove === false){

			// new 画弹幕
			const img_bullet = bullet.get_img();
			ctxm.drawImage(
				img_bullet.img, 
				bullet.x - img_bullet.cx, 
				bullet.y - img_bullet.cy, 
				img_bullet.width, 
				img_bullet.height
			);

			// 判断中弹
			// 和擦弹

			let hit;
			let graze;
			[graze, hit] = bullet.hit(jiki.x, jiki.y, jiki.judging_radius);
			if(graze){
				bullet.grazed = true;
				jiki.grazes++;
			}
			if(hit){
				bullet.remove = true;
				jiki.misses++;
			}

			// if(bullet.hit(jiki.x, jiki.y, jiki.judging_radius)){
			// 	se_biu.currentTime = 0;
			// 	// se_biu.play();
			// 	// 好吵啊……不放了……

			// 	// 击中后删除该弹
			// 	bullet.remove = true;
			// }
		}
		return bullet.remove === false;
	});
	// 删除置为null的弹幕

	jiki_dmk = jiki_dmk.filter(bullet=>{
		// 同理，刷新自机弹幕位置，并绘制弹幕
		bullet.get_posi(frame);
		if(bullet.remove === false){

			// new 画弹幕
			const img_bullet = bullet.get_img();
			ctxm.drawImage(
				img_bullet.img, 
				bullet.x - img_bullet.cx, 
				bullet.y - img_bullet.cy, 
				img_bullet.width, 
				img_bullet.height
			);
		}
		return bullet.remove === false;
	});
}

// 是否为暂停的第一帧
let first_pause_frame = true;

const pause_menu = {
	list: [
		[
			'continue',
			'also continue',

		],
	],
	
	pointer: 0,
	pointer_lv: 0,

};

function key_pressed(){
	// 当前正在按下的键中最后按下的，包括，0、1、2、3、5，-1为没有
	// 用 key_prs接收返回值
	// shift 不计入
	let last_fired = 0;
	let dir = -1;
	for(let i = 0; i < 7 ; i++){
		if(i !== 4 && keys_status[i] && keys_last_fires[i] >= last_fired){
			last_fired = keys_last_fires[i];
			dir = i;
		}
		if(i < 4){
			// 方向键不持续触发
			keys_status[i] = false;
		}
	}
	return dir;
}


function stage1(frame){
	if(frame === 300){
		// 创建敌机
		enemies.push(new Enemy_n_1(canvas_width / 2, canvas_height * 0.2, 300, round_to_cent_1));
	}


	// 定时创造弹幕 
	if(frame-200 >= 0 && frame%4 === 0){
		let x = canvas_width * Math.random();
		let y = canvas_height * 0.2;
		let bullet = new Bullet_Round_n(
			x,
			y,
			frames_total,
			20,
			straight_line(2.5 - Math.random() * 5, 2.5 + Math.random() * 5),
			img_bullet_round_n_1
		);
		danmaku.push(bullet);
	}


}

// 游戏的关卡状态，0未未开始
let game_stage = 0;

// 当前正在按下的键中最后按下的，包括，0、1、2、3、5，-1为没有
let key_prs = -1;

function frame_draw(){
	
	if(lo.finished === false){
		// 资源未加载完成
		ctxm.clearRect(0, 0, canvas_width, canvas_height);
		ctxm.font = '80px sans-serif';
		ctxm.fillText(`loading ${lo.succ}/${lo.tot}...`, 10, 100);
		console.log(`loading ${lo.succ}/${lo.tot}...`);
		return;
	}

	if(game_stage === 0){
		// 开始页面
		ctxm.clearRect(0, 0, canvas_width, canvas_height);
		ctxm.font = '50px sans-serif';
		ctxm.fillText('东方喵喵喵（仮', 100, 200);
		ctxm.font = '40px sans-serif';
		ctxm.fillText('press z to start', 110, 400);
		key_prs = key_pressed();
		if(key_prs === 5){
			game_stage++;
		}
	}else{
		// game_stage > 0

		if(game_paused){
			// pause
			if(first_pause_frame){
				

				ctxm.fillStyle = 'rgba(255, 255, 255, 0.4)';
				ctxm.fillRect(0, 0, canvas_width, canvas_height);

				ctxm.font = '100px sans-serif';
				ctxm.fillStyle = 'black';
				ctxm.fillText('pause', 100, 200);

				// ctxm.globalAlpha = 0.4;
				// ctxm.globalAlpha = 1;
				

				pause_layer = new Image();

				// toBlob vs toDataURL 
				// canvas_main.toBlob(blob=>{
				// 	pause_layer.src = URL.createObjectURL(blob);
				// 	pause_layer.onload = ()=>{
				// 		URL.revokeObjectURL(pause_layer.src);
				// 	};
				// });

				pause_layer.src = canvas_main.toDataURL();
				//发现toBlob比toDataURL慢，会有明显的空白帧

				first_pause_frame = false;

				// 初始化暂停菜单的选择
				pause_menu.pointer = 0;
				pause_menu.pointer_lv = 0;
			}else{

				if(pause_layer.complete){
					ctxm.clearRect(0, 0, canvas_width, canvas_height);
					ctxm.drawImage(pause_layer, 0, 0);
				}

				key_prs = key_pressed();

				if(key_prs === 0){
					pause_menu.pointer--;
					if(pause_menu.pointer < 0){
						pause_menu.pointer = 0;
					}
				}

				if(key_prs === 1){
					pause_menu.pointer++;
					if(pause_menu.pointer >= pause_menu.list[pause_menu.pointer_lv].length){
						pause_menu.pointer = pause_menu.list[pause_menu.pointer_lv].length - 1;
					}
				}

				// 绘制暂停菜单
				ctxm.font = '50px sans-serif';
				pause_menu.list[pause_menu.pointer_lv].forEach((item, i)=>{
					const str = `${(i === pause_menu.pointer)? '>> ':'   '}${item}`;
					ctxm.fillText(str, 100, 400 + i * 70);
				});
				
				if(key_prs === 5){
					game_paused = false;
				}

			}
			
		}else{

			if(first_pause_frame === false){
				first_pause_frame = true;
				return;
			}


			frames_total++;
			

			ctxm.clearRect(0, 0, canvas_width, canvas_height);

			read_key();

			fresh_enm(frames_total);

			stage1(frames_total);

			// new 画自机
			const img_jiki = jiki.get_img(keys_status[4]);
			ctxm.drawImage(img_jiki.img, 
				jiki.x - img_jiki.cx, 
				jiki.y - img_jiki.cy, 
				img_jiki.width, 
				img_jiki.height
			);
			miss_dis.innerHTML = jiki.misses;
			graze_dis.innerHTML = jiki.grazes;

			fresh_dmk(frames_total);
		

			// 想添加一个阴影，发现帧率掉一半，改成两帧刷新一次阴影，还是掉
			// 于是不加了。
			// 另外，敌机的“敌”字没有产生阴影，不知道是哪里的问题
			// if(frames_total & 1){
			// 	const game_layer = ctxm.getImageData(0, 0, canvas_width, canvas_height);
			// 	const bg_layer = new ImageData(canvas_width, canvas_height);
			// 	for(let i = 0; i < canvas_width * canvas_height; i++){
			// 		const color_exst = (game_layer.data[i*4] || game_layer.data[i*4+1] || game_layer.data[i*4+2])
			// 			&& game_layer.data[i*4+3] > 178;
			// 		// r g b alpha
			// 		if(color_exst){
			// 			bg_layer.data[i*4] = bg_layer.data[i*4+1] = bg_layer.data[i*4+2] = 200;
			// 			bg_layer.data[i*4+3] = game_layer.data[i*4+3]*0.7;
			// 		}
			// 	}
			// 	ctxbg.putImageData(bg_layer, 0, 0);
			// }
		}
	}

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

	}
	
}
const set_fps = 60;

const main_interval = window.setInterval(frame_draw, 1000 / set_fps);
