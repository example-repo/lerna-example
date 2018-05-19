#!/usr/bin/env node

const shell = require('shelljs');
const inquirer = require('inquirer');
const { readJsonSync } = require('fs-extra');

const { join } = require('path');

console.log('请确保已经执行 npm run changelog');

const cwd = process.cwd();

if (
  shell
    .exec('npm config get registry')
    .stdout.indexOf('https://registry.npmjs.org/') === -1
) {
  console.error('Failed: set registry to https://registry.npmjs.org/ first');
  shell.exit(1);
}
if (shell.exec('which cnpm').stdout.indexOf('not found') > -1) {
  console.log('Failed: install cnpm first');
  shell.exit(1);
}
if (shell.exec('which tnpm').stdout.indexOf('not found') > -1) {
  console.log('Failed: install tnpm first');
  shell.exit(1);
}

const ret = shell.exec('./node_modules/.bin/lerna updated').stdout;
const updatedRepos = ret
  .split('\n')
  .map(line => line.replace('- ', ''))
  .filter(line => line !== '');

if (updatedRepos.length === 0) {
  console.log('没有更新的模块');
  shell.exit(1);
}

function gitTag() {
  const lernaPkg = readJsonSync(join(cwd, 'lerna.json'));
  const { version } = lernaPkg;

  shell.exec(`git tag ${version} -m "${version}"`);
}

function gitAdd() {
  shell.exec('git add .');
}

function gitCommit() {
  const lernaPkg = readJsonSync(join(cwd, 'lerna.json'));
  const { version } = lernaPkg;
  shell.exec(`git commit -m "${version}"`);
}

function publishToNpm(tag) {
  updatedRepos.forEach(repo => {
    const isAlipay = repo.indexOf('@alipay/') === 0;
    const dir = isAlipay ? repo.replace('@alipay/', '') : repo;
    // 默认把目录名和包名认为是一致的
    const { code: cdCode } = shell.cd(join(cwd, 'packages', dir));
    if (cdCode !== 0) {
      console.log(`Error: ${join(cwd, 'packages', dir)} is not existed`);
      shell.exit(1);
    }
    const npm = isAlipay ? 'tnpm' : 'npm';
    if (tag === 'beta') {
      console.log(`[${repo}] ${npm} publish --tag beta`);
      const { code: betaCode } = shell.exec(`${npm} publish --tag beta`);
      if (betaCode !== 0) {
        console.log(`Error: ${dir} publish beta failed`);
        shell.exit(1);
      }
    } else {
      console.log(`[${repo}] ${npm} publish`);
      const { code: productionCode } = shell.exec(`${npm} publish`);
      if (productionCode !== 0) {
        console.log(`Error: ${dir} publish latest failed`);
        shell.exit(1);
      }
    }

    if (!isAlipay) {
      shell.exec(`cnpm sync ${repo}`);
      shell.exec(`tnpm sync ${repo}`);
    }
  });
}

const { code: testCode } = shell.exec('npm run test');
if (testCode !== 0) {
  console.error('Failed: npm run test');
  shell.exit(1);
}

inquirer
  .prompt({
    type: 'list',
    name: 'tag',
    message: '请选择发布版本的 tag 类型',
    choices: ['production', 'beta'],
  })
  .then(tag => {
    publishToNpm(tag.tag);
    gitAdd();
    gitCommit();
    gitTag();
  });
