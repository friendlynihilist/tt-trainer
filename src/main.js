import './fonts.css';
import './app.css';
import './design.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app') });
