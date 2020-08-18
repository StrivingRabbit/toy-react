/**
 * day one
 * 为了使所有的类组件和原生标签实现 appendChild setAttribute 等方法
 * 类组件需要继承与一个基类
 * 在 createElement 创建虚拟dom的时候需要将 document.createElement装换为创建的ElementWrapper基类
 * 统一实现方法，统一劫持dom创建渲染过程
 * 
 * day tow
 * 使用range Api去操作dom，只去更新当前组件设计到的一块儿dom，进行一个删除，插入，替换
 */

const RENDER_TO_DOM = Symbol('render_to_dom');

// 基类，所有的 类组件 都要继承
export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  appendChild(component) {
    this.children.push(component)
  }
  setAttribute(key, attr) {
    this.props[key] = attr;
  }
  [RENDER_TO_DOM](range) {
    /**
     * this.render()
     * 会返回一个component或者一个dom
     * 递归去调用，知道调用到domWrapper上的 RENDER_TO_DOM 方法，渲染真实dom
     */
    this._range = range;
    this.render()[RENDER_TO_DOM](range);
  }
  /* get root() {
    // 递归的去拿去root属性，如果是component会一直递归调用 get root()，直到返回的是一个dom
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
  } */
  rerender() {
    /**
     * 在此处重绘时，在旧节点之前去重绘出新的dom
     * 然后将旧有dom清空，这样会避免出现bug
     */
    let oldRange = this._range;

    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);

    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents();
  }
  setState(newState) {
    if (TypeOf(newState) != 'Object') {
      this.state = newState;
      return;
    }
    let mergeState = (oldState, newState) => {
      for (const key in newState) {
        if (newState.hasOwnProperty(key)) {
          if (TypeOf(newState[key]) != 'Object') {
            oldState[key] = newState[key];
          } else {
            mergeState(oldState[key], newState[key]);
          }
        }
      }
    }
    mergeState(this.state, newState);
    this.rerender();
  }
}

// element类
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
    this.state = null;
  }
  appendChild(component) {
    // this.root.appendChild(component.root);
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }
  setAttribute(name, attr) {
    if (name.match(/^on([\s\S]+)$/)) {
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLocaleLowerCase()), attr);
    } else {
      if (name === 'className') {
        this.root.setAttribute('class', attr);
      } else {
        this.root.setAttribute(name, attr);
      }
    }
  }
  [RENDER_TO_DOM](range) {
    /**
     * 在此处，先将range清空，然后再往range中插入新的dom
     */
    range.deleteContents();
    range.insertNode(this.root);
  }
}

// 文本类
class TextWrapper {
  constructor(type) {
    this.root = document.createTextNode(type);
  }
  [RENDER_TO_DOM](range) {
    /**
     * 在此处，先将range清空，然后再往range中插入新的dom
     */
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export function createElement(type, attrs, ...children) {
  let e;

  if (typeof type === 'string') {
    e = new ElementWrapper(type)
  } else {
    e = new type();
  }

  for (const key in attrs) {
    if (attrs.hasOwnProperty(key)) {
      const attr = attrs[key];
      e.setAttribute(key, attr);
    }
  }

  const insertChildren = (children) => {
    for (let child of children) {
      if (['string', 'number'].includes(typeof child)) {
        child = new TextWrapper(child);
      }
      if (child === null) {
        continue;
      }
      if (typeof child === 'object' && child instanceof Array) {
        insertChildren(child);
      } else {
        e.appendChild(child);
      }
    }
  }
  insertChildren(children);

  return e;
}

export function render(component, parentNode) {
  /**
   * 创建一个range ，截取到 parentNode的dom范围
   * 然后再将range范围传入到组件的 RENDER_TO_DOM中，实现往range中渲染dom操作
   */
  let range = document.createRange();
  range.setStart(parentNode, 0);
  range.setEnd(parentNode, parentNode.childNodes.length);
  component[RENDER_TO_DOM](range);
}

function TypeOf(param) {
  return Object.prototype.toString.call(param).match(/\s([\s\S]+)]$/)[1];
}