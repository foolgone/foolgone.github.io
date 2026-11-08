---
title: 把 Key 从服务器上拿下来
description: 音视频转写能跑了，但 ASR 的地址和 Key 还写在 .env 里。这一轮把它做成和模型 API Key 一样的用户级配置：一张通用凭据表、三个端点、一层 SSRF 守卫。
pubDate: 2026-11-08
tags: ['架构', '安全', '工程']
---

上一轮把音视频转写塞进了清洗链路，链路是通的：上传 → ffmpeg 拆声道 → 云 ASR → 成对对话 → 评估。但只要看一眼 `.env` 就知道，这个功能只有一个用户能用。

`ASR_BASE_URL`、`ASR_API_KEY`、`ASR_MODEL` 写在部署配置里，意味着：换一个服务商要改服务器文件并重启；多一个人用就要共用同一份额度；演示站没法让访客填自己的 Key——而这套系统的其他 AI 能力早就已经是 BYOK 了。

配置写在哪里，决定了它是谁的能力。

## 一、先决定：不新建表

直觉是加一张 `user_asr_credentials`。但现有的 `user_llm_credentials` 已经有 `provider`、`base_url`、`model`、`encrypted_api_key`、`key_hint`、`status`、`verified_at`——除了 `language`，ASR 需要的东西它全有。唯一的问题是唯一索引建在 `user_id` 上，一个用户只能有一条。

所以这轮改的是约束，不是表：

```text
迁移 013
  DROP INDEX uk_user_llm_credentials_user_id
  CREATE UNIQUE INDEX uk_user_llm_credentials_user_provider (user_id, provider)
  ADD COLUMN language varchar(10)
```

`provider='deepseek'` 是模型 Key，`provider='asr'` 是转写配置。代码层所有方法加一个 `provider` 参数，默认值 `deepseek`——原来十几处调用一行都不用改。

代价是表名从此名不副实。我没有改名：生产库上重命名一张带外键和索引的表，收益只是让名字好看一点。

## 二、保存前必须真调一次

模型 Key 是「验证并保存」：服务端拿 Key 真发一次 `max_tokens=1` 的请求，401、欠费、超时都不入库。ASR 照抄这个模式，但有个麻烦——校验时手里没有音频。

方案是现场生成一段 1 秒的 440Hz 低音量 WAV（纯 Python 的 `wave` 模块，不依赖 ffmpeg），发给 `/audio/transcriptions`。只看 HTTP 状态：2xx 通过，401/403 明确报「Key 无效」，其余把状态码和响应体前 200 字回给用户。

这里放弃了一个常见的偷懒做法：只校验 Key 格式。格式永远是对的，错的是额度和权限，而这两件事只有真调才知道。

## 三、让用户填地址，就得防 SSRF

模型 Key 那边，`base_url` 非空直接拒绝，因为只支持官方端点。ASR 不行：用户的服务可能在 OpenAI、Groq、SiliconFlow，也可能是自建。

一旦允许用户指定地址，服务器就变成了一个可以被指使的请求发起方。所以加了 `core/url_guard.py`：

- 只允许 `https`（自建内网用 `ASR_ALLOW_HTTP` 单独放开）；
- URL 里不能带账号密码，不能带 query 和 fragment；
- 域名解析后，**任一** IP 落在内网、回环、链路本地或保留段（含 CGNAT、`::1`、IPv4-mapped IPv6）就拒绝；
- 运维可以用 `ASR_ALLOWED_HOSTS` 白名单放行自建内网服务。

DNS 重绑定没法在纯 HTTP 客户端层彻底消掉，这一点写在文件头注释里，没有假装解决。

线上验证很直接：`PUT` 一个 `https://127.0.0.1/v1`，返回 400 `ASR_CREDENTIAL_INVALID`，且没有发生任何外发请求。

## 四、worker 按任务的归属用户取配置

转写在 Celery worker 里跑，那里没有请求上下文，只有 `task.user_id`。所以清洗的媒体分支多做一步：

```python
asr_config = await asr_service.resolve_for_user(session, task.user_id)
transcript = await media_service.transcribe_media(raw, asr_config, progress=_report)
```

`transcribe_media` 从此不再读 `settings.ASR_*`，地址、Key、模型、语言全部来自传进来的 `AsrConfig`。

没配置怎么办？让它失败，并且失败原因可读：`请先在「语音转写设置」中配置 ASR 服务`。这里刻意没有做「静默跳过」——一个任务显示成功但什么都没转写，比失败更难排查。

顺带修了一个从第一版就存在的拼写错误：`ASR_CHUNK_SECONDS` 里少了一个 N。它一直没暴露，是因为 `.env` 里从来没显式配过这个变量，全靠默认值。

## 五、前端：一个弹窗，两页

设置弹窗原来是「模型 API Key 设置」，现在多一个标签页「语音转写」。两个页面共用同一套加密存储、同一套审计、同一个 428 拦截器。

428 的处理值得说一下。上传音视频时如果没配转写，后端返回 `ASR_CREDENTIAL_NOT_CONFIGURED`；拦截器按错误码决定打开哪一页：

```js
if (code === 'LLM_CREDENTIAL_NOT_CONFIGURED') openCredentialModal('llm')
if (code === 'ASR_CREDENTIAL_NOT_CONFIGURED') openCredentialModal('asr')
```

错误码不只是给人看的，它应该能驱动 UI。

上传弹窗还多做了一层：选了音视频而转写没配时，直接禁用「上传」按钮，给一个「去配置语音转写」的入口——点了先关掉上传弹窗再打开设置，避免两层 Modal 叠在一起抢焦点。

## 六、验证与代价

云服务器和 VM 都跑了一遍：迁移到 `a3f7c2d91b84`，`ASR_ENABLED` 默认 `true`，`GET /users/me/asr-credential` 返回 `configured:false`，内网地址被 400 拦下，前端产物里能搜到新页面。

测试数：后端单测 375、集成 185，前端 70 个文件 334 条。

还没做的是真实双声道样本的端到端验收——现在这一步不再依赖我改服务器，只要有人在页面上填好自己的 Key。这也正是这轮改造的目的：把「能跑」从部署状态，变成用户状态。

## 七、这轮的两个判断

**配置属于用户，不属于部署。** 一个写死在 `.env` 里的 Key，等于把产品限制在「只有一个客户」的形态。判断标准很简单：这份配置换了人要不要变？要变，它就该在数据库里，而且该加密。

**校验要么真调，要么别叫校验。** 格式校验、连通性探测、真实调用，成本差三个数量级，但只有最后一个能回答「这个 Key 现在能不能用」。

还有一件小事：这轮最花时间的不是写代码，是发现上一次的部署脚本漏了「解压新代码」这一步——镜像构建成功、容器重启成功、健康检查通过，但跑的还是旧代码。最后是靠 `alembic current` 和 `/openapi.json` 里有没有新路径才确认的。**部署成功的标志不是命令返回 0，而是新行为真的生效。**
