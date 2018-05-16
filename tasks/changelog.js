#!/usr/bin/env node

const shell = require('shelljs');
const inquirer = require('inquirer');
const { readJsonSync, writeJsonSync } = require('fs-extra');

const { join } = require('path');
const { fork } = require('child_process');

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
  shell.exit(0);
}

const { code: testCode } = shell.exec('npm run test');
if (testCode !== 0) {
  console.error('Failed: npm run test');
  shell.exit(1);
}

function lockVersion() {
  console.log('正在执行版本锁死');
  updatedRepos.forEach(repo => {
    const isAlipay = repo.indexOf('@alipay/') === 0;
    const dir = isAlipay ? repo.replace('@alipay/', '') : repo;
    // 默认把目录名和包名认为是一致的
    const pkgPath = join(cwd, 'packages', dir, 'package.json');
    const pkg = readJsonSync(pkgPath);
    const { dependencies, devDependencies } = pkg;
    if (dependencies && Object.keys(dependencies).length) {
      const lockedDependencies = Object.keys(dependencies).reduce(
        (prev, pkgName) => {
          if (updatedRepos.indexOf(pkgName) >= 0) {
            const lockVersionString = dependencies[pkgName].replace('^', '');
            return Object.assign(prev, {
              [pkgName]: lockVersionString,
            });
          }

          return Object.assign(prev, {
            [pkgName]: dependencies[pkgName],
          });
        },
        {}
      );
      pkg.dependencies = lockedDependencies;
    }

    if (devDependencies && Object.keys(devDependencies).length) {
      const lockedDevDependencies = Object.keys(devDependencies).reduce(
        (prev, pkgName) => {
          if (updatedRepos.indexOf(pkgName) >= 0) {
            const lockVersionString = devDependencies[pkgName].replace('^', '');
            return Object.assign(prev, {
              [pkgName]: lockVersionString,
            });
          }

          return Object.assign(prev, {
            [pkgName]: devDependencies[pkgName],
          });
        },
        {}
      );
      pkg.devDependencies = lockedDevDependencies;
    }
    writeJsonSync(pkgPath, pkg, { spaces: 2 });
  });
  console.log('版本锁死完毕');
}

inquirer
  .prompt({
    type: 'list',
    name: 'tag',
    message: '请选择发布版本的 tag 类型',
    choices: ['production', 'beta'],
  })
  .then(tag => {
    let argv = [
      'publish',
      '--conventional-commits',
      '--skip-git',
      '--skip-npm',
    ];
    if (tag.tag === 'beta') {
      argv = argv.concat(
        '--npm-tag=beta',
        '--cd-version=prerelease',
        '--preid=beta'
      );
    }
    const cp = fork(
      join(process.cwd(), 'node_modules/.bin/lerna'),
      argv.concat(process.argv.slice(2)),
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    cp.on('error', err => {
      console.log(err);
    });
    cp.on('close', code => {
      if (code !== 0) {
        console.log(`Failed: lerna publish ${argv.join(' ')}`);
        shell.exit(1);
      }
      lockVersion();
      console.log('Changelog 生成完毕!');
      console.log(
        '如有需要请订正 changelog 后，执行 npm run publish 进行版本发布'
      );
      console.log('Tips: 发布完毕后，请给当前分支打好 tag(即对应的版本号)');
    });
  });
