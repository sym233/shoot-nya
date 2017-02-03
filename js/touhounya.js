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


const keys_status = {
	'ArrowUp': false,
	'ArrowDown': false,
	'ArrowLeft': false,
	'ArrowRight': false,
	'Shift': false,
}
function key_down_fn(ev){
	if(ev.key in keys_status){
		keys_status[ev.key] = true;
	}
}
function key_up_fn(ev){
	if(ev.key in keys_status){
		keys_status[ev.key] = false;
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


// 弹幕列表
let danmaku = [];

function straight_down(frame){
	let speed = 10;
	let x = 0;
	let y = frame * speed;
	return [x, y];
}

function rand_spe_straight_down(speed_y, speed_x){
	return function(frame){
		let x = frame * speed_x * 0.5;
		let y = frame * speed_y * 0.5;
		return [x, y];
	}
}


function Bullet_Round_n(start_x, start_y, start_frame, radius, pathf){
	// 圆形固定弹，初始位置x、y，从第几帧开始出现，半径，路径函数
	this.x = start_x;
	this.y = start_y;
	this.radius = scala * radius;
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

function Jiki(){
	// 自机
	this.x = Math.round(canvas_width / 2);
	this.y = Math.round(canvas_height * 0.9);

	this.judging_radius = 10 * scala;
	this.speed = 15 * scala;
	this.slow_speed = 5 * scala;

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
}

let jiki = new Jiki();
let prev_fra_ts = Date.now(); // previous frame time stamp
let frames_count = 0;
let frames_total = 0;
function frame_draw(){
	frames_total++;

	// 判断按键，刷新自机位置
	if(keys_status['ArrowUp']){
		jiki.move_y(-1, keys_status['Shift']);
	}
	if(keys_status['ArrowDown']){
		jiki.move_y(1, keys_status['Shift']);
	}
	if(keys_status['ArrowLeft']){
		jiki.move_x(-1, keys_status['Shift']);
	}
	if(keys_status['ArrowRight']){
		jiki.move_x(1, keys_status['Shift']);
	}
	
	ctxm.clearRect(0, 0, canvas_width, canvas_height);

	// 定时创造弹幕 
	if(frames_total-200 >= 0 && frames_total%3 === 0){
		let x = canvas_width * Math.random();
		let y = canvas_height * 0.2;
		let bullet = new Bullet_Round_n(x, y, frames_total, 20, rand_spe_straight_down(5+Math.random()*10, 5-Math.random()*10));
		danmaku.push(bullet);
	}

	danmaku.forEach((bullet, ind, dmk)=>{
		// 刷新弹幕位置，并绘制弹幕
		bullet.get_posi(frames_total);
		if(bullet.is_out()){
			// 屏幕外的弹幕置为null
			dmk[ind] = null;
		}else{
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
				dmk[ind] = null;
			}
		}

	});
	danmaku = danmaku.filter(bullet=>(bullet!== null));
	// 删除置为null的弹幕



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
	}
}

const set_fps = 60;

let main_interval = window.setInterval(frame_draw, Math.round(1000 / set_fps));