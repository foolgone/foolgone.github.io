---
title: 模型下载不了，就把模型装进镜像
description: embedding 离线化：预下载、离线加载、历史回填，以及 2G 内存的账。
pubDate: 2026-11-06
tags: ['embedding', '部署', '工程']
---

E2E 跑到知识提取那一步，任务显示「已完成」，4 条 FAQ 也都入库了。但日志里躺着四行 warning：

```text
embedding failed for 退货政策是什么？: We couldn't connect to 'https://huggingface.co' ...
embedding failed for 订单什么时候发货？: ...
```

数据库里，这 4 条 FAQ 的 `embedding` 全是 NULL。

页面看起来一切正常，因为知识检索有兜底：向量不可用时自动退化成纯 `pg_trgm` 文本匹配。功能没挂，只是变笨了——而这种「静默降级」比报错更难发现。

## 问题不在模型，在网络

系统的 embedding 用的是 `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`，384 维，和数据库里的 `Vector(384)` 对齐。代码是懒加载：

```python
if settings.EMBEDDING_CACHE_DIR:
    kwargs["cache_folder"] = settings.EMBEDDING_CACHE_DIR
_model = SentenceTransformer(settings.EMBEDDING_MODEL, **kwargs)
```

但镜像里没有模型文件，`EMBEDDING_CACHE_DIR` 也没配。第一次调用时它去 HuggingFace 下载，容器又访问不到，于是失败。

更糟的是失败没有被缓存：`_model` 仍是 None，下一条 FAQ 会再试一次。4 条 FAQ 就是 4 次无谓的联网等待。

## 离线化到底做了什么

目标很朴素：**模型像依赖一样，构建时准备好，运行时不再联网。**

Dockerfile 里加了一步预下载：

```dockerfile
ARG HF_ENDPOINT=https://hf-mirror.com
ARG EMBEDDING_PRELOAD=true
ENV EMBEDDING_CACHE_DIR=/app/.models
RUN if [ "$EMBEDDING_PRELOAD" = "true" ]; then \
      HF_ENDPOINT="${HF_ENDPOINT}" python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', \
                   cache_folder='/app/.models')"; \
    fi
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
```

模型约 458MB。运行时显式禁止联网，确保「从磁盘加载」而不是「先等超时再失败」。

代码侧补了三件事：

1. **失败缓存**：加载失败后不再逐条重试，直接抛同一个错误；
2. **自动探测**：`EMBEDDING_CACHE_DIR` 为空时，如果 `/app/.models` 存在就用它（服务器 `.env` 里留空也不会踩坑）；
3. **健康状态**：`/health` 返回 `embedding.ready / loaded / cache_dir / offline`，不触发模型加载。

健康检查现在长这样：

```json
"embedding": {
  "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  "cache_dir": "/app/.models",
  "offline": true,
  "ready": true,
  "loaded": true
}
```

## 历史数据要回填

离线化只保证「以后能生成向量」，已经入库的 FAQ 还是 NULL。写了一个脚本：

```bash
python scripts/reembed_knowledge.py          # 只补 NULL
python scripts/reembed_knowledge.py --force  # 全量重算
```

VM 上回填 8 条，云上回填 4 条，之后 `embedding IS NULL` 都是 0。

验证方式不是看脚本退出码，而是直接搜：

- 「怎么退钱」→ 退货政策是什么（0.352）
- 「发票怎么弄」→ 发票怎么开（0.655）

这两个 query 和 FAQ 的字面重叠都不高，能排到前面，说明向量确实在参与打分。

## 云端是另一道题

云服务器是 2G 内存的精简部署，镜像只有 720MB——里面根本没有 `sentence-transformers` 和 `torch`。

补依赖时踩了两个坑：

- 默认 `pip install torch` 会拉 CUDA 版本，镜像直接膨胀；改成 `--index-url https://download.pytorch.org/whl/cpu` 装 CPU 版；
- 装 `sentence-transformers` 时 pip 把 numpy 升到 2.x，和镜像里的 pandas 2.1.4 二进制不兼容，运行时报 `numpy.dtype size changed`。固定 `numpy==1.26.3` 后解决。

最终云上镜像 4.15GB（VM 上是 12.2GB，因为用了 CUDA 版 torch），模型 458MB。

内存账也要算：API 加载模型后约 722MB，整机已用 1.18GB；worker 首次提取时还会加载一份。2G 内存加 4G swap 能跑，但已经接近上限。如果并发再高，下一步应该是把 embedding 拆成独立服务，让 api 和 worker 共用一份模型。

## 一点总结

- **模型也是依赖**，应该和 requirements 一样锁版本、进镜像，而不是运行时现下载；
- **降级必须可见**：知识检索退化成文本匹配没有报错，如果不是 E2E 看了 warning，这个问题会一直存在；
- **离线化不是「关掉网络」**，而是把「构建期」和「运行期」的职责分清楚：构建期可以慢、可以联网；运行期必须确定。

现在再跑知识提取，日志里不会再出现那四行 warning 了。
