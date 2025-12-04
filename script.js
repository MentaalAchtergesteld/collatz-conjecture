const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const COLORS = {};
COLORS.BACKGROUND = "hsl(0, 0%, 15%)";
COLORS.NODE_CONNECTION = "hsl(45, 90%, 90%)";
COLORS.NODE_TEXT = "hsl(0, 0%, 15%)";

const NODE_RADIUS = 16;
const REPULSION_RADIUS = 256;
const REPULSION_FORCE = 8.0;

const SPRING_LENGTH = 60;
const SPRING_FORCE = 0.5;
const CENTER_GRAVITY = 0.1;
const MAX_VEL = 100;

let CENTER_X = canvas.width / 2;
let CENTER_Y = canvas.height / 2;

let nodes = [];

function lerp(start, end, t) {
	return start + (end - start) * t;
}

function posToArr(pos) { return [pos.x, pos.y] } 

function randomPosition() {
	return {
		x: Math.random() * canvas.width,
		y: Math.random() * canvas.height
	}
}

function magnitude(x, y) {
	return Math.sqrt(x*x + y*y);
}

function distance(x1, y1, x2, y2) {
	let deltaX = x1 - x2;
	let deltaY = y1 - y2;

	return magnitude(deltaX, deltaY);
}

function normalize(x, y) {
	let mag = magnitude(x, y);

	return { x: x/mag, y: y/mag };
}

function playPop(frequency, gain = 0.3) {
	if (audioCtx.state == 'suspended') audioCtx.resume();

	const t = audioCtx.currentTime;
	const oscillator = audioCtx.createOscillator();
	oscillator.type = 'sine';
	const gainNode = audioCtx.createGain();

	oscillator.frequency.setValueAtTime(frequency, t);
	oscillator.frequency.exponentialRampToValueAtTime(100, t + 0.1);

	gainNode.gain.setValueAtTime(0, t);
	gainNode.gain.linearRampToValueAtTime(gain, t + 0.01);
	gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

	oscillator.connect(gainNode);
	gainNode.connect(audioCtx.destination);

	oscillator.start(t);
	oscillator.stop(t + 0.1);
}

class Node {
	constructor(value, x, y, radius) {
		this.value = value;

		this.x = x;
		this.y = y;
		this.velX = 0;
		this.velY = 0;

		this.maxRadius = radius;
		this.radius = 0;

		this.hue = this.value % 360;

		this.connections = [];

		playPop(100+this.value%500, 0.7);
	}

	drawConnections(ctx) {
		for (let node of this.connections) {
			ctx.strokeStyle = COLORS.NODE_CONNECTION;
			ctx.lineWidth = 6;

			ctx.beginPath();
			ctx.moveTo(this.x, this.y);
			ctx.lineTo(node.x, node.y);
			ctx.stroke();
		}
	}

	draw(ctx) {
		ctx.fillStyle = `hsl(${this.hue}, 90%, 80%)`;
		ctx.strokeStyle = `hsl(${this.hue}, 80%, 70%)`;
		ctx.lineWidth = 4;

		ctx.beginPath();
		ctx.ellipse(
			this.x, this.y,
			this.radius, this.radius,
			0, 0,
			2*Math.PI
		);
		ctx.fill();
		ctx.stroke();

		const baseFontSize = 14;
		const maxTextWidth = this.radius*1.6;
		ctx.font = `${baseFontSize}px Arial`;

		const textString = String(this.value);
		const textWidth = ctx.measureText(textString).width;

		if (textWidth > maxTextWidth) {
			const scaleFactor = maxTextWidth / textWidth;
			const newFontSize = Math.floor(baseFontSize * scaleFactor);
			ctx.font = `${newFontSize}px Arial`;
		}

		ctx.fillStyle = COLORS.NODE_TEXT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		ctx.fillText(this.value, this.x, this.y);
	}

	updateRadius(delta) {
		if (this.radius == this.maxRadius) return;
		this.radius = lerp(this.radius, this.maxRadius, 10*delta);
		if (this.maxRadius - this.radius < 0.1) this.radius = this.maxRadius;
	}

	updateNodeRepulsion(nodes) {
		for (let node of Object.values(nodes)) {
			if (node == this) continue;

			let dist = distance(this.x, this.y, node.x, node.y);
			if (dist == 0) dist = 0.1;

			if (dist > REPULSION_RADIUS) continue;
			let deltaX = this.x - node.x;
			let deltaY = this.y - node.y;
			let [normX, normY] = posToArr(normalize(deltaX, deltaY));

			let force = (1 - (dist / REPULSION_RADIUS)) * REPULSION_FORCE;

			this.velX += normX * force;
			this.velY += normY * force;
		}
	}

	updateNodeAttraction() {
		for (let node of Object.values(this.connections)) {
			let dist = distance(this.x, this.y, node.x, node.y);
			if (dist == 0) dist = 0.1;

			let stretch = dist - SPRING_LENGTH;
			let deltaX = node.x - this.x;
			let deltaY = node.y - this.y;

			let [normX, normY] = posToArr(normalize(deltaX, deltaY));

			let force = stretch * SPRING_FORCE;

			this.velX += normX * force;
			this.velY += normY * force;
		}	
	}

	updateCenterGravity() {
		let centerDirX = CENTER_X - this.x;
		let centerDirY = CENTER_Y - this.y;

		this.velX  += centerDirX * CENTER_GRAVITY;
		this.velY  += centerDirY * CENTER_GRAVITY;
	}

	updateFriction() {
		this.velX *= 0.9;
		this.velY *= 0.9;
	}

	capVelocity() {
		if (magnitude(this.velX, this.velY) < MAX_VEL) return;
		let [normVelX, normVelY] = posToArr(normalize(this.velX, this.velY));
		this.velX = normVelX * MAX_VEL;
		this.velY = normVelY * MAX_VEL;
	}

	updatePosition(delta) {
		this.x += this.velX * delta;
		this.y += this.velY * delta;
	}

	update(delta, nodes) {
		this.updateRadius(delta);
		this.updateNodeRepulsion(nodes);
		this.updateNodeAttraction();
		this.updateCenterGravity();
		this.updateFriction();
		this.capVelocity();
		this.updatePosition(delta);
	}

	hasConnection(other) {
		if (typeof other == 'number') {
			return this.connections.find(n => n.value == other) != undefined;
		} else {
			return this.connections.includes(other);
		}
	}

	connect(other) {
		if (!this.hasConnection(other)) this.connections.push(other);
		if (!other.hasConnection(this)) other.connect(this);
	}
}

function makeCanvasFullscreen() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	CENTER_X = canvas.width / 2;
	CENTER_Y = canvas.height / 2;
}

function clearCanvas() {
	ctx.fillStyle = COLORS.BACKGROUND;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

makeCanvasFullscreen();
clearCanvas();
window.addEventListener("resize", makeCanvasFullscreen);

class Collatz {
	constructor(start, x, y, initialDelay = 0.5) {
		this.currentNode = nodes.find(n => n.value == start);
		if (this.currentNode == undefined) {
			this.currentNode = new Node(start, x, y, 16);
			nodes.push(this.currentNode);
		}

		this.initialDelay = initialDelay;
		this.delay = this.initialDelay;
		this.timer = 0;
		this.minDelay = 0.02;

		this.isFinished = false;
	}

	update(delta) {
		if (this.isFinished) return;
		this.timer += delta;
		if (this.timer < this.delay) return;
		this.timer -= this.delay;

		let currentValue = this.currentNode.value;
		let nextValue;
		if (currentValue % 2 == 0) {
			nextValue = currentValue / 2;
		} else {
			nextValue = currentValue * 3 + 1;
		}

		if (this.currentNode.hasConnection(nextValue)) {
			this.isFinished = true;
			playPop(1500, 1.0);
			return;
		};

		let nextNode = nodes.find(n => n.value == nextValue);
		if (!nextNode) {
			let x = this.currentNode.x + (Math.random()-0.5) * 40;
			let y = this.currentNode.y + (Math.random()-0.5) * 40;

			nextNode = new Node(nextValue, x, y, 16);
			nodes.push(nextNode);
		}

		this.currentNode.connect(nextNode);
		this.currentNode = nextNode;
		this.delay = Math.max(this.minDelay, this.delay*0.95);
	}
}

let MOUSE_X = 0;
let MOUSE_Y = 0;
canvas.addEventListener("mousemove", e => {
	MOUSE_X = e.clientX;
	MOUSE_Y = e.clientY;
});

let collatz = [];

let selectedNode;

canvas.addEventListener("mousedown", e => {
	selectedNode = nodes.find(n => distance(n.x, n.y, e.clientX, e.clientY) < n.radius);
	console.log(selectedNode);
})

canvas.addEventListener("mouseup", e => {
	if (!selectedNode) {
		collatz.push(new Collatz(Math.floor(Math.random()*100000), e.clientX, e.clientY));
		return;
	} else {
		selectedNode = undefined;
	}
})

let lastTime = performance.now();
function loop(time) {
	let delta = Math.max((time - lastTime) / 1000, 0);
	lastTime = time;

	clearCanvas();

	collatz.forEach(c => c.update(delta));
	collatz = collatz.filter(c => !c.isFinished);
	nodes.forEach(n => n.update(delta, nodes));
	nodes.forEach(n => n.drawConnections(ctx));
	nodes.forEach(n => n.draw(ctx));

	if (selectedNode) {
		selectedNode.x = MOUSE_X;
		selectedNode.y = MOUSE_Y;
	}

	requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
