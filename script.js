const AXES = [
  { tag: 'wght', name: 'Weight',   min: 1,    max: 1000, default: 400 },
  { tag: 'wdth', name: 'Width',    min: 25,   max: 151,  default: 100 },
  { tag: 'opsz', name: 'Optical size', min: 6, max: 144, default: 40 },
  { tag: 'slnt', name: 'Slant',    min: -10,  max: 0,    default: 0 },
  { tag: 'GRAD', name: 'Grade',    min: 0,    max: 100,  default: 0 },
  { tag: 'ROND', name: 'Roundness', min: 0,   max: 100,  default: 0 },
];

const DEFAULT_LINES = [
  { text: 'Type', color: '#f5f5f5', size: 120, tracking: 0, offset: 0, axes: { wght: 700, wdth: 100, opsz: 96, slnt: 0, GRAD: 0, ROND: 0 } },
  { text: 'Feel', color: '#f5f5f5', size: 80,  tracking: 0, offset: 0, axes: { wght: 300, wdth: 100, opsz: 64, slnt: 0, GRAD: 0, ROND: 100 } },
  { text: 'Flex', color: '#7c9eff', size: 48,  tracking: 0.02, offset: 0, axes: { wght: 500, wdth: 80, opsz: 40, slnt: -6, GRAD: 0, ROND: 0 } },
];

const panel = document.getElementById('panel');
const panelTemplate = document.getElementById('line-panel-template');
const axisTemplate = document.getElementById('axis-template');
const stage = document.getElementById('stage');

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function applyLine(index, state) {
  const el = document.getElementById(`line-${index}`);
  el.textContent = state.text;
  el.style.color = state.color;
  el.style.fontSize = `${state.size}px`;
  el.style.letterSpacing = `${state.tracking}em`;
  el.style.transform = `translateY(${state.offset}px)`;
  const settings = AXES.map((a) => `'${a.tag}' ${state.axes[a.tag]}`).join(', ');
  el.style.fontVariationSettings = settings;
}

function buildLineEditor(index, state) {
  const node = panelTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.line = index;
  node.querySelector('.line-index').textContent = `Line ${index + 1}`;

  const textInput = node.querySelector('.text-input');
  const colorInput = node.querySelector('.color-input');
  const sizeInput = node.querySelector('.size-input');
  const sizeOut = node.querySelector('.size-out');
  const trackingInput = node.querySelector('.tracking-input');
  const trackingOut = node.querySelector('.tracking-out');
  const offsetInput = node.querySelector('.offset-input');
  const offsetOut = node.querySelector('.offset-out');
  const axesContainer = node.querySelector('.axes');

  textInput.value = state.text;
  colorInput.value = state.color;
  sizeInput.value = state.size;
  sizeOut.textContent = `${state.size}px`;
  trackingInput.value = state.tracking;
  trackingOut.textContent = `${fmt(state.tracking)}em`;
  offsetInput.value = state.offset;
  offsetOut.textContent = `${state.offset}px`;

  textInput.addEventListener('input', () => {
    state.text = textInput.value;
    applyLine(index, state);
  });
  colorInput.addEventListener('input', () => {
    state.color = colorInput.value;
    applyLine(index, state);
  });
  sizeInput.addEventListener('input', () => {
    state.size = Number(sizeInput.value);
    sizeOut.textContent = `${state.size}px`;
    applyLine(index, state);
  });
  trackingInput.addEventListener('input', () => {
    state.tracking = Number(trackingInput.value);
    trackingOut.textContent = `${fmt(state.tracking)}em`;
    applyLine(index, state);
  });
  offsetInput.addEventListener('input', () => {
    state.offset = Number(offsetInput.value);
    offsetOut.textContent = `${state.offset}px`;
    applyLine(index, state);
  });

  AXES.forEach((axis) => {
    const axisNode = axisTemplate.content.firstElementChild.cloneNode(true);
    const nameEl = axisNode.querySelector('.axis-name');
    const outEl = axisNode.querySelector('.axis-out');
    const rangeEl = axisNode.querySelector('.axis-input');

    nameEl.textContent = `${axis.name} (${axis.tag})`;
    rangeEl.min = axis.min;
    rangeEl.max = axis.max;
    rangeEl.step = axis.tag === 'slnt' ? 0.1 : 1;
    rangeEl.value = state.axes[axis.tag];
    outEl.textContent = fmt(state.axes[axis.tag]);

    rangeEl.addEventListener('input', () => {
      state.axes[axis.tag] = Number(rangeEl.value);
      outEl.textContent = fmt(state.axes[axis.tag]);
      applyLine(index, state);
    });

    axesContainer.appendChild(axisNode);
  });

  return node;
}

function init() {
  DEFAULT_LINES.forEach((state, index) => {
    panel.appendChild(buildLineEditor(index, state));
    applyLine(index, state);
  });

  document.getElementById('bg-color').addEventListener('input', (e) => {
    stage.style.background = e.target.value;
  });
  stage.style.background = document.getElementById('bg-color').value;

  document.getElementById('stage-ratio').addEventListener('change', (e) => {
    stage.style.aspectRatio = `1 / ${1 / Number(e.target.value)}`;
  });
  const initialRatio = Number(document.getElementById('stage-ratio').value);
  stage.style.aspectRatio = `1 / ${1 / initialRatio}`;
}

init();
