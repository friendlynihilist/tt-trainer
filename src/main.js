import './fonts.css';
import './app.css';
import './design.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
target.replaceChildren();
mount(App, { target });
