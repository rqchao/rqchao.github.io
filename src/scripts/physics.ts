import {
	Bodies,
	Body,
	Composite,
	Engine,
	Events,
	Render,
	Runner,
	Vector,
} from "matter-js";

const MAX_PULL = 120;
const GRAVITY = 0.8;
const STRIKE_SCALE = 0.2;
const SOUND_KEY = "statusBoardSound";

type Obstacle = { body: Body; element: HTMLElement };
type DragState = {
	dragging: boolean;
	dragAnchor: Vector | null;
	dragVector: Vector | null;
	activePointerId: number | null;
};
type AudioState = {
	enabled: boolean;
	lastTime: number;
	context: AudioContext | null;
};
type State = {
	engine: Engine;
	render: Render;
	runner: Runner;
	canvas: HTMLCanvasElement;
	heroDot: HTMLElement;
	resetLink: HTMLAnchorElement | null;
	soundToggle: HTMLButtonElement | null;
	ball: Body | null;
	ballRadius: number;
	hasStarted: boolean;
	drag: DragState;
	audio: AudioState;
	obstacles: Obstacle[];
	bounds: Body[];
};

const isMobile = window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;
if (isMobile) {
	document.body.dataset.physics = "off";
} else {
	initPhysics();
}

function initPhysics() {
	const heroDot = document.getElementById("hero-dot");
	if (!heroDot) return;

	const state = createState(heroDot);
	initAudio(state);
	bindEvents(state);
	setupSimulation(state);
}

function createState(heroDot: HTMLElement): State {
	const engine = Engine.create();
	engine.gravity.y = 0;
	engine.positionIterations = 10;
	engine.velocityIterations = 8;

	const canvas = document.createElement("canvas");
	canvas.className = "physics-canvas";
	document.body.appendChild(canvas);

	const render = Render.create({
		engine,
		canvas,
		options: {
			width: window.innerWidth,
			height: window.innerHeight,
			wireframes: false,
			background: "transparent",
		},
	});

	const runner = Runner.create();

	return {
		engine,
		render,
		runner,
		canvas,
		heroDot,
		resetLink: document.querySelector<HTMLAnchorElement>("[data-reset]"),
		soundToggle: document.querySelector<HTMLButtonElement>(
			"[data-sound-toggle]",
		),
		ball: null,
		ballRadius: 0,
		hasStarted: false,
		drag: {
			dragging: false,
			dragAnchor: null,
			dragVector: null,
			activePointerId: null,
		},
		audio: {
			enabled: true,
			lastTime: 0,
			context: null,
		},
		obstacles: [],
		bounds: [],
	};
}

function setupSimulation(state: State) {
	Render.setPixelRatio(state.render, window.devicePixelRatio || 1);
	Render.run(state.render);
	Runner.run(state.runner, state.engine);

	const scheduleRebuild = makeSchedule(() => {
		Render.setSize(state.render, window.innerWidth, window.innerHeight);
		Render.setPixelRatio(state.render, window.devicePixelRatio || 1);
		state.bounds = rebuildBounds(state.engine, state.bounds);
		state.obstacles = rebuildObstacles(state.engine, state.obstacles);
	});

	const resizeObserver = new ResizeObserver(scheduleRebuild);
	resizeObserver.observe(document.body);

	window.addEventListener("resize", scheduleRebuild);
	window.addEventListener("scroll", scheduleRebuild, { passive: true });

	Events.on(state.render, "afterRender", () => drawTrajectory(state));
	Events.on(state.engine, "collisionStart", (event) =>
		handleCollision(state, event),
	);

	scheduleRebuild();
}

function bindEvents(state: State) {
	state.heroDot.addEventListener("click", () => spawnBall(state));
	state.heroDot.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			spawnBall(state);
		}
	});

	state.resetLink?.addEventListener("click", (event) => {
		event.preventDefault();
		resetBall(state);
	});

	state.soundToggle?.addEventListener("click", () => toggleSound(state));

	window.addEventListener("keydown", (event) => {
		if (event.key.toLowerCase() === "r") {
			resetBall(state);
		}
	});

	window.addEventListener("pointerdown", (event) =>
		onPointerDown(state, event),
	);
	window.addEventListener("pointermove", (event) =>
		onPointerMove(state, event),
	);
	window.addEventListener("pointerup", (event) => onPointerUp(state, event));
	window.addEventListener("pointercancel", () => onPointerCancel(state));
}

function onPointerDown(state: State, event: PointerEvent) {
	if (event.button !== 0 || !state.ball || !state.hasStarted || state.drag.dragging)
		return;

	const distance = Vector.magnitude(
		Vector.sub({ x: event.clientX, y: event.clientY }, state.ball.position),
	);
	const hitRadius = getBallRadius(state) + 6;

	if (distance <= hitRadius) {
		state.drag.dragging = true;
		state.drag.activePointerId = event.pointerId;
		state.drag.dragAnchor = { ...state.ball.position };
		state.drag.dragVector = { x: 0, y: 0 };
		Body.setStatic(state.ball, true);
		Body.setVelocity(state.ball, { x: 0, y: 0 });
	}
}

function onPointerMove(state: State, event: PointerEvent) {
	if (
		!state.drag.dragging ||
		state.drag.activePointerId !== event.pointerId ||
		!state.ball ||
		!state.drag.dragAnchor
	) {
		return;
	}

	const rawVector = Vector.sub(
		{ x: event.clientX, y: event.clientY },
		state.drag.dragAnchor,
	);
	const length = Vector.magnitude(rawVector);
	const limited = length === 0
		? rawVector
		: Vector.mult(Vector.normalise(rawVector), Math.min(length, MAX_PULL));

	state.drag.dragVector = limited;
}

function onPointerUp(state: State, event: PointerEvent) {
	if (
		!state.drag.dragging ||
		state.drag.activePointerId !== event.pointerId ||
		!state.ball ||
		!state.drag.dragVector
	) {
		return;
	}

	Body.setStatic(state.ball, false);
	const velocity = Vector.mult(state.drag.dragVector, -STRIKE_SCALE);
	Body.setVelocity(state.ball, velocity);

	resetDrag(state);
}

function onPointerCancel(state: State) {
	if (state.ball && state.drag.dragging) {
		Body.setStatic(state.ball, false);
	}
	resetDrag(state);
}

function resetDrag(state: State) {
	state.drag.dragging = false;
	state.drag.dragAnchor = null;
	state.drag.dragVector = null;
	state.drag.activePointerId = null;
}

function drawTrajectory(state: State) {
	if (
		!state.drag.dragging ||
		!state.drag.dragAnchor ||
		!state.ball ||
		!state.drag.dragVector
	) {
		return;
	}

	const pullLength = Vector.magnitude(state.drag.dragVector);
	if (pullLength === 0) return;

	const ctx = state.render.context;
	const velocity = Vector.mult(state.drag.dragVector, -STRIKE_SCALE);
	const gravity = state.engine.gravity.y * state.engine.gravity.scale;
	const baseStep = 3 + (pullLength / MAX_PULL) * 4;
	const dotCount = 3;

	ctx.save();
	ctx.fillStyle = "rgba(23, 23, 23, 0.45)";

	const radiusBase = getBallRadius(state) * 0.7;

	for (let i = 1; i <= dotCount; i += 1) {
		const steps = baseStep * i;
		const x = state.drag.dragAnchor.x + velocity.x * steps;
		const y =
			state.drag.dragAnchor.y +
			velocity.y * steps +
			0.5 * gravity * steps * steps;
		const radius = Math.max(2, radiusBase - i * 1.2);
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

function handleCollision(state: State, event: Matter.IEventCollision<Engine>) {
	event.pairs.forEach((pair) => {
		const hit = state.obstacles.find(
			(item) => item.body === pair.bodyA || item.body === pair.bodyB,
		);
		if (!hit) return;
		const target = hit.element.closest(".tile") ?? hit.element;
		target.classList.add("hit");
		window.setTimeout(() => target.classList.remove("hit"), 160);
		playTap(state);
	});
}

function spawnBall(state: State) {
	const pos = getDotPosition(state.heroDot);
	if (!state.ball) {
		state.ballRadius = pos.radius;
		state.ball = Bodies.circle(pos.x, pos.y, pos.radius, {
			restitution: 0.35,
			friction: 0.2,
			frictionAir: 0.012,
			render: {
				fillStyle: "#ededed",
				strokeStyle: "#171717",
				lineWidth: 1.5,
			},
		});
		Composite.add(state.engine.world, state.ball);
	} else {
		Body.setPosition(state.ball, pos);
		Body.setVelocity(state.ball, { x: 0, y: 0 });
		Body.setAngularVelocity(state.ball, 0);
	}

	state.engine.gravity.y = GRAVITY;
	state.hasStarted = true;
	state.heroDot.classList.add("is-hidden");
	unlockAudio(state);
}

function resetBall(state: State) {
	if (state.ball) {
		Composite.remove(state.engine.world, state.ball);
		state.ball = null;
	}
	state.ballRadius = 0;
	state.engine.gravity.y = 0;
	state.hasStarted = false;
	state.heroDot.classList.remove("is-hidden");
	resetDrag(state);
}

function rebuildBounds(engine: Engine, prevBounds: Body[]) {
	clearBodies(engine, prevBounds);
	const width = window.innerWidth;
	const height = window.innerHeight;
	const thickness = 200;

	const bounds = [
		Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, {
			isStatic: true,
			render: { visible: false },
		}),
		Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, {
			isStatic: true,
			render: { visible: false },
		}),
		Bodies.rectangle(-thickness / 2, height / 2, thickness, height + thickness * 2, {
			isStatic: true,
			render: { visible: false },
		}),
		Bodies.rectangle(width + thickness / 2, height / 2, thickness, height + thickness * 2, {
			isStatic: true,
			render: { visible: false },
		}),
	];

	Composite.add(engine.world, bounds);
	return bounds;
}

function rebuildObstacles(engine: Engine, prevObstacles: Obstacle[]) {
	clearBodies(engine, prevObstacles.map((item) => item.body));

	const main = document.querySelector("main");
	if (!main) return [];

	const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			if (!node.nodeValue || !node.nodeValue.trim()) {
				return NodeFilter.FILTER_REJECT;
			}
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;
			if (parent.id === "hero-dot") return NodeFilter.FILTER_REJECT;
			if (parent.closest("[data-no-obstacle]")) {
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const padding = 6;
	const obstacles: Obstacle[] = [];

	while (walker.nextNode()) {
		const node = walker.currentNode;
		const parent = node.parentElement;
		if (!parent) continue;
		const range = document.createRange();
		range.selectNodeContents(node);
		Array.from(range.getClientRects()).forEach((rect) => {
			if (rect.width < 1 || rect.height < 1) return;
			const width = Math.max(rect.width + padding * 2, 1);
			const height = Math.max(rect.height + padding * 2, 1);
			const body = Bodies.rectangle(
				rect.left + rect.width / 2,
				rect.top + rect.height / 2,
				width,
				height,
				{
					isStatic: true,
					render: { visible: false },
				},
			);
			body.label = "obstacle";
			obstacles.push({ body, element: parent });
		});
		range.detach?.();
	}

	Composite.add(engine.world, obstacles.map((item) => item.body));
	return obstacles;
}

function clearBodies(engine: Engine, bodies: Body[]) {
	bodies.forEach((body) => Composite.remove(engine.world, body));
}

function initAudio(state: State) {
	state.audio.enabled = readSoundState();
	updateSoundToggle(state);
}

function toggleSound(state: State) {
	state.audio.enabled = !state.audio.enabled;
	writeSoundState(state.audio.enabled);
	updateSoundToggle(state);
	unlockAudio(state);
}

function updateSoundToggle(state: State) {
	if (!state.soundToggle) return;
	state.soundToggle.textContent = state.audio.enabled ? "On" : "Off";
	state.soundToggle.setAttribute(
		"aria-pressed",
		state.audio.enabled ? "true" : "false",
	);
}

function unlockAudio(state: State) {
	if (!state.audio.enabled || state.audio.context) return;
	state.audio.context = new AudioContext();
	if (state.audio.context.state === "suspended") {
		state.audio.context.resume();
	}
}

function playTap(state: State) {
	if (!state.audio.enabled || !state.audio.context) return;
	const now = performance.now();
	if (now - state.audio.lastTime < 90) return;
	state.audio.lastTime = now;

	const oscillator = state.audio.context.createOscillator();
	const gainNode = state.audio.context.createGain();
	const baseFrequency = 380 + Math.random() * 80;

	oscillator.type = "triangle";
	oscillator.frequency.setValueAtTime(
		baseFrequency,
		state.audio.context.currentTime,
	);

	gainNode.gain.setValueAtTime(0.0001, state.audio.context.currentTime);
	gainNode.gain.exponentialRampToValueAtTime(
		0.08,
		state.audio.context.currentTime + 0.01,
	);
	gainNode.gain.exponentialRampToValueAtTime(
		0.0001,
		state.audio.context.currentTime + 0.08,
	);

	oscillator.connect(gainNode);
	gainNode.connect(state.audio.context.destination);

	oscillator.start(state.audio.context.currentTime);
	oscillator.stop(state.audio.context.currentTime + 0.1);
}

function readSoundState() {
	try {
		const stored = localStorage.getItem(SOUND_KEY);
		return stored !== "off";
	} catch {
		return true;
	}
}

function writeSoundState(enabled: boolean) {
	try {
		localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
	} catch {
		// Ignore storage failures.
	}
}

function getDotPosition(dot: HTMLElement) {
	const rect = dot.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
		radius: rect.width / 2,
	};
}

function getBallRadius(state: State) {
	if (state.ball && "circleRadius" in state.ball) return state.ball.circleRadius;
	return state.ballRadius;
}

function makeSchedule(callback: () => void) {
	let pending = false;
	return () => {
		if (pending) return;
		pending = true;
		requestAnimationFrame(() => {
			pending = false;
			callback();
		});
	};
}
