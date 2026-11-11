---
title: 7 条门禁全绿，10 处违规照旧
description: 上一轮修完可用性之后，我请了一个独立评审看这套代码。结论比预想的难看：契约形同虚设、端口是装饰、BYOK 每次调用都在漏连接池。这一轮 12 个 PR 只做一件事——先修会出事的，再修不好看的。
pubDate: 2026-11-11
tags: ['架构', '工程', '复盘']
---

上一轮结束时，我挺满意：worker 不再单并发阻塞，任务崩溃能重投递，清洗和评估分了队列，CI 有三道门禁，`lint-imports` 输出 `Contracts: 7 kept, 0 broken`。

然后我请了一个独立评审，让它只读代码、别信文档。它回来第一句话是：

> 7 条契约没有拦住任何东西。我在副本里注入了 6 种真实回退，全部 KEPT。

## 一、能跑，和正确，是两件事

先说已经被修掉的可用性问题，因为它决定了后面所有工作的优先级。

原来的 worker 是 `--concurrency=1`。一条 35 分钟的录音进来，ffmpeg 抽音轨、分片、调 ASR，全程占着唯一的工作进程——期间所有人的评估、提取、报告都在排队。更糟的是 worker 崩了任务就永远停在 `running`，只能人工重试。

改法很朴素：并发调到 2（云服务器只有 2 核，不敢再高），`clean` 单独一个队列，只有清洗任务开 `acks_late`，worker 被杀时退回队列，`visibility_timeout` 设到 3600 秒（必须大于任务硬超时 1800，否则长任务会被重复投递）。

有一处必须自己兜底：`acks_late` 意味着「执行完了、还没 ack 就崩」会被重投递。所以任务开头加了一句判断——已 `completed` 就直接返回既有结果，标记 `redelivered: true`。这条路径后来在线上真的跑到了：

```text
clean -> {'cleaned_records': 14, 'status': 'completed', 'redelivered': True}
```

## 二、门禁全绿，违规照旧

评审做的事很简单：把声明的分层结构写成 `layers` 契约，跑一遍。

```
app.application → app.services   (executors.py:27,33,39,45,51)
app.core        → app.models     (ownership.py:14, cost_tracker.py:25)
app.core        → app.schemas    (pagination.py:18)
app.agents      → app.services   (extraction_agent.py:29)
```

4 组 10 条边，全是违规。而现有的 7 条契约一条都没报——因为它们大多是 `forbidden` 加一份**手写的模块清单**。清单之外的新文件，天然豁免。

最讽刺的是其中一条契约叫 `application-helpers-are-pure`，意思是「application 不依赖实现层」。唯一违反它的文件是 `executors.py`，而它恰好不在 `source_modules` 里。

这就是「用目录表达架构」和「用机制约束架构」的区别。目录只是建议，机制才是约束。

改法是把三条弱契约换成一条 `layers`，把现存欠账**逐条写进 `ignore_imports`**：

```ini
type = layers
layers = api → tasks → services → application → agents → repositories → ports → models → schemas → core
ignore_imports =
    app.core.pagination -> app.schemas.base
    app.core.cost_tracker -> app.models
    app.core.ownership -> app.models
```

`ignore_imports` 是债务清单，不是豁免：修掉一条删一行，新增越界立刻失败。我验证过——在 `application/` 里放一个 `import app.services` 的探针文件，契约立刻 BROKEN。

## 三、真 bug：每次 BYOK 调用漏一个连接池

评审里最值钱的发现不是结构问题，是一个资源泄漏。

```python
# agents/base.py（改前）
self.llm = llm or LLMClient(model=..., timeout=...)      # 每个 agent 实例新建
agent_llm = LLMClient(api_key=byok_key)                  # BYOK 每次调用新建
```

`httpx.AsyncClient` 在第一次请求时懒创建，然后**从不关闭**。全仓库 `aclose()` 的调用点只有 `LLMClient.__aexit__` 内部一处，而 agent 从来不走上下文管理器。

清洗任务是长驻 worker，一条数据源几十上百条对话，每条对话一个 agent 实例——就是上百个未关闭的连接池，文件描述符只增不减。

修法两条：服务端 Key 场景改成进程级共享（按 `model + timeout` 复用），BYOK 临时客户端在 `finally` 里关掉。

```python
finally:
    if byok_key is not None and agent_llm is not self.llm:
        await agent_llm.aclose()
```

顺手补了一个测试：注入一个会计数的 fake 客户端，断言共享的那个不关、BYOK 的那个必须关。

## 四、假端口比没有端口更糟

上一轮我加了 `StoragePort`，看起来很架构。评审的实测是：

```text
$ mypy  # 把模块赋给 StoragePort
error: Incompatible types in assignment (expression has type Module, variable has type "StoragePort")
note: Expected: def save_bytes(self, content: bytes, ...)
      Got:      def save_bytes(content: bytes, ...)
```

三个问题叠在一起：生产代码 0 调用（上传、转写都直连实现）、静态上根本不可满足（模块函数 vs 带 `self` 的方法）、注释里写的「模块对象本身即满足协议」是假的。它能「工作」纯粹因为没人真把它当端口用。

还有一个更隐蔽的坑：`runtime_checkable` 的 `isinstance` **只校验方法名存在，不校验签名**。我写过一个测试注释说「签名漂移会立刻失败」——那句话是错的。签名一致性只有 mypy 能给，`isinstance` 给不了。

所以这一轮删掉了 `StoragePort`，并在 `ports/__init__.py` 里写清楚「刻意不做的端口 + 为什么」。留着一个死端口，会让整个 ports 层看起来像装饰。

## 五、重构顺序：从最有替换需求的开始

真正的端口只留三个，每个都对应一个具体的替换场景：

| 端口 | 为什么需要 |
| --- | --- |
| `LLMPort` | BYOK 每用户不同 Key → 不同实例；单测注入 fake |
| `TranscriberPort` | whisper 与千问协议差异大；返回类型化的 `Transcript` |
| `CredentialPort` | 解密 + 审计是基础设施细节，agents 不该知道 |

有了端口，`agents` 不再 `import credential_service`（原来靠函数内延迟 import 掩盖）；`media_pipeline` 不再 `import media_service`，改成构造参数注入，单测从 monkeypatch 具体模块变成注入 fake。

接着是仓储。原来 SQL 散在 5 个 service 里，现在收敛到 `repositories/`：`cleaned_data`、`knowledge_base`、`analysis_results`、`raw_data`，加一个分页执行。原则是**只搬 SQL，不搬规则**——去重策略还在 `knowledge_dedup`，冷启动状态机还在 `knowledge_status`，归属校验还在 service。

然后是组合根。`executors`（任务类型 → 执行器）和 `enqueue`（唯一调用 `.delay()` 的地方）搬进 `app/composition/`，因为它天生知道所有实现，不属于任何一层。搬完之后，`services` 里 `from app.tasks` 归零，5 对循环 import 消失，`app.tasks` 变成纯叶子。

最后两件小事：分页三分（HTTP 参数 / 中立参数 / 持久化执行），让 `core` 不再依赖 FastAPI；转写结果从 `dict[str, Any]` 改成 `Transcript` dataclass，把「记住 4 个魔法 key」换成属性访问。

## 六、部署踩的三个坑

这一轮部署比写代码难。

**一、云端 `docker build` 根本跑不完。** 日志停在 `Downloading torch (539.1 MB)`，速度 19 kB/s——理论上要 8 小时。原因是 Dockerfile 默认走 `pypi.org`。把默认源换成腾讯云镜像后，同一台机器几分钟装完。

**二、`docker commit` 会吞掉 entrypoint。** 为了绕开慢速构建，我用「起临时容器覆盖代码 + commit」的方式出镜像。容器是用 `--entrypoint sleep` 起的，commit 之后镜像的 ENTRYPOINT 就变成了 `sleep`，api 容器反复重启并报 `sleep: unrecognized option '--host'`，站点 502 了两分钟。修法是 commit 时显式改回来：

```bash
docker commit \
  --change 'ENTRYPOINT ["./scripts/docker-entrypoint.sh"]' \
  --change 'CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--workers","2"]' \
  p0patch aiinsight-prod-api:latest
```

**三、api 容器重建后必须重启 nginx。** nginx 启动时缓存了上游 `api` 的 IP，重建后不重启就是 502。VM 上第一次部署就遇到了。

三个坑都写进了部署手册，附命令原文。踩过一次的坑，不该踩第二次。

## 七、CI：文档 PR 从 7 分钟到 10 秒

这轮还顺手修了一件很蠢的事：只改了一张 SVG 的 PR，也要跑 5 分半的后端测试。

原因很直接：`test.yml` 的 `pull_request` 触发没有任何范围判断。而这里有个陷阱——**不能**直接在 workflow 上写 `paths-ignore`：

```yaml
on:
  pull_request:
    paths-ignore: ['docs/**']   # 不要这样做
```

这样文档 PR 里 required check 根本不会产生，GitHub 显示 `Expected — Waiting for status to be reported`，PR 永远合不了。**「不跑」和「跑了但跳过」是两回事。**

正确做法是加一个 `changes` job 判断范围，重活按 `if` 跳过——检查记录仍然存在，skipped 视为通过：

```yaml
backend:
  needs: changes
  if: needs.changes.outputs.backend == 'true'
```

我用一个纯文档 PR 实测过：两个测试 job 都是 `skipping`，`mergeStateStatus: CLEAN`，合并正常。现在文档 PR 只跑 5 秒。

## 八、数字，和没做的事

| 指标 | 之前 | 现在 |
| --- | --- | --- |
| 分层契约 | 7 条（形同虚设） | 5 条（真的能拦） |
| 契约欠账 | 10 条未登记 | 3 条显式登记 |
| `services → api` 倒置 | 13 处 | 0 |
| `services ↔ tasks` 循环 | 5 对 | 0 |
| `agents → services` | 3 处 | 0 |
| LLM 连接池 | 每次调用新建且不关闭 | 进程级复用 + BYOK 关闭 |

12 个 PR，137 个源文件，645 条测试全绿，云端和 VM 都已上线验证。

**没做的事也写在这里**：还剩 3 条欠账，全在 `core`（分页常量、成本记账、归属校验），本质是 `core` 承担了部分业务职责，清理收益递减；前端 `features/` 目录重构暂缓，因为 8 个页面、命名已对齐，现在迁移只会制造两套规范；ASR 的协议策略模式还没做，因为要动线上唯一在跑的转写链路，得单独排期 + 真实转写验证。

## 最后

这轮最大的收获不是那些端口和仓储，而是一个判断标准：

**能跑，不代表正确；门禁绿，不代表结构对。**

一个系统真正的架构，不是文档里画的那张图，而是**你想违反它时，会不会被拦住**。写进 `ignore_imports` 的每一行欠账，都比写在 Markdown 里的漂亮分层图诚实。
