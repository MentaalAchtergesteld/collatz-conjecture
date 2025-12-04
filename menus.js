// Top panel, side panels, bottom panel
// Should be collapsable ?
// Adding inputs via code
// Reacting to inputs automatically
// Adding labels

function injectStyles() {
	const css = `
		.qh-container {
			position: absolute;
			background: rgba(20, 20, 30, 0.8);
			backdrop-filter: blur(8px);
			padding: 15px;
			border-radius: 8px;
			display: flex;
			flex-direction: column;
			gap: 10px;
			font-family: monospace;
			color: white;
			z-index: 1000;
			min-width: 200px;
			box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
			border: 1px solid rgba(255, 255, 255, 0.1);
		}
		.qh-top-right { top: 20px; right: 20px; }
		.qh-top-left  { top: 20px; left: 20px; }
		.qh-bottom-right { bottom: 20px; right: 20px; }
		.qh-bottom-left  { bottom: 20px; left: 20px; }

		.qh-row {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.qh-label {
			font-size: 12px;
			color: #aaa;
			display: flex;
			justify-content: space-between;
		}

		.qh-input-group {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.qh-slider { flex-grow: 1; cursor: pointer; }
		.qh-number { width: 50px; background: transparent; border: 1px solid #555; color: white; border-radius: 4px; padding: 2px; }

		.qh-button {
			background: #4a90e2;
			border: none;
			color: white;
			padding: 8px;
			border-radius: 4px;
			cursor: pointer;
			font-weight: bold;
			transition: background 0.2s;
		}
		.qh-button:hover { background: #357abd; }
		.qh-button:active { transform: scale(0.98); }
	`
	
	const style = document.createElement("style");
	style.id = "quick-hud-styles";
	style.textContent = css;
	document.head.appendChild(style);
}

class QuickHUD {
	constructor(position = "top-right") {
		this.container = document.createElement("div");
		this.container.className = `qh-container qh-${position}`;
		document.body.appendChild(this.container);

		if (!document.getElementById("quick-hud-styles")) injectStyles();
	}

	addRange(label, min, max, value, step, callback) {
		const row = document.createElement("div");
		row.className = "qh-row";

		const labelEl = document.createElement("span");
		labelEl.innerText = label;

		const valueEl = document.createElement("span");
		valueEl.innerText = value;

		const labelRow = document.createElement("div");
		labelRow.className = "qh-label";

		labelRow.appendChild(labelEl);
		labelRow.appendChild(valueEl);

		const input = document.createElement("input");
		input.type = "range";
		input.className = "qh-slider";
		input.min = min;
		input.max = max;
		input.step = step;
		input.value = value;

		input.addEventListener("input", e => {
			const val = parseFloat(e.target.value);
			valueEl.innerText = val.toFixed(step < 1 ? 2 : 0);
			callback(val);
		});

		row.appendChild(labelRow);
		row.appendChild(input);
		this.container.appendChild(row);
		return this;
	}
}
