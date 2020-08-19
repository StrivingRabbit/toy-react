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
    // 14:00
    this._range = range;
    // 由于会更新，因此将更新前的旧有vdom储存下来
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }
  update() {
    let isSameNode = (oldNode, newNode) => {
      // 如果type不同则直接false
      if (oldNode.type !== newNode.type) {
        return false;
      }
      // 如果props有不同的则 false 其实不应该这样，应该patch比对
      for (const name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) {
          return false;
        }
      }
      // 如果新增了props，false
      if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length)
        return false;
      // 文本节点如果不对，则直接false
      if (newNode.type === "#text") {
        if (newNode.content !== oldNode.content) {
          return false;
        }
      }

      return true;
    }
    let update = (oldNode, newNode) => {
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }

      newNode._range = oldNode._range;

      // 23:22
      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      // 如果没有新的children，则直接return
      if (!newChildren || !newChildren.length) {
        return;
      }

      // 尾节点range
      let tailRange = oldChildren[oldChildren.length - 1]._range;

      for (let index = 0; index < newChildren.length; index++) {
        const newChild = newChildren[index];
        const oldChild = oldChildren[index];
        // 如果index 小于 oldChildren.length
        // 说明旧有dom比对
        // 则递归的去调用
        if (index < oldChildren.length) {
          update(oldChild, newChild);
        } else {
          // TODO
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    }
    // 将this.vdom储存，然后更新完后，储存为旧有_vdom
    // 16:10
    let vdom = this.vdom;
    // 此处 不可用this.vdom，因为会有引用bug
    update(this._vdom, vdom);
    this._vdom = vdom;
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
    this.update();
  }
  get vdom() {
    // 递归调用，直到是一个ElementWrapper的vdom
    return this.render().vdom;
  }
  /* get vchildren() {
    return this.children.map(child => child.vdom);
  } */
  /* get root() {
    // 递归的去拿去root属性，如果是component会一直递归调用 get root()，直到返回的是一个dom
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
  }  
  rerender() {
    // 在此处重绘时，在旧节点之前去重绘出新的dom
    // 然后将旧有dom清空，这样会避免出现bug
    // let oldRange = this._range;

    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);

    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents();
  } */
}

// element类
class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
    // this.root = document.createElement(type);
  }
  [RENDER_TO_DOM](range) {
    /**
     * 在此处，先将range清空，然后再往range中插入新的dom
     */
    // range.deleteContents();
    this._range = range;

    let root = document.createElement(this.type);

    // 添加props
    for (const name in this.props) {
      const attr = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLocaleLowerCase()), attr);
      } else {
        if (name === 'className') {
          root.setAttribute('class', attr);
        } else {
          root.setAttribute(name, attr);
        }
      }
    }

    if (!this.vchildren)
      this.vchildren = this.children.map(child => child.vdom);

    // 添加child
    for (const child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }

    replaceContent(range, root);
    // range.insertNode(root);
  }
  get vdom() {
    this.vchildren = this.children.map(child => child.vdom);
    return this;
  }
  /* appendChild(component) {
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
  } */
}

// 文本类
class TextWrapper extends Component {
  constructor(content) {
    super(content);
    this.type = '#text';
    this.content = content;
  }
  [RENDER_TO_DOM](range) {
    /**
     * 在此处，先将range清空，然后再往range中插入新的dom
     */
    this._range = range;
    /* range.deleteContents();
    range.insertNode(this.root); */
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
  get vdom() {
    return this;
    /* {
      type: '#text',
      content: this.content
    } */
  }
}

function replaceContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);
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