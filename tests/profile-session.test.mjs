import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';


const require = createRequire(import.meta.url);
const {transformSync} = require('next/dist/build/swc');
function setup(context) {
  let loader;
  const requests = [];
  const resource = {loading: false, error: '', data: null, reload() {}};
  context.api = async path => {
    requests.push(path);
    if (path === '/users/me') return {id: 'reader', username: 'reader'};
    return [];
  };
  const provider = {useApplication: () => context, useResource: load => {loader = load; return resource;}};
  function compile(file, overrides) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const code = transformSync(source, {filename: file, jsc: {parser: {syntax: 'typescript', tsx: true}, transform: {react: {runtime: 'automatic'}}, target: 'es2022'}, module: {type: 'commonjs', noInterop: true}}).code;
    const exports = {};
    vm.runInNewContext(code, {exports, require: name => name in overrides ? overrides[name] : require(name), window: {location: {pathname: '/profile', search: '?tab=account'}}});
    return exports;
  }
  const link = {default: ({href, children, ...props}) => React.createElement('a', {...props, href}, children)};
  const ui = compile('../src/components/application/ui.tsx', {'next/link': link, './provider': provider, '@/lib/story-html.js': {sanitizeStoryHtml: () => ''}});
  const {ProfilePage} = compile('../src/components/application/profile.tsx', {'next/link': link, 'next/navigation': {useRouter: () => ({replace() {}})}, './provider': provider, './ui': ui});
  return {requests, resource, ui, render: () => renderToStaticMarkup(React.createElement(ProfilePage)), load: () => loader()};
}

test('profile waits for stored session restoration before requesting private data', async () => {
  const h = setup({ready: false, session: null, sessionExpired: false});
  assert.match(h.render(), /Restoring your session/);
  assert.equal(await h.load(), null);
  assert.equal(h.requests.length, 0);
});

test('guest profile offers sign-in without making unauthorized account requests', async () => {
  const h = setup({ready: true, session: null, sessionExpired: false});
  assert.match(h.render(), /Sign in to continue/);
  assert.equal(await h.load(), null);
  assert.equal(h.requests.length, 0);
});

test('expired profile sessions show sign-in recovery and preserve the profile URL', () => {
  const h = setup({ready: true, session: null, sessionExpired: true});
  const html = h.render();
  assert.match(html, /Your session has expired/);
  assert.match(html, /Sign in again/);
  assert.match(html, /next=%2Fprofile%3Ftab%3Daccount/);
  assert.doesNotMatch(html, /Try again/);
});

test('a restored authenticated profile still loads the dashboard', async () => {
  const h = setup({ready: true, session: {user: {id: 'reader'}}, sessionExpired: false});
  h.render();
  h.resource.data = await h.load();
  assert.ok(h.requests.includes('/users/me'));
  assert.match(h.render(), /profile-dashboard/);
});

test('an unauthorized resource offers sign-in instead of an endless retry button', () => {
  const h = setup({ready: true, session: null, sessionExpired: true});
  const html = renderToStaticMarkup(React.createElement(h.ui.LoadState, {resource: {...h.resource, error: 'Authentication is required', errorStatus: 401}}, 'Private content'));
  assert.match(html, /Sign in again/);
  assert.doesNotMatch(html, /Try again|Private content/);
});

test('service failures show a friendly explanation without database details', () => {
  const h=setup({ready:true,session:null});
  const html=renderToStaticMarkup(React.createElement(h.ui.LoadState,{resource:{loading:false,error:'Database error: relation private.users does not exist',errorStatus:500,reload(){}}},'Content'));
  assert.match(html,/Something went wrong on our side/);
  assert.match(html,/try again in a moment/);
  assert.doesNotMatch(html,/Database error|private.users|relation /);
  assert.match(html,/Try again/);
});

test('missing content offers discovery rather than a futile retry', () => {
  const h=setup({ready:true,session:null});
  const html=renderToStaticMarkup(React.createElement(h.ui.LoadState,{resource:{loading:false,error:'Request failed (404)',errorStatus:404,reload(){}}},'Content'));
  assert.match(html,/could not find this content/);
  assert.match(html,/Back to discovery/);
  assert.doesNotMatch(html,/Try again/);
});

test('friendly failures distinguish connection problems and preserve useful validation', () => {
  const {ui}=setup({ready:true,session:null});
  assert.match(ui.friendlyFailure(new TypeError('Failed to fetch')).message,/Check your internet connection/);
  assert.equal(ui.friendlyFailure(new Error('Passwords do not match.')).message,'Passwords do not match.');
  assert.equal(ui.friendlyFailure({message:'Access denied',status:403}).retry,false);
  assert.match(ui.friendlyFailure({message:'Too many requests',status:429}).message,/Wait a little/);
});
