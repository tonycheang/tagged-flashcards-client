import React from 'react';
import ReactDOM from 'react-dom';
import FlashCardApp from './App';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<FlashCardApp />, div);
  ReactDOM.unmountComponentAtNode(div);
});
