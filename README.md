# lerna-example
introduce lerna workfow, Ref https://github.com/pigcan/blog/issues/16

### 仓库结构说明

`packages` 目录下存放的是所有的子仓库
`tasks` 目录下存放一些全局的任务脚本，当前有用的是 `publish.js` 和 `changelog.js`

- `changelog.js`，当有发布任务时，请事先执行 npm run changelog，此举意为生成本次版本发布的 changelog，执行脚本时会提醒，本次发布是正式版还是 beta，会予以生成不同版本信息供予发布
- `publish.js`，当 changelog 生成并调整相关内容完毕后，执行 `npm run publish`，会对如上所有的子 packages 进行版本发布，执行脚本时会提醒，本次发布是正式版还是 beta，会予以不同 npm dist-tag 进行发布


### 日常开发流程

在常规开发中，我们的操作方式会变更为如下：

> 第一步：使用 commitizen 替代 git commit

即当我们需要 commit 时，请使用如下命令

```bash
$ npm run ct
```
如果你在全局安装过 `commitizen` 那么，直接在项目目录下执行

```bash
$ git ct
```

执行时，会有引导式的方式让你书写 commit 的 message 信息

如果你是 sourceTree 用户，其实也不用担心，你完全可以可视化操作完后，再在命令行里面执行 `npm run ct` 命令，这一部分确实破坏了整体的体验，当前并没有找到更好的方式来解决。

关于为什么需要 commitizen，可以参考 [这篇文章](https://github.com/pigcan/blog/issues/15)

当前我们遵循的是 angular 的 commit 规范。

具体格式为:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

`type`: 本次 commit 的类型，诸如 bugfix docs style 等
`scope`: 本次 commit 波及的范围
`subject`: 简明扼要的阐述下本次 commit 的主旨，在原文中特意强调了几点 1. 使用祈使句，是不是很熟悉又陌生的一个词，来传送门在此 [祈使句](https://baike.baidu.com/item/%E7%A5%88%E4%BD%BF%E5%8F%A5/19650285) 2. 首字母不要大写 3. 结尾`无需`添加标点
`body`: 同样使用祈使句，在主体内容中我们需要把本次 commit 详细的描述一下，比如此次变更的动机，如需换行，则使用 `|`
`footer`: 描述下与之关联的 issue 或 break change，详见[案例](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#heading=h.gbbngquhe0qa)


> 第二步：格式化代码

这一步，并不需要人为干预，因为 `precommit` 中的 `lint-staged` 会自动化格式，以保证代码风格尽量一致

> 第三步：commit message 校验

这一步，同样也不需要人为介入，因为 `commitmsg` 中的 `commitlint` 会自动校验 msg 的规范

> 第四步：当有发布需求时，先生成 changelog

使用
```bash
$ npm run changelog
```

在这一步中我们借助了 `commitizen` 标准化的 commit-msg 以及 `lerna` 中 `publish` 的 `--conventional-commits` 来自动化生成了版本号以及 changelog，但过程中我们忽略了  git tag  以及 npm publish （ `--skip-git --skip-npm`），原因是我们需要一个时机去修改自动化生成的  changelog。


> 第五步：再发布

由于第四步中，我们并没有实质意义上做版本发布，而是借以 lerna 的 publish 功能，生成了 changelog，所以后续的 publish 操作被实现在了自定义脚本中，即 publish.js 中。

```bash
$ npm run publish
```
