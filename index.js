function normalize(arr) {
  const mins = arr.map(row => Math.min(...row))
  const maxs = arr.map(row => Math.max(...row))
  const min = Math.min(...mins)
  const max = Math.max(...maxs)
  
  return arr.map(row => row.map(x => (x - min)/(max - min)))
}

function rand(roughness, iter) {
  
  const max = Math.abs(roughness**iter)
  const min = -max

  return min + Math.random()*(max - min)
}

function diamond(arr, size, r) {
  const step = size - 1
  const hstep = step / 2
  const pow = Math.log2((arr.length-1)/(size-1)) + 1

  for(let i = hstep; i < arr.length; i += step) {
    for(let j = hstep; j < arr.length; j += step) {

      const tl = arr[i - hstep][j - hstep]
      const tr = arr[i + hstep][j - hstep]
      const bl = arr[i - hstep][j + hstep]
      const br = arr[i + hstep][j + hstep]
      
      const m = (tl + tr + bl + br) / 4
      arr[i][j] = m + rand(r, pow)
    }
  }
  return arr
}

function square(arr, size, r) {
  const step = size - 1
  const hstep = step / 2
  
  const pow = Math.log2((arr.length-1)/(size-1)) + 1

  for(let i = 0; i < arr.length; i += hstep) {
    const jStart = (i/hstep)%2 ? 0 : hstep
    for(let j = jStart; j < arr.length; j += step) {
      const m = [[i+hstep, j], [i-hstep, j], [i, j+hstep], [i, j-hstep]]
        .filter(([row, _]) => row >= 0 && row < arr.length)
        .filter(([_, col]) => col >= 0 && col < arr.length)
        .map(([row, col]) => arr[row][col])
        .reduce((s, x, _, arr) => s + x/arr.length, 0)
      
      arr[i][j] = m + rand(r, pow)
    }
  }
  return arr
}

function generate(size, r) {
  let data = new Array(size).fill(0).map(_ => new Array(size).fill(0))

  data[0][0] = rand(r, 0)
  data[size-1][0] = rand(r, 0)
  data[0][size-1] = rand(r, 0)
  data[size-1][size-1] = rand(r, 0)

  while (size > 2) {
    data = diamond(data, size, r)
    data = square(data, size, r)
    size = (size - 1)/2 + 1
  }

  return normalize(data)
}

function rangeInput({
  callback,
  min = 0, 
  max = 1,
  step = 0.01,
  label = '',
  value = min
}) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('range')

  if (label) {
    const labelEl = document.createElement('label')
    labelEl.classList.add('range__label')
    labelEl.innerHTML = label
    wrapper.appendChild(labelEl) 
  }

  const range = document.createElement('input')
  range.classList.add('range__input')
  range.setAttribute('type', 'range')
  range.setAttribute('min', min)
  range.setAttribute('max', max)
  range.setAttribute('step', step)
  range.setAttribute('value', value)
  range.oninput = _ => callback(range.value)
  wrapper.appendChild(range)
  return wrapper
}

function selectButtons({items, callback, selected}) {
  const selector = document.createElement('div')
  selector.classList.add('select-buttons')

  let buttons = {}
  let current = null

  function setSelected(name) {
    if (current) {
      buttons[current].button.classList.remove('select-buttons__button--selected')
    }
    current = name
    buttons[current].button.classList.add('select-buttons__button--selected')
    callback(buttons[current].value)
  }

  for(const {name, value} of items) {
    console.log(name)
    const button = document.createElement('button')
    button.classList.add('select-buttons__button')
    button.innerHTML = name
    
    buttons[name] = {
      value,
      button
    }
    
    button.addEventListener('click', () => setSelected(name))
    selector.appendChild(button)
  }

  setSelected(selected)

  return selector
}

function draw(canvas, size, r, colorFunction) {
  canvas.height = Math.max(size, canvas.clientWidth)
  canvas.width = Math.max(size, canvas.clientWidth)

  const ctx = canvas.getContext('2d')
  const hs = generate(size, r)

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)
  const step = canvas.width/size
  for(let i = 0; i < size; i++) {
    for(let j = 0; j < size; j++) {
      ctx.fillStyle = colorFunction(hs[i][j])
      ctx.fillRect(i*step, j*step, step+1, step+1)
    }
  }
}

class DSSetting {
  constructor(initSize, initRoughness, initColorFunction) {
    this.size = initSize
    this.roughness = initRoughness
    this.colorFunction = initColorFunction
    this._listeners = []
  }

  subscribe(cb) {
    this._listeners.push(cb)
    return () => {
      this._listeners = this._listeners.filter(f => f !== cb)
    }
  }

  notify() {
    this._listeners.forEach(f => f(
      2**this.size + 1,
      this.roughness,
      this.colorFunction
    ))
  }

  updateSize(newSize) {
    this.size = newSize
    this.notify()
  }

  updateRoughness(newRoughness) {
    this.roughness = newRoughness
    this.notify()
  }

  updateColorFunction(f) {
    this.colorFunction = f
    this.notify()
  }
}

const toColor = x => {
  if (x < 0.4) return 'rgb(44, 44, 226)'
  if (x < 0.5) return 'yellow'
  if (x < 0.8) return 'green'
  if (x < 0.9) return 'grey'
  return 'white';    
}
const toBin = x => x >= 0.5 ? 'black' : 'white'
const toGreyscale = x => {
  const v = Math.floor(256*x)
  return `rgb(${v},${v},${v})`
}

function app() {
  const canvas = document.createElement('canvas')
  canvas.classList.add('canvas')
  const config = new DSSetting(6, 0.75, toColor)
  
  const roughnessRange = rangeInput({
    min: 0,
    max: 1,
    step: 0.05,
    value: config.roughness,
    label: 'Roughness',
    callback: val => config.updateRoughness(val)
  })

  const colorModeSelector = selectButtons({
    items: [
      { name: 'Binary', value: toBin },
      { name: 'Grayscale', value: toGreyscale },
      { name: 'Color', value: toColor}
    ],
    selected: 'Color',
    callback: f => config.updateColorFunction(f)
  })

  const sizeName = size => `${2**size + 1}x${2**size + 1}`
  const sizeSelector = selectButtons({
    items: new Array(5).fill(0).map((_, i) => ({
      name: sizeName(i + 5),
      value: i + 3,
    })),
    selected: sizeName(6),
    callback: s => config.updateSize(s)
  })

  root.appendChild(canvas)
  root.appendChild(colorModeSelector)
  root.appendChild(sizeSelector)
  root.appendChild(roughnessRange)


  config.subscribe((size, r, cf) => draw(canvas, size, r, cf))
  config.notify()

}

document.addEventListener('DOMContentLoaded', app)
