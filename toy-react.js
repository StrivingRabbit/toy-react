// 基类，所有的 类组件 都要继承
export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
  }
  appendChild(component) {
    this.children.push(component)
  }
  setAttribute(key, attr) {
    this.props[key] = attr;
  }
  get root() {
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
  }
}

class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  appendChild(component) {
    this.root.appendChild(component.root);
  }
  setAttribute(name, attr) {
    this.root.setAttribute(name, attr);
  }
}

class TextWrapper {
  constructor(type) {
    this.root = document.createTextNode(type);
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
      if (typeof child === 'string') {
        child = new TextWrapper(child);
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

export function Render(component, parentNode) {
  parentNode.appendChild(component.root);
}