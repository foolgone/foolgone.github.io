---
title: 把「看起来对」改成「算得对」
description: 洞察永远为空、成本只记一行、重试不执行、取消不生效——一次数据一致性修复的复盘。
pubDate: 2026-11-06
tags: ['工程', 'AI', '复盘']
---

演示最怕的不是报错，而是每个页面都有数字，但数字是错的。

这次给 AI Insight Hub 做上线前的代码复核，一口气挖出五个 P0：报告里的洞察永远是空的、成本表每个任务只记一行、点重试任务不会执行、点取消 worker 继续跑、报告生成不在任务列表里。它们都不影响页面打开，所以很容易被「看起来正常」掩盖。

这篇记录一下怎么修的，以及修完之后 E2E 又暴露出的那个更隐蔽的竞态。

## 一、报告里的洞察，为什么永远是空的

链路是这样的：洞察任务执行成功后，把结果写进 `tasks.result`；但报告生成时，读的是 `analysis_results` 表里 `analysis_type='insight'` 的记录。

两条路，永远不相交。

所以无论洞察跑多少次，报告里的「洞察」章节都是空的，报告 Agent 只能标一个 `insight_degraded`。修复本身不复杂：洞察成功后同时写一行 `analysis_results`，因为洞察是「数据源级」结果，没有单条对话，`data_id` 允许为空。

麻烦的是数据模型：`analysis_results.data_id` 原本是 `NOT NULL`。于是加了一次迁移（012），把它改成可空，并补了 `(datasource_id, analysis_type, created_at DESC)` 复合索引——报告只取最新一条。

> 一个数据只允许有一个真相源。同一个「洞察」，写在一个地方、读在另一个地方，迟早出事。

## 二、成本表为什么只记一行

成本追踪的幂等键是 `{task_id}:{attempt}`。`attempt` 来自重试框架，而每次 Agent 调用都从 0 开始。

结果就是：一个清洗任务处理 3 个文件，3 次调用互相覆盖，最后只剩 1 行；评估 100 条对话，也只剩 1 行。成本统计不是少算一点，是少算 99%。

修法是把「同一任务内的第几次业务调用」显式编码进幂等键：

```text
{task_id}:clean:{raw_data_id}:{attempt}
{task_id}:eval:{cleaned_data_id}:{attempt}
{task_id}:extract:{attempt}
{task_id}:insight:{attempt}
{task_id}:report:{report_id}:{attempt}
```

`attempt` 只能描述「同一次调用重试了几次」，描述不了「这是第几次调用」。这两件事必须分开。

## 三、重试和取消，都不只是改一个状态

`retry` 原来只把数据库里的 `status` 改回 `pending`，没有重新投递 Celery；`cancel` 只把状态改成 `cancelled`，既没有 `revoke`，worker 运行中也不再检查。

于是「重试」变成永久 pending，「取消」变成等它跑完再把状态覆盖成 `completed`。

修复分两层：

- 入口层：重试按 `task_type` 分派到对应的 `enqueue_*`，并回写新的 `celery_task_id`；取消调用 `revoke(terminate=False)`，不强行杀进程。
- 执行层：清洗、评估在逐条循环里检查一次数据库状态；洞察、知识提取、报告这类单次长调用，在 Agent 返回后、写状态前再查一次。

最后一点是 E2E 才暴露的：如果取消恰好发生在「最后一条处理完、收尾写状态前」，worker 内存里的 `status` 还是 `running`，会把 `cancelled` 覆盖掉。解决方法是收尾前再查一次库并 `refresh`。

> 取消不是一次 UPDATE，而是两个进程之间的协作。

## 四、顺手修掉的七件小事

P0 之外还有一批「不致命但会咬人」的问题，一并处理了：

- 大文件入库截断到 20 万字符，清洗时没有按注释去对象存储读全文；
- 限流按 `request.client.host` 计数，Nginx 反代后所有用户共用一个桶；
- 知识提取先删种子 FAQ 再插入，LLM 返回空时知识库被清空；
- demo 账号可以改密；
- 清洗写入没有唯一约束，重跑会重复插入；
- 时间戳解析失败时用「当前时间」兜底，污染趋势；
- Prompt 版本恒为 `v1.0.0`，无法回答「这个分数是哪版 Prompt 跑的」。

其中「时间戳兜底」和「重复插入」都动到了表结构，和洞察落库合并进同一个迁移：`timestamp` 改为可空，`(raw_data_id, dialogue_id)` 加唯一索引，写入改用 `ON CONFLICT DO NOTHING`。

## 五、验证

修完不是看代码，是看数字：

- 352 条单元测试通过，集成用例在 VM 的真实 PostgreSQL 上全量通过；
- 浏览器 E2E 跑完整链路：上传 → 清洗（4 条，其中 1 条 NULL 时间戳）→ 评估（4 条，3 条需复核）→ 知识提取（4 条 FAQ）→ 洞察 → 综合报告；
- 报告正文出现「洞察数据已包含在报告中」，`insight_degraded=false`；
- 成本表里 `clean:<raw>`、`eval:<item>`、`extract`、`insight`、`report:<report_id>` 各自成行。

部署的时候还踩了三个环境坑：Windows 的 `git archive` 把入口脚本打成 CRLF、重建镜像时未锁版本的 kombu 要求 redis-py 6.1、api 重建后 nginx 仍缓存旧 upstream IP。这些和业务无关，但每一个都能让「部署成功」变成假象。

## 最后

这次最大的收获不是修了五个 bug，而是确认了一件事：**AI 产品的可信度，取决于那些不显眼的管道**。模型答得好不好，用户能感觉到；成本少算 99%、洞察永远为空、取消不生效，用户感觉不到，但决策会因此错。

先把数字修对，再谈效果。
