import { createElement, Render, Component } from './toy-react';

class MyComponent extends Component {
  render() {
    return <div>
      <h1>My Component</h1>
      {this.children}
    </div>;
  }
}

let a = <MyComponent>
  <div id="DIV" class="div_1">
    <div>123</div>
    <div></div>
    <div></div>
  </div>
  <h1>这里是子节点</h1>
</MyComponent>

Render(a, document.body)